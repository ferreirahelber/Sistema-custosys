-- ARQUIVO DE BACKUP: database/schema.sql

-- ==========================================
-- 1. CONFIGURAÇÕES GERAIS E EQUIPE
-- ==========================================

-- Tabela de Configurações Globais
create table if not exists user_settings (
  user_id uuid references auth.users not null primary key,
  labor_monthly_cost numeric default 0,
  work_hours_monthly numeric default 160,
  fixed_overhead_rate numeric default 0,
  cost_per_minute numeric default 0,
  estimated_monthly_revenue numeric default 0,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);
alter table user_settings enable row level security;
create policy "Gerenciar minhas configs" on user_settings for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Tabela de Equipe
create table if not exists team_members (
  id uuid default gen_random_uuid() primary key,
  user_id uuid default auth.uid(),
  name text not null,
  salary numeric not null default 0,
  hours_monthly numeric not null default 160,
  created_at timestamp with time zone default timezone('utc'::text, now())
);
alter table team_members enable row level security;
create policy "Gerenciar minha equipe" on team_members for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Tabela de Custos Fixos Detalhados
create table if not exists fixed_costs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid default auth.uid(),
  name text not null,
  value numeric not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now())
);
alter table fixed_costs enable row level security;
create policy "Gerenciar meus custos fixos" on fixed_costs for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- ==========================================
-- 2. GESTÃO DE INGREDIENTES
-- ==========================================

create table if not exists ingredients (
  id uuid default gen_random_uuid() primary key,
  user_id uuid default auth.uid(),
  name text not null,
  
  -- Dados de Compra (Pacote)
  package_price numeric not null default 0,
  package_amount numeric not null default 0,
  package_unit text not null, -- 'kg', 'g', 'l', 'ml', 'un'
  
  -- Dados Base para Cálculo
  base_unit text not null, -- 'g', 'ml', 'un'
  unit_cost_base numeric not null default 0,
  
  -- Controle de Estoque
  current_stock numeric default 0, -- armazenado na unidade base (g/ml/un)
  min_stock numeric default 10,
  
  -- Conversões (Medidas Caseiras)
  conversions jsonb default '[]'::jsonb, -- Ex: [{"name": "Xícara", "value": 120}]
  
  created_at timestamp with time zone default timezone('utc'::text, now())
);
alter table ingredients enable row level security;
create policy "Gerenciar meus ingredientes" on ingredients for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- ==========================================
-- 3. GESTÃO DE RECEITAS
-- ==========================================

create table if not exists recipes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid default auth.uid(),
  name text not null,
  
  -- Dados Gerais
  yield_units numeric default 1, -- Rendimento
  preparation_time_minutes numeric default 0,
  preparation_method text, -- Modo de preparo completo
  
  -- Custos Calculados (Snapshot)
  total_cost_material numeric default 0,
  total_cost_labor numeric default 0,
  total_cost_overhead numeric default 0,
  total_cost_final numeric default 0,
  unit_cost numeric default 0,
  
  created_at timestamp with time zone default timezone('utc'::text, now())
);
alter table recipes enable row level security;
create policy "Gerenciar minhas receitas" on recipes for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- Tabela de Itens da Receita (Relacionamento N:N)
create table if not exists recipe_items (
  id uuid default gen_random_uuid() primary key,
  recipe_id uuid references recipes(id) on delete cascade not null,
  ingredient_id uuid references ingredients(id) on delete set null,
  
  quantity numeric not null default 0, -- Quantidade usada na receita (na unidade base)
  
  created_at timestamp with time zone default timezone('utc'::text, now())
);
-- Nota: Itens herdam a segurança via recipe_id, mas aplicamos RLS direta para garantir
alter table recipe_items enable row level security;

-- Política: Usuário só vê itens de receitas que ele é dono
create policy "Gerenciar itens da receita" on recipe_items for all to authenticated using (
  exists (select 1 from recipes r where r.id = recipe_items.recipe_id and r.user_id = auth.uid())
) with check (
  exists (select 1 from recipes r where r.id = recipe_items.recipe_id and r.user_id = auth.uid())
);