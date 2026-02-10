-- FIX: CORRIGIR ID NULO E SINCRONIZAR
-- O erro anterior ocorreu porque a coluna 'id' da tabela antiga não tinha "DEFAULT gen_random_uuid()".

-- 1. Garantir que a extensão pgcrypto está ativa (para gen_random_uuid)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Tentar Consertar a Tabela (Adicionar Default)
ALTER TABLE public.profiles 
ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- 3. Sincronizar Usuários (Agora gerando ID manualmente no insert para não depender do default)
INSERT INTO public.profiles (id, user_id, email, role, name)
SELECT 
    gen_random_uuid(), -- Força a geração do ID aqui
    id, 
    email, 
    'admin', -- Todo mundo vira admin para garantir acesso (mude depois na tela de Equipe)
    raw_user_meta_data->>'name'
FROM auth.users
ON CONFLICT (email) DO UPDATE 
SET user_id = EXCLUDED.user_id,
    role = 'admin';

-- 4. Confirmação
SELECT count(*) as total_usuarios_sincronizados FROM public.profiles;
