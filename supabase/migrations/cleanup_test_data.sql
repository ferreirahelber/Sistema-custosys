-- SCRIPT DE LIMPEZA DE DADOS DE TESTE (OPCIONAL)
-- Use este script se quiser "zerar" o caixa e as vendas para começar a usar de verdade.
-- ELE NÃO APAGA: Usuários, Ingredientes, Receitas, Produtos ou Configurações.
-- ELE APAGA: Histórico de Vendas, Sessões de Caixa, Movimentações de Estoque Antigas, Despesas.

BEGIN;

-- 1. Limpar Vendas e Itens de Venda
TRUNCATE TABLE public.sale_items CASCADE;
TRUNCATE TABLE public.sales CASCADE;

-- 2. Limpar Histórico de Caixa
TRUNCATE TABLE public.cash_sessions CASCADE;
TRUNCATE TABLE public.cash_transactions CASCADE;

-- 3. Limpar Despesas
TRUNCATE TABLE public.expenses CASCADE;

-- 4. Opcional: Limpar movimentações de estoque (se quiser zerar o estoque atual)
-- Se quiser MANTER o estoque atual, COMENTE a linha abaixo.
-- TRUNCATE TABLE public.stock_movements CASCADE; 

-- 5. Opcional: Resetar sequências (para os IDs voltarem ao inicio, se usar serial)
-- (Não necessário pois usamos UUIDs na maioria, mas mal não faz para seriais)

COMMIT;

-- Confirmação
SELECT 'Limpeza concluída com sucesso. Vendas e Caixa zerados.' as mensagem;
