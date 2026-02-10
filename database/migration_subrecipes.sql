-- ARQUIVO: database/migration_subrecipes.sql
-- MIGRATION: Suporte para Sub-receitas e Automação de Preços
-- DATA: 2026-02-06
-- AUTOR: Antigravity

-- 1. Alteração Safa da Tabela recipe_items
-- Adiciona colunas se não existirem
do $$
begin
    if not exists (select 1 from information_schema.columns where table_name = 'recipe_items' and column_name = 'item_type') then
        alter table recipe_items add column item_type text not null default 'ingredient';
    end if;

    if not exists (select 1 from information_schema.columns where table_name = 'recipe_items' and column_name = 'sub_recipe_id') then
        alter table recipe_items add column sub_recipe_id uuid references recipes(id) on delete set null;
    end if;
end $$;

-- 2. Limpeza de Dados Inconsistentes (Previne erro na constraint)
-- Remove qualquer item que não tenha nem ingrediente nem sub-receita válida
delete from recipe_items 
where ingredient_id is null and sub_recipe_id is null;

-- Garante que todos os itens existentes sejam ingredients (caso tenha ficado nulo ou errado)
update recipe_items 
set item_type = 'ingredient' 
where item_type is null or (item_type != 'ingredient' and item_type != 'recipe');

-- 3. Aplicação da Constraint de Validação
do $$
begin
    if not exists (select 1 from pg_constraint where conname = 'check_item_reference') then
        alter table recipe_items 
        add constraint check_item_reference check (
            (item_type = 'ingredient' and ingredient_id is not null) or 
            (item_type = 'recipe' and sub_recipe_id is not null)
        );
    end if;
end $$;

-- 4. Criação de Índice (Melhoria de Performance)
create index if not exists idx_recipe_items_sub_recipe_id on recipe_items(sub_recipe_id);

-- 5. Função de Automação de Preços
create or replace function handle_ingredient_price_change()
returns trigger as $$
declare
  r_recipe record;
  r_item record;
  v_new_cost numeric;
  v_old_cost numeric;
  v_total_material numeric;
  v_diff numeric;
begin
  -- Verifica se houve mudança significativa no preço unitário (base)
  if (old.unit_cost_base is distinct from new.unit_cost_base) then
    
    -- Para cada item de receita que usa este ingrediente
    for r_item in 
      select recipe_id, quantity 
      from recipe_items 
      where ingredient_id = new.id
    loop
      
      -- Recalcula o custo da receita inteira
      -- 1. Soma dos materiais (ingredientes + embalagens + bases)
      select coalesce(sum(
        case 
          when ri.item_type = 'recipe' then 
            (select unit_cost from recipes where id = ri.sub_recipe_id) * ri.quantity
          else 
            (select unit_cost_base from ingredients where id = ri.ingredient_id) * ri.quantity
        end
      ), 0)
      into v_total_material
      from recipe_items ri
      where ri.recipe_id = r_item.recipe_id;

      select * into r_recipe from recipes where id = r_item.recipe_id;
      
      if r_recipe is not null then
          v_old_cost := r_recipe.unit_cost;
          
          -- Recálculo Simples 
          v_new_cost := v_total_material + r_recipe.total_cost_labor + r_recipe.total_cost_overhead;
          
          -- Atualiza a receita
          update recipes 
          set 
            total_cost_material = v_total_material,
            total_cost_final = v_total_material + total_cost_labor + total_cost_overhead,
            unit_cost = (v_total_material + total_cost_labor + total_cost_overhead)
          where id = r_item.recipe_id;

          -- Histórico
          v_diff := v_new_cost - v_old_cost;
          if abs(v_diff) > 0.01 then
            insert into price_history (recipe_id, old_cost, new_cost, old_price, new_price, change_reason, changed_at)
            values (
              r_item.recipe_id, 
              v_old_cost, 
              v_new_cost, 
              r_recipe.selling_price, 
              r_recipe.selling_price, 
              'Atualização automática: ' || new.name,
              now()
            );
          end if;
      end if;

    end loop;
    
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- 6. Trigger
drop trigger if exists on_ingredient_price_change on ingredients;
create trigger on_ingredient_price_change
after update on ingredients
for each row
execute function handle_ingredient_price_change();

-- 7. Tabela de Histórico (Garante existência)
create table if not exists price_history (
  id uuid default gen_random_uuid() primary key,
  recipe_id uuid references recipes(id) on delete cascade not null,
  old_cost numeric,
  new_cost numeric,
  old_price numeric,
  new_price numeric,
  change_reason text,
  changed_at timestamp with time zone default timezone('utc'::text, now())
);
alter table price_history enable row level security;
do $$
begin
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'price_history' and policyname = 'Admin vê tudo') then
        create policy "Admin vê tudo" on price_history for all to authenticated using (is_admin());
    end if;
end $$;
