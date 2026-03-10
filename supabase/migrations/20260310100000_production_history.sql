-- Migration: Create Production History (Log de Lotes Produzidos)

-- 1. Create production_history table
CREATE TABLE IF NOT EXISTS public.production_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE RESTRICT,
    quantity NUMERIC NOT NULL,
    unit TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Row Level Security (RLS) Policies
ALTER TABLE public.production_history ENABLE ROW LEVEL SECURITY;

-- Select policies: All authenticated users can read
DROP POLICY IF EXISTS "Allow standard read access for auth users on production_history" ON public.production_history;
CREATE POLICY "Allow standard read access for auth users on production_history" 
ON public.production_history FOR SELECT TO authenticated USING (true);

-- Modification policies: Only admins can Insert/Update/Delete
DROP POLICY IF EXISTS "Allow admin write access on production_history" ON public.production_history;
CREATE POLICY "Allow admin write access on production_history" 
ON public.production_history FOR ALL TO authenticated 
USING (public.is_admin());
