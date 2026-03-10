-- CRIAÇÃO DA STORED PROCEDURE PARA VENDA ATÔMICA (COM SUPORTE A ESTOQUE HÍBRIDO)
-- Execute este script no SQL Editor do Supabase para atualizar a função existente

CREATE OR REPLACE FUNCTION process_sale(
  payload JSONB,
  items JSONB
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  new_order_id UUID;
  item JSONB;
  rec_item RECORD;
  qty_to_deduct NUMERIC;
  v_has_production_stock BOOLEAN;
BEGIN
  -- 1. Inserir Pedido
  INSERT INTO orders (
    session_id,
    customer_id,
    total_amount,
    discount,
    change_amount,
    payment_method,
    status,
    fee_amount,
    net_amount,
    user_email,
    user_id,
    created_at
  ) VALUES (
    (payload->>'session_id')::UUID,
    (payload->>'customer_id')::UUID,
    (payload->>'total_amount')::NUMERIC,
    (payload->>'discount')::NUMERIC,
    (payload->>'change_amount')::NUMERIC,
    payload->>'payment_method',
    'completed', -- Status fixo como completed
    (payload->>'fee_amount')::NUMERIC,
    (payload->>'net_amount')::NUMERIC,
    payload->>'user_email',
    (payload->>'user_id')::UUID,
    NOW()
  ) RETURNING id INTO new_order_id;

  -- 2. Loop nos Itens
  FOR item IN SELECT * FROM jsonb_array_elements(items)
  LOOP
    -- 2.1 Inserir Item do Pedido
    INSERT INTO order_items (
      order_id,
      product_id,
      product_name,
      quantity,
      unit_price,
      total_price,
      type
    ) VALUES (
      new_order_id,
      (item->>'product_id')::UUID,
      item->>'product_name',
      (item->>'quantity')::NUMERIC,
      (item->>'unit_price')::NUMERIC,
      (item->>'total_price')::NUMERIC,
      item->>'type'
    );

    -- 2.2 Baixa de Estoque - Revenda (Produto Direto)
    IF (item->>'type') = 'resale' THEN
      UPDATE products
      SET current_stock = current_stock - (item->>'quantity')::NUMERIC
      WHERE id = (item->>'product_id')::UUID;
    END IF;

    -- 2.3 Baixa de Estoque - Receita (Híbrido)
    IF (item->>'type') = 'recipe' THEN
      
      -- Verifica se a receita existe na prateleira (Mesmo que zero, o registro diz que ela é "Made to Stock")
      SELECT EXISTS (
          SELECT 1 FROM production_stock WHERE recipe_id = (item->>'product_id')::UUID
      ) INTO v_has_production_stock;

      IF v_has_production_stock THEN
          -- Modelo "Made to Stock": Desconta do Produto Acabado da Prateleira (Pode ficar negativo)
          UPDATE production_stock
          SET quantity = quantity - (item->>'quantity')::NUMERIC, updated_at = now()
          WHERE recipe_id = (item->>'product_id')::UUID;
      ELSE
          -- Modelo "Made to Order" (Legado): Desconta dos itens brutos que compõem a receita na hora
          FOR rec_item IN 
            SELECT ingredient_id, quantity_used as quantity
            FROM recipe_items 
            WHERE recipe_id = (item->>'product_id')::UUID
          LOOP
            IF rec_item.ingredient_id IS NOT NULL THEN
              -- NOTA: Como a matemática da RPC original utilizava a proporção multiplicada direta, mantemos a retrocompatibilidade.
              qty_to_deduct := rec_item.quantity * (item->>'quantity')::NUMERIC;
              
              UPDATE ingredients
              SET current_stock = current_stock - qty_to_deduct
              WHERE id = rec_item.ingredient_id;
            END IF;
          END LOOP;
      END IF;

    END IF;

  END LOOP;

  -- 3. Inserir Financeiro (Sales)
  INSERT INTO sales (
    user_id,
    description,
    amount,
    fee_amount,
    net_amount,
    category,
    payment_method,
    date,
    user_email,
    created_at
  ) VALUES (
    (payload->>'user_id')::UUID,
    'PDV #' || SUBSTRING(new_order_id::TEXT, 1, 8), -- Descrição automática
    (payload->>'total_amount')::NUMERIC,
    (payload->>'fee_amount')::NUMERIC,
    (payload->>'net_amount')::NUMERIC,
    'Venda PDV',
    payload->>'payment_method',
    CURRENT_DATE,
    payload->>'user_email',
    NOW()
  );

  -- 4. Inserir Despesa de Taxa (Se houver)
  IF (payload->>'fee_amount')::NUMERIC > 0 THEN
    INSERT INTO expenses (
      user_id,
      description,
      amount,
      category,
      date,
      user_email,
      created_at
    ) VALUES (
      (payload->>'user_id')::UUID,
      'Taxa Cartão - Pedido #' || SUBSTRING(new_order_id::TEXT, 1, 8),
      (payload->>'fee_amount')::NUMERIC,
      'Taxas Financeiras',
      NOW(), -- Data/Hora exata
      payload->>'user_email',
      NOW()
    );
  END IF;

  -- Retorna o ID do pedido
  RETURN jsonb_build_object('id', new_order_id);
END;
$$;
