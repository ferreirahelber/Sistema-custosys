import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('⚠️ Variáveis ENV não encontradas no arquivo .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugRecipe() {
  console.log('--- INICIANDO AUDITORIA PROFUNDA DE RECEITA ---');

  // 1. Achar a receita Bombom de Bacuri para pegar o ID real
  const { data: recipe, error: errBase } = await supabase
    .from('recipes')
    .select('*')
    .eq('name', 'Bombom de Bacuri')
    .single();

  if (errBase) {
    console.error('Erro ao buscar a receita base:', errBase.message);
    return;
  }

  const recipeId = recipe.id;
  console.log('✅ 1. ID Real de Bombom de Bacuri:', recipeId);

  // 2. Tentar buscar em recipe_items SEM relacionamento (Raw Bypass)
  const { data: rawItems, error: errRaw } = await supabase
    .from('recipe_items')
    .select('*')
    .eq('recipe_id', recipeId);

  if (errRaw) {
    console.error('❌ 2. Erro ao buscar recipe_items puro:', errRaw.message);
  } else {
    console.log('✅ 2. Resultado da Tabela recipe_items PURA (sem Joins):');
    console.log(JSON.stringify(rawItems, null, 2));
    if (rawItems && rawItems.length === 0) {
      console.log('⚠️ ALERTA: A TABELA NO BANCO REALMENTE ESTÁ VAZIA PARA ESTE ID.');
    }
  }

  // 3. Tentar a query original exata com !left()
  const { data: joinedItems, error: errJoin } = await supabase
    .from('recipe_items')
    .select('*, ingredient:ingredients!left(*)')
    .eq('recipe_id', recipeId);

  if (errJoin) {
    console.error('❌ 3. Erro na query de Join:', errJoin.message);
  } else {
    console.log('✅ 3. Resultado da Query com !left():');
    console.log(JSON.stringify(joinedItems, null, 2));
  }
}

debugRecipe().then(() => {
  console.log('--- AUDITORIA CONCLUÍDA ---');
  process.exit(0);
});
