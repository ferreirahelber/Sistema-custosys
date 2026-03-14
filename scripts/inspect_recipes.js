import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectRecipes() {
  console.log('--- DB INSPECTION ---');
  // 1. Quantas receitas tem cadastradas?
  const { data: recipes, error: rErr } = await supabase.from('recipes').select('id, name');
  console.log(`Total receitas: ${recipes?.length}`);
  
  // 2. Quantas possuem 0 itens?
  for (const r of recipes || []) {
      const { count } = await supabase.from('recipe_items').select('*', { count: 'exact', head: true }).eq('recipe_id', r.id);
      if (count === 0) {
          console.log(`[VAZIA] A receita "${r.name}" (${r.id}) tem 0 ingredientes no banco!`);
      }
  }
}

inspectRecipes();
