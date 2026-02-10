-- FIX: RECRIA TABELA PROFILES PARA CORRIGIR ERRO DE COLUNA
-- ATENÇÃO: ISSO APAGARÁ DADOS DA TABELA PROFILES SE ELA JÁ EXISTIR

-- 1. Limpeza (DROP)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
-- Apagar tabela antiga que pode estar com esquema errado
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 2. Recriar Tabela de Perfis Corretamente
CREATE TABLE public.profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'manager', 'cashier', 'user')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Policies (Regras de Segurança)

-- Leitura:
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all profiles" ON public.profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Escrita:
CREATE POLICY "Admins can manage profiles" ON public.profiles FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- 4. Trigger para vincular Auth -> Profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.profiles WHERE email = NEW.email) THEN
    -- Se existe (pré-catastro), vincula
    UPDATE public.profiles
    SET user_id = NEW.id,
        updated_at = NOW()
    WHERE email = NEW.email;
  ELSE
    -- Se não existe (auto-signup), cria perfil 'user' novo
    INSERT INTO public.profiles (user_id, email, role, name)
    VALUES (NEW.id, NEW.email, 'user', NEW.raw_user_meta_data->>'name');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Garantir permissões
GRANT ALL ON TABLE public.profiles TO anon, authenticated, service_role;
