-- MIGRATION: GESTÃO DE USUÁRIOS (PROFILES + TRIGGERS)

-- 1. Tabela de Perfis
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE, -- Pode ser NULL se for pré-cadastro
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'manager', 'cashier', 'user')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Policies (Regras de Segurança)

-- Leitura:
-- A. O próprio usuário pode ler seu perfil
CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

-- B. Admins podem ler todos os perfis
CREATE POLICY "Admins can read all profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Escrita (Insert/Update/Delete):
-- A. Apenas Admins podem criar/editar perfis (para gerenciar equipe)
CREATE POLICY "Admins can manage profiles" ON public.profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Correção de Bootstrapping: Permitir que o primeiro usuário se torne Admin ou sistema se auto-regule?
-- Por segurança, o primeiro insert manual no banco deve ser feito pelo SQL Editor para definir o primeiro Admin.


-- 3. Trigger para vincular Auth -> Profile

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Verifica se já existe um profile com esse email (pré-cadastro feito pelo Admin)
  IF EXISTS (SELECT 1 FROM public.profiles WHERE email = NEW.email) THEN
    -- Se existe, apenas atualiza o user_id (vincula a conta ao perfil)
    UPDATE public.profiles
    SET user_id = NEW.id,
        updated_at = NOW()
    WHERE email = NEW.email;
  ELSE
    -- Se não existe, cria um perfil padrão 'user' (Auto-Signup)
    INSERT INTO public.profiles (user_id, email, role, name)
    VALUES (NEW.id, NEW.email, 'user', NEW.raw_user_meta_data->>'name');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Configurar Trigger original do Supabase Auth
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Garantir permissões
GRANT ALL ON TABLE public.profiles TO anon, authenticated, service_role;
