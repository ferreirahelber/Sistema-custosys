-- FIX: CORRIGIR RESTRIÇÃO DE CHAVE ESTRANGEIRA NO ID
-- O erro indica que a coluna 'id' tem uma regra que obriga ela ser igual ao ID de um usuário,
-- mas nós já criamos a coluna 'user_id' separada para isso.

-- 1. Remover a restrição antiga que está travando o ID
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS "profiles_id_fkey";
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS "profiles_users_id_fkey"; -- Nome alternativo comum

-- 2. Garantir que o ID tenha valor padrão (caso não tenha rodado o script anterior)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
ALTER TABLE public.profiles ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- 3. Tentar Sincronizar Novamente
INSERT INTO public.profiles (id, user_id, email, role, name)
SELECT 
    gen_random_uuid(), 
    id, 
    email, 
    'admin', 
    raw_user_meta_data->>'name'
FROM auth.users
ON CONFLICT (email) DO UPDATE 
SET user_id = EXCLUDED.user_id,
    role = 'admin';

-- 4. Confirmação
SELECT count(*) as total_usuarios_sincronizados FROM public.profiles;
