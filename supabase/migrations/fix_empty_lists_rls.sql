-- FIX: Garante que as tabelas de ingredientes e receitas tenham permissão de acesso
-- Habilita RLS e cria políticas permissivas para resolver o problema de listas vazias

-- 1. TABELA INGREDIENTS
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Select Ingredients" ON ingredients;
CREATE POLICY "Public Select Ingredients" ON ingredients FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Insert Ingredients" ON ingredients;
CREATE POLICY "Public Insert Ingredients" ON ingredients FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public Update Ingredients" ON ingredients;
CREATE POLICY "Public Update Ingredients" ON ingredients FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Public Delete Ingredients" ON ingredients;
CREATE POLICY "Public Delete Ingredients" ON ingredients FOR DELETE USING (true);

-- 2. TABELA RECIPES
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Select Recipes" ON recipes;
CREATE POLICY "Public Select Recipes" ON recipes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Insert Recipes" ON recipes;
CREATE POLICY "Public Insert Recipes" ON recipes FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public Update Recipes" ON recipes;
CREATE POLICY "Public Update Recipes" ON recipes FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Public Delete Recipes" ON recipes;
CREATE POLICY "Public Delete Recipes" ON recipes FOR DELETE USING (true);

-- 3. TABELA RECIPE_ITEMS
ALTER TABLE recipe_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Select RecipeItems" ON recipe_items;
CREATE POLICY "Public Select RecipeItems" ON recipe_items FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Insert RecipeItems" ON recipe_items;
CREATE POLICY "Public Insert RecipeItems" ON recipe_items FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public Update RecipeItems" ON recipe_items;
CREATE POLICY "Public Update RecipeItems" ON recipe_items FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Public Delete RecipeItems" ON recipe_items;
CREATE POLICY "Public Delete RecipeItems" ON recipe_items FOR DELETE USING (true);

-- 4. Reafirmar Grants (por precaução)
GRANT ALL ON TABLE ingredients TO anon, authenticated, service_role;
GRANT ALL ON TABLE recipes TO anon, authenticated, service_role;
GRANT ALL ON TABLE recipe_items TO anon, authenticated, service_role;
