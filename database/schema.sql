-- ARQUIVO: database/schema.sql
-- ATUALIZADO: Com validações de segurança (Constraints)

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
  updated_at timestamp with time zone default timezone('utc'::text, now()),

  -- VALIDAÇÕES DE BACKEND
  constraint check_labor_positive check (labor_monthly_cost >= 0),
  constraint check_hours_valid check (work_hours_monthly > 0), -- Evita divisão por zero
  constraint check_overhead_positive check (fixed_overhead_rate >= 0),
  constraint check_cost_minute_positive check (cost_per_minute >= 0)
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
  created_at timestamp with time zone default timezone('utc'::text, now()),

  -- VALIDAÇÕES
  constraint check_team_salary_positive check (salary >= 0),
  constraint check_team_hours_valid check (hours_monthly > 0),
  constraint check_team_name_not_empty check (length(trim(name)) > 0)
);
alter table team_members enable row level security;
create policy "Gerenciar minha equipe" on team_members for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Tabela de Custos Fixos
create table if not exists fixed_costs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid default auth.uid(),
  name text not null,
  value numeric not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()),

  -- VALIDAÇÕES
  constraint check_fixed_cost_positive check (value >= 0),
  constraint check_fixed_name_not_empty check (length(trim(name)) > 0)
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
  
  -- Dados de Compra
  package_price numeric not null default 0,
  package_amount numeric not null default 0,
  package_unit text not null, 
  
  -- Dados Base
  base_unit text not null,
  unit_cost_base numeric not null default 0,
  
  -- Controle de Estoque
  current_stock numeric default 0,
  min_stock numeric default 10,
  
  conversions jsonb default '[]'::jsonb,
  
  created_at timestamp with time zone default timezone('utc'::text, now()),

  -- VALIDAÇÕES DE BACKEND (CRÍTICAS PARA CÁLCULO)
  constraint check_ing_name_not_empty check (length(trim(name)) > 0),
  constraint check_ing_price_positive check (package_price >= 0),
  constraint check_ing_amount_valid check (package_amount > 0), -- Pacote não pode ser zero
  constraint check_ing_stock_positive check (current_stock >= 0),
  constraint check_ing_cost_positive check (unit_cost_base >= 0)
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
  
  yield_units numeric default 1,
  preparation_time_minutes numeric default 0,
  preparation_method text,
  
  -- Custos
  total_cost_material numeric default 0,
  total_cost_labor numeric default 0,
  total_cost_overhead numeric default 0,
  total_cost_final numeric default 0,
  unit_cost numeric default 0,
  
  -- Novo: Preço de Venda
  selling_price numeric default 0,
  
  created_at timestamp with time zone default timezone('utc'::text, now()),

  -- VALIDAÇÕES
  constraint check_recipe_name_not_empty check (length(trim(name)) > 0),
  constraint check_yield_valid check (yield_units > 0), -- Rendimento tem que ser > 0
  constraint check_prep_time_positive check (preparation_time_minutes >= 0),
  constraint check_final_cost_positive check (total_cost_final >= 0),
  constraint check_selling_price_positive check (selling_price >= 0)
);
alter table recipes enable row level security;
create policy "Gerenciar minhas receitas" on recipes for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- Tabela de Itens da Receita
create table if not exists recipe_items (
  id uuid default gen_random_uuid() primary key,
  recipe_id uuid references recipes(id) on delete cascade not null,
  ingredient_id uuid references ingredients(id) on delete set null,
  
  quantity numeric not null default 0,
  
  created_at timestamp with time zone default timezone('utc'::text, now()),

  -- VALIDAÇÕES
  constraint check_item_qty_valid check (quantity > 0) -- Não faz sentido ingrediente com 0g
);
alter table recipe_items enable row level security;

create policy "Gerenciar itens da receita" on recipe_items for all to authenticated using (
  exists (select 1 from recipes r where r.id = recipe_items.recipe_id and r.user_id = auth.uid())
) with check (
  exists (select 1 from recipes r where r.id = recipe_items.recipe_id and r.user_id = auth.uid())
);