-- ARQUIVO DE BACKUP: database/schema.sql

-- 1. Tabela de Configurações Globais
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

-- 2. Tabela de Equipe
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

-- 3. Tabela de Custos Fixos Detalhados
create table if not exists fixed_costs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid default auth.uid(),
  name text not null,
  value numeric not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now())
);
alter table fixed_costs enable row level security;
create policy "Gerenciar meus custos fixos" on fixed_costs for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);