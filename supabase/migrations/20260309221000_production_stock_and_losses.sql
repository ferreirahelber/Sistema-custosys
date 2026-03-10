-- Migration: Create Production Stock & Losses tables

-- 1. Create production_stock table
CREATE TABLE IF NOT EXISTS public.production_stock (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE RESTRICT,
    quantity NUMERIC NOT NULL DEFAULT 0,
    min_quantity NUMERIC NOT NULL DEFAULT 5,
    unit TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(recipe_id)
);

-- 2. Create loss_reasons table
CREATE TABLE IF NOT EXISTS public.loss_reasons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    label TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert Default Values for loss_reasons
INSERT INTO public.loss_reasons (label) VALUES 
    ('Vencimento'), 
    ('Dano Físico'), 
    ('Degustação/Brinde'), 
    ('Erro de Produção')
ON CONFLICT (label) DO NOTHING;

-- 3. Create inventory_losses table
CREATE TABLE IF NOT EXISTS public.inventory_losses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE RESTRICT,
    quantity NUMERIC NOT NULL,
    reason_id UUID NOT NULL REFERENCES public.loss_reasons(id) ON DELETE RESTRICT,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Trigger logic for Updating Production Stock
CREATE OR REPLACE FUNCTION public.update_stock_on_loss()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- UPDATE stock for inserted loss
        UPDATE public.production_stock 
        SET quantity = quantity - NEW.quantity,
            updated_at = now()
        WHERE recipe_id = NEW.product_id;
        
        -- Optional: If the stock row doesn't exist yet, we insert it here with unit 'un' by default
        -- to prevent silently ignoring the loss if stock is uninitialized.
        IF NOT FOUND THEN
            INSERT INTO public.production_stock (recipe_id, quantity, unit)
            VALUES (NEW.product_id, -NEW.quantity, 'un');
        END IF;
        
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- UPDATE stock for deleted loss (reverting the loss)
        UPDATE public.production_stock 
        SET quantity = quantity + OLD.quantity,
            updated_at = now()
        WHERE recipe_id = OLD.product_id;
        
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        -- UPDATE stock for modified loss
        UPDATE public.production_stock 
        SET quantity = quantity + OLD.quantity - NEW.quantity,
            updated_at = now()
        WHERE recipe_id = NEW.product_id;
        
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_inventory_loss_stock_update ON public.inventory_losses;
CREATE TRIGGER tr_inventory_loss_stock_update
AFTER INSERT OR UPDATE OR DELETE ON public.inventory_losses
FOR EACH ROW EXECUTE FUNCTION public.update_stock_on_loss();

-- Trigger for updated_at on production_stock
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_timestamp_production_stock ON public.production_stock;
CREATE TRIGGER set_timestamp_production_stock
BEFORE UPDATE ON public.production_stock
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- 5. Row Level Security (RLS) Policies

ALTER TABLE public.production_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loss_reasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_losses ENABLE ROW LEVEL SECURITY;

-- Select policies: All authenticated users can read
-- Select policies: All authenticated users can read
DROP POLICY IF EXISTS "Allow standard read access for auth users on production_stock" ON public.production_stock;
CREATE POLICY "Allow standard read access for auth users on production_stock" 
ON public.production_stock FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow standard read access for auth users on loss_reasons" ON public.loss_reasons;
CREATE POLICY "Allow standard read access for auth users on loss_reasons" 
ON public.loss_reasons FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow standard read access for auth users on inventory_losses" ON public.inventory_losses;
CREATE POLICY "Allow standard read access for auth users on inventory_losses" 
ON public.inventory_losses FOR SELECT TO authenticated USING (true);

-- Modification policies: Only admins can Insert/Update/Delete
-- Uses the public.is_admin() function
DROP POLICY IF EXISTS "Allow admin write access on production_stock" ON public.production_stock;
CREATE POLICY "Allow admin write access on production_stock" 
ON public.production_stock FOR ALL TO authenticated 
USING (public.is_admin());

DROP POLICY IF EXISTS "Allow admin write access on loss_reasons" ON public.loss_reasons;
CREATE POLICY "Allow admin write access on loss_reasons" 
ON public.loss_reasons FOR ALL TO authenticated 
USING (public.is_admin());

DROP POLICY IF EXISTS "Allow admin write access on inventory_losses" ON public.inventory_losses;
CREATE POLICY "Allow admin write access on inventory_losses" 
ON public.inventory_losses FOR ALL TO authenticated 
USING (public.is_admin());
