-- Migration: migration_add_user_email_to_finance.sql
-- Objetivo: Adicionar coluna para rastrear QUEM fez a venda/despesa (já que o user_id pode ser do admin)
-- Isso permite exibir "Responsável: joao@email.com" nas tabelas

DO $$
BEGIN
    -- 1. Tabela SALES
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales' AND column_name = 'user_email') THEN
        ALTER TABLE sales ADD COLUMN user_email text;
    END IF;

    -- 2. Tabela EXPENSES
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'user_email') THEN
        ALTER TABLE expenses ADD COLUMN user_email text;
    END IF;

    -- 3. Tabela ORDERS (PDV)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'user_email') THEN
        ALTER TABLE orders ADD COLUMN user_email text;
    END IF;

END $$;
