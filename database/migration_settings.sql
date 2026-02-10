-- ARQUIVO: database/migration_settings.sql
-- MIGRATION: Adiciona colunas de taxas na tabela user_settings
-- DATA: 2026-02-06

-- Garante que a tabela user_settings existe
create table if not exists user_settings (
  user_id uuid references auth.users not null primary key,
  role text default 'admin',
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Habilita RLS se criado agora
alter table user_settings enable row level security;

-- Adiciona colunas novas de forma segura (IF NOT EXISTS manual usando DO block)
do $$
begin
    -- Colunas de custos básicos
    if not exists (select 1 from information_schema.columns where table_name = 'user_settings' and column_name = 'labor_monthly_cost') then
        alter table user_settings add column labor_monthly_cost numeric default 0;
    end if;
    
    if not exists (select 1 from information_schema.columns where table_name = 'user_settings' and column_name = 'work_hours_monthly') then
        alter table user_settings add column work_hours_monthly numeric default 160;
    end if;
    
    if not exists (select 1 from information_schema.columns where table_name = 'user_settings' and column_name = 'fixed_overhead_rate') then
        alter table user_settings add column fixed_overhead_rate numeric default 0;
    end if;

    if not exists (select 1 from information_schema.columns where table_name = 'user_settings' and column_name = 'cost_per_minute') then
        alter table user_settings add column cost_per_minute numeric default 0;
    end if;

    if not exists (select 1 from information_schema.columns where table_name = 'user_settings' and column_name = 'estimated_monthly_revenue') then
        alter table user_settings add column estimated_monthly_revenue numeric default 0;
    end if;

    -- Novas colunas de taxas (Provável causa do erro 400)
    if not exists (select 1 from information_schema.columns where table_name = 'user_settings' and column_name = 'default_tax_rate') then
        alter table user_settings add column default_tax_rate numeric default 0;
    end if;

    if not exists (select 1 from information_schema.columns where table_name = 'user_settings' and column_name = 'default_card_fee') then
        alter table user_settings add column default_card_fee numeric default 0;
    end if;

    if not exists (select 1 from information_schema.columns where table_name = 'user_settings' and column_name = 'card_debit_rate') then
        alter table user_settings add column card_debit_rate numeric default 1.60;
    end if;

    if not exists (select 1 from information_schema.columns where table_name = 'user_settings' and column_name = 'card_credit_rate') then
        alter table user_settings add column card_credit_rate numeric default 4.39;
    end if;

end $$;

-- Garante permissões RLS básicas (caso não existam)
do $$
begin
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'user_settings' and policyname = 'Leitura Pública para Autenticados') then
        create policy "Leitura Pública para Autenticados" on user_settings for select to authenticated using (true);
    end if;

    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'user_settings' and policyname = 'Edição apenas pelo Dono') then
        create policy "Edição apenas pelo Dono" on user_settings for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
    end if;
end $$;
