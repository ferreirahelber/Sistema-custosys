-- GRANT PERMISSIONS FOR TESTING
-- This should be run in Supabase SQL Editor

GRANT ALL ON TABLE product_categories TO anon, authenticated, service_role;
GRANT ALL ON TABLE ingredients TO anon, authenticated, service_role;
GRANT ALL ON TABLE recipes TO anon, authenticated, service_role;
GRANT ALL ON TABLE recipe_items TO anon, authenticated, service_role;
GRANT ALL ON TABLE products TO anon, authenticated, service_role;
GRANT ALL ON TABLE orders TO anon, authenticated, service_role;
GRANT ALL ON TABLE order_items TO anon, authenticated, service_role;
GRANT ALL ON TABLE sales TO anon, authenticated, service_role;
GRANT ALL ON TABLE expenses TO anon, authenticated, service_role;

-- ADICIONADO: cash_sessions para o teste criar sessões
GRANT ALL ON TABLE cash_sessions TO anon, authenticated, service_role;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
