-- Adiciona campos para controle de aprovação de quebra de caixa
ALTER TABLE cash_sessions 
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS verified_by TEXT; -- Email do admin que aprovou
