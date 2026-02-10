-- Migration: migration_inventory_fix.sql
-- Objetivo: Permitir estoque negativo para não travar vendas quando o estoque não foi alimentado corretamente.
-- Motivo: Erro 400 (Bad Request) ao tentar atualizar estoque para valor menor que 0.

DO $$
BEGIN
    -- Verifica se a constraint existe antes de tentar remover
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'check_ing_stock_positive' 
        AND table_name = 'ingredients'
    ) THEN
        ALTER TABLE ingredients DROP CONSTRAINT check_ing_stock_positive;
    END IF;
END $$;
