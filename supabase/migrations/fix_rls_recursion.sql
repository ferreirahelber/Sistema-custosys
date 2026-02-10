-- FIX: CORREÇÃO DE LOOP INFINITO (ERRO 500) NAS POLÍTICAS RLS

-- O erro 500 acontece porque a política "Admins can read all profiles" tenta ler a tabela profiles 
-- para checar se é admin... o que dispara a política de novo -> loop infinito.

-- Solução: Criar uma função SECURITY DEFINER (roda como sistema) para checar o cargo sem disparar RLS.

-- 1. Função Auxiliar Segura
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- Como é SECURITY DEFINER, ela "pula" o RLS.
  -- Usamos auth.uid() para garantir que só checa o usuário atual.
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Recriar Políticas usando a função segura

-- Remove as políticas problemáticas
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;

-- Recria
-- A. Leitura: Usuário vê o próprio OU Admin vê tudo
CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT USING (
    auth.uid() = user_id OR public.is_admin()
  );

-- B. Escrita (Insert/Update/Delete): Apenas Admin
CREATE POLICY "Admins can manage profiles" ON public.profiles
  FOR ALL USING (
    public.is_admin()
  );

-- 3. Garantia Extra: Se o seu usuário ainda não estiver na tabela profiles ou não for admin,
-- este comando tenta te transformar em admin baseado no email (ajuste o email se necessário).
-- Isso evita o problema de "ficar trancado pra fora".

DO $$
BEGIN
    -- Tenta atualizar para admin se encontrar o email
    UPDATE public.profiles 
    SET role = 'admin' 
    WHERE user_id = auth.uid();
    
    -- Se não afetou linhas (usuário não existe em profiles), insere
    IF NOT FOUND THEN
        INSERT INTO public.profiles (user_id, email, role, name)
        SELECT id, email, 'admin', raw_user_meta_data->>'name'
        FROM auth.users
        WHERE id = auth.uid()
        ON CONFLICT (email) DO UPDATE SET role = 'admin', user_id = EXCLUDED.user_id;
    END IF;
END $$;
