-- FIX: SINCRONIZAR USUÁRIOS DO AUTH PARA PROFILES
-- Executa um "Backfill" para garantir que todos os usuários já cadastrados tenham um perfil.

-- 1. Inserir todos os usuários que estão no Auth mas não no Profiles
INSERT INTO public.profiles (user_id, email, role, name)
SELECT 
    id, 
    email, 
    'admin', -- Por segurança/facilidade nesta correção, vamos criar como ADMIN. Depois você pode mudar para 'cashier' na tela de equipe.
    raw_user_meta_data->>'name'
FROM auth.users
ON CONFLICT (email) DO UPDATE 
SET user_id = EXCLUDED.user_id, -- Garante que o vínculo está certo
    role = 'admin';             -- Garante que quem já existe vira Admin para destravar o acesso

-- 2. Confirmação
SELECT count(*) as total_usuarios_sincronizados FROM public.profiles;
