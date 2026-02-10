-- FIX: CORREÇÃO COMPLETA (RLS + UNIQUE CONSTRAINT)

-- O erro anterior aconteceu porque a tabela antiga de profiles tinha a coluna 'email'
-- mas NÃO tinha o 'UNIQUE constraint', o que impedia o comando 'ON CONFLICT'.

-- 1. Garantir que Email seja ÚNICO (Necessário para upsert)
DO $$
BEGIN
    -- Verifica se já existe a constraint
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'profiles_email_key'
    ) THEN
        -- Tenta adicionar. Se falhar por dados duplicados, você precisará limpar duplicatas manualmente antes.
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_email_key UNIQUE (email);
    END IF;
END $$;

-- 2. Função Auxiliar Segura (Anti-Loop Infinito)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- Como é SECURITY DEFINER, ela "pula" o RLS.
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Recriar Políticas RLS
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;

-- Leitura: Usuário vê o próprio OU Admin vê tudo
CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT USING (
    auth.uid() = user_id OR public.is_admin()
  );

-- Escrita: Apenas Admin
CREATE POLICY "Admins can manage profiles" ON public.profiles
  FOR ALL USING (
    public.is_admin()
  );

-- 4. Garantia Extra: Auto-Promover Admin
-- Agora que temos UNIQUE(email), o ON CONFLICT vai funcionar
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
