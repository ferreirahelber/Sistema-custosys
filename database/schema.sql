-- ARQUIVO: database/schema.sql
-- VERSÃO: 2.1 (RBAC + Correção de Erro 500 + Admin Global)

-- ==========================================
-- 1. CONFIGURAÇÕES GERAIS E EQUIPE
-- ==========================================

-- Tabela de Configurações Globais (Agora com Role)
create table if not exists user_settings (
  user_id uuid references auth.users not null primary key,
  role text default 'admin', -- 'admin' ou 'cashier'
  labor_monthly_cost numeric default 0,
  work_hours_monthly numeric default 160,
  fixed_overhead_rate numeric default 0,
  cost_per_minute numeric default 0,
  estimated_monthly_revenue numeric default 0,
  
  -- Taxas configuráveis
  default_tax_rate numeric default 0,
  default_card_fee numeric default 0,
  card_debit_rate numeric default 1.60,
  card_credit_rate numeric default 4.39,
  
  updated_at timestamp with time zone default timezone('utc'::text, now()),

  -- VALIDAÇÕES
  constraint check_labor_positive check (labor_monthly_cost >= 0),
  constraint check_hours_valid check (work_hours_monthly > 0),
  constraint check_overhead_positive check (fixed_overhead_rate >= 0),
  constraint check_cost_minute_positive check (cost_per_minute >= 0)
);
alter table user_settings enable row level security;

-- Política de Segurança Simplificada (Evita Erro 500)
-- Todo autenticado pode LER configs (necessário para checar roles)
create policy "Leitura Pública para Autenticados" on user_settings for select to authenticated using (true);
-- Apenas o dono pode EDITAR sua linha
create policy "Edição apenas pelo Dono" on user_settings for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Função Auxiliar de Segurança (IsAdmin)
create or replace function is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from user_settings 
    where user_id = auth.uid() 
    and role = 'admin'
  );
end;
$$ language plpgsql security definer;


-- Tabela de Equipe
create table if not exists team_members (
  id uuid default gen_random_uuid() primary key,
  user_id uuid default auth.uid(),
  name text not null,
  salary numeric not null default 0,
  hours_monthly numeric not null default 160,
  created_at timestamp with time zone default timezone('utc'::text, now()),

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

  constraint check_fixed_cost_positive check (value >= 0),
  constraint check_fixed_name_not_empty check (length(trim(name)) > 0)
);
alter table fixed_costs enable row level security;
create policy "Gerenciar meus custos fixos" on fixed_costs for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- ==========================================
-- 2. GESTÃO DE INGREDIENTES E ESTOQUE
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
  category text default 'food', 
  
  created_at timestamp with time zone default timezone('utc'::text, now()),

  constraint check_ing_name_not_empty check (length(trim(name)) > 0),
  constraint check_ing_price_positive check (package_price >= 0),
  constraint check_ing_amount_valid check (package_amount > 0),
  constraint check_ing_stock_positive check (current_stock >= 0),
  constraint check_ing_cost_positive check (unit_cost_base >= 0)
);
alter table ingredients enable row level security;
-- Admin vê tudo (para gerenciar estoque), Vendedor vê para vender
create policy "Admin vê tudo, User vê o seu" on ingredients for all to authenticated using (auth.uid() = user_id or is_admin());


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
  
  -- Venda
  selling_price numeric default 0,
  barcode text,
  category text,
  
  created_at timestamp with time zone default timezone('utc'::text, now()),

  constraint check_recipe_name_not_empty check (length(trim(name)) > 0),
  constraint check_yield_valid check (yield_units > 0),
  constraint check_prep_time_positive check (preparation_time_minutes >= 0),
  constraint check_final_cost_positive check (total_cost_final >= 0),
  constraint check_selling_price_positive check (selling_price >= 0)
);
alter table recipes enable row level security;
create policy "Admin vê tudo, User vê o seu" on recipes for all to authenticated using (auth.uid() = user_id or is_admin());


-- Tabela de Itens da Receita
create table if not exists recipe_items (
  id uuid default gen_random_uuid() primary key,
  recipe_id uuid references recipes(id) on delete cascade not null,
  ingredient_id uuid references ingredients(id) on delete set null,
  quantity numeric not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()),

  constraint check_item_qty_valid check (quantity > 0)
);
alter table recipe_items enable row level security;

-- Política via JOIN segura
create policy "Admin vê tudo, User vê o seu" on recipe_items for all to authenticated using (
  exists (
    select 1 from recipes r 
    where r.id = recipe_items.recipe_id 
    and (r.user_id = auth.uid() or is_admin())
  )
);


-- ==========================================
-- 4. MÓDULO FINANCEIRO E PDV (SEGURANÇA REFORÇADA)
-- ==========================================

-- 4.1 Tabela de Vendas (Sales)
create table if not exists sales (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  description text not null,
  amount numeric not null default 0,
  category text,
  date timestamp with time zone default timezone('utc'::text, now()),
  created_at timestamp with time zone default timezone('utc'::text, now()),
  payment_method text,
  fee_amount numeric default 0,
  net_amount numeric default 0
);
alter table sales enable row level security;
create policy "Admin vê tudo, User vê o seu" on sales for all to authenticated using (auth.uid() = user_id or is_admin());

-- 4.2 Tabela de Despesas (Expenses)
create table if not exists expenses (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  description text not null,
  amount numeric not null default 0,
  category text,
  date timestamp with time zone default timezone('utc'::text, now()),
  created_at timestamp with time zone default timezone('utc'::text, now())
);
alter table expenses enable row level security;
create policy "Admin vê tudo, User vê o seu" on expenses for all to authenticated using (auth.uid() = user_id or is_admin());

-- 4.3 Sessões de Caixa (Cash Sessions)
create table if not exists cash_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  opened_at timestamp with time zone default timezone('utc'::text, now()),
  closed_at timestamp with time zone,
  initial_balance numeric default 0,
  final_balance numeric,
  calculated_balance numeric,
  status text default 'open',
  notes text
);
alter table cash_sessions enable row level security;
create policy "Admin vê tudo, User vê o seu" on cash_sessions for all to authenticated using (auth.uid() = user_id or is_admin());

-- 4.4 Pedidos (Orders)
create table if not exists orders (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references cash_sessions(id) on delete cascade,
  user_id uuid references auth.users not null,
  customer_name text,
  total_amount numeric default 0,
  discount numeric default 0,
  change_amount numeric default 0,
  payment_method text,
  status text default 'completed',
  fee_amount numeric default 0,
  net_amount numeric default 0,
  created_at timestamp with time zone default timezone('utc'::text, now())
);
alter table orders enable row level security;
create policy "Admin vê tudo, User vê o seu" on orders for all to authenticated using (auth.uid() = user_id or is_admin());

-- 4.5 Itens do Pedido (Order Items)
create table if not exists order_items (
  id uuid default gen_random_uuid() primary key,
  order_id uuid references orders(id) on delete cascade,
  product_id uuid,
  product_name text,
  quantity numeric default 0,
  unit_price numeric default 0,
  total_price numeric default 0,
  type text 
);
alter table order_items enable row level security;

-- RLS via JOIN segura
create policy "Admin vê tudo, User vê o seu" on order_items for all to authenticated using (
  exists (
    select 1 from orders o 
    where o.id = order_items.order_id 
    and (o.user_id = auth.uid() or is_admin())
  )
);


-- ==========================================
-- 5. PERFORMANCE E ÍNDICES
-- ==========================================

create index if not exists idx_recipe_items_recipe_id on recipe_items(recipe_id);
create index if not exists idx_recipe_items_ingredient_id on recipe_items(ingredient_id);
create index if not exists idx_orders_session_id on orders(session_id);
create index if not exists idx_orders_user_id on orders(user_id);
create index if not exists idx_order_items_order_id on order_items(order_id);