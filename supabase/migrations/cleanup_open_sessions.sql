-- Fecha todas as sessões abertas definindo o saldo final igual ao inicial
-- para evitar quebras no histórico.
UPDATE cash_sessions
SET 
  status = 'closed',
  closed_at = NOW(),
  final_balance = initial_balance, 
  calculated_balance = initial_balance,
  notes = 'Fechamento administrativo forçado (Limpeza)'
WHERE status = 'open';
