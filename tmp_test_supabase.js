import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://example.com';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'key';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { count, error } = await supabase
    .from('recipe_items')
    .select('*', { count: 'exact', head: true });
  console.log("Count:", count);
  console.log("Error:", error);
}

test();
