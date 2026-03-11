import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testJoin() {
  const { data: recipes, error: rErr } = await supabase
    .from('recipes')
    .select('id')
    .limit(1);
    
  if(!recipes || recipes.length === 0) return;

  const { data, error } = await supabase
    .from('recipe_items')
    .select('*, ingredient:ingredients!left(name), sub_recipe:recipes!sub_recipe_id!left(name)')
    .eq('recipe_id', recipes[0].id)
    .limit(1);

  console.log("TEST JOIN SUB-RECIPE:");
  if (error) console.error(error);
  else console.log(data);
}
testJoin();
