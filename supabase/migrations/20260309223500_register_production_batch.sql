-- Migration: Register Production Batch RPC (Atomic transaction with strict validation)
-- File: e:\sistema-custosys\supabase\migrations\20260309223500_register_production_batch.sql

CREATE OR REPLACE FUNCTION register_production_batch(
    p_recipe_id UUID,
    p_quantity_produced NUMERIC,
    p_original_yield NUMERIC,
    p_yield_unit TEXT
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_ratio NUMERIC;
    v_item RECORD;
    v_qty_needed NUMERIC;
    v_current_stock NUMERIC;
    v_item_name TEXT;
    v_missing_items JSONB := '[]'::JSONB;
BEGIN

    -- 1. Calcula a razão (ratio) de conversão: quanto foi produzido vs o rendimento original do cadastro
    IF p_original_yield <= 0 THEN
        RAISE EXCEPTION 'O rendimento original (yield_quantity) da receita deve ser maior que zero.';
    END IF;

    v_ratio := p_quantity_produced / p_original_yield;

    -- 2. Primeira Passagem: Validação de Estoque (Strict Lock)
    -- Lemos todos os itens pertencentes a essa receita para saber se há estoque de tudo.
    FOR v_item IN 
        SELECT id, ingredient_id, sub_recipe_id, item_type, quantity_used
        FROM recipe_items 
        WHERE recipe_id = p_recipe_id
    LOOP
        v_qty_needed := v_item.quantity_used * v_ratio;

        IF v_item.item_type = 'ingredient' AND v_item.ingredient_id IS NOT NULL THEN
            
            -- Busca o saldo do ingrediente (Matéria Prima)
            SELECT current_stock, name INTO v_current_stock, v_item_name
            FROM ingredients WHERE id = v_item.ingredient_id;
            
            IF v_current_stock IS NULL OR v_current_stock < v_qty_needed THEN
                -- Guarda item faltante na lista
                v_missing_items := v_missing_items || jsonb_build_object(
                    'name', v_item_name,
                    'needed', v_qty_needed,
                    'available', COALESCE(v_current_stock, 0)
                );
            END IF;

        ELSIF v_item.item_type = 'recipe' AND v_item.sub_recipe_id IS NOT NULL THEN
            
            -- Busca o saldo da Sub-receita produzida (Production Stock)
            SELECT ps.quantity, r.name INTO v_current_stock, v_item_name
            FROM production_stock ps
            JOIN recipes r ON r.id = ps.recipe_id
            WHERE ps.recipe_id = v_item.sub_recipe_id;

            IF v_current_stock IS NULL OR v_current_stock < v_qty_needed THEN
                -- Se PS for null, entende-se zero. Vamos buscar o nome apenas da receita base.
                IF v_current_stock IS NULL THEN
                  SELECT name INTO v_item_name FROM recipes WHERE id = v_item.sub_recipe_id;
                END IF;

                v_missing_items := v_missing_items || jsonb_build_object(
                    'name', v_item_name,
                    'needed', v_qty_needed,
                    'available', COALESCE(v_current_stock, 0)
                );
            END IF;
            
        END IF;

    END LOOP;

    -- 3. Se faltar algum item, aplica o ROLLBACK (Disparando exception estruturada)
    IF jsonb_array_length(v_missing_items) > 0 THEN
       RETURN jsonb_build_object('success', false, 'missing_items', v_missing_items);
    END IF;

    -- 4. Segunda Passagem: Efetivação das Baixas
    FOR v_item IN 
        SELECT id, ingredient_id, sub_recipe_id, item_type, quantity_used
        FROM recipe_items 
        WHERE recipe_id = p_recipe_id
    LOOP
        v_qty_needed := v_item.quantity_used * v_ratio;

        IF v_item.item_type = 'ingredient' AND v_item.ingredient_id IS NOT NULL THEN
            UPDATE ingredients
            SET current_stock = current_stock - v_qty_needed
            WHERE id = v_item.ingredient_id;

        ELSIF v_item.item_type = 'recipe' AND v_item.sub_recipe_id IS NOT NULL THEN
            UPDATE production_stock
            SET quantity = quantity - v_qty_needed, updated_at = now()
            WHERE recipe_id = v_item.sub_recipe_id;
        END IF;
    END LOOP;

    -- 5. Entrada no Estoque do Lote Produzido
    -- Fazemos um Upsert verificando se aquele recipe_id já existe na tabela de production_stock
    INSERT INTO production_stock (recipe_id, quantity, unit)
    VALUES (p_recipe_id, p_quantity_produced, COALESCE(p_yield_unit, 'un'))
    ON CONFLICT (recipe_id) 
    DO UPDATE SET 
        quantity = production_stock.quantity + EXCLUDED.quantity,
        updated_at = now();

    RETURN jsonb_build_object('success', true);
END;
$$;
