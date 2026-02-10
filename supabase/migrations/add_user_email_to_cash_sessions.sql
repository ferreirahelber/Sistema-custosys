-- Adiciona coluna user_email para facilitar identificação no histórico
ALTER TABLE cash_sessions 
ADD COLUMN IF NOT EXISTS user_email TEXT;

-- Atualiza sessões existentes (opcional, tenta pegar do auth.users se possível, mas aqui deixaremos NULL ou genérico 'Sistema' se não tiver link fácil)
-- Como é difícil fazer update cross-schema (auth.users) em migration simples sem perms, deixamos null para passados.
