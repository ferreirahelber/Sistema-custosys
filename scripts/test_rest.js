import fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8');
const urlMatch = env.match(/VITE_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/);

const url = urlMatch[1].trim().replace(/['"]/g, '');
const key = keyMatch[1].trim().replace(/['"]/g, '');

async function test() {
  const headers = {
    'apikey': key,
    'Authorization': 'Bearer ' + key,
    'Content-Type': 'application/json'
  };
  
  console.log('--- AUDITORIA REST SUPABASE ---');

  // 1. Get Bombom
  const r1 = await fetch(`${url}/rest/v1/recipes?name=eq.Bombom%20de%20Bacuri&select=*`, { headers });
  const recipes = await r1.json();
  if (!recipes || recipes.length === 0) {
     console.log('Receita não encontrada.');
     return;
  }
  const recipe = recipes[0];
  console.log("✅ ID do Bombom:", recipe.id);
  
  // 2. Get recipe_items (BRUTO sem Join)
  console.log(`\n⏳ Buscando itens brutos em: /rest/v1/recipe_items?recipe_id=eq.${recipe.id}`);
  const r2 = await fetch(`${url}/rest/v1/recipe_items?recipe_id=eq.${recipe.id}&select=*`, { headers });
  const rawItems = await r2.json();
  console.log("✅ RAW Items -> Retornados:", rawItems.length);
  if(rawItems.length > 0) {
      console.log(rawItems);
  } else {
      console.log("⚠️ TABELA DE FATOS ESTÁ COMPLETAMENTE VAZIA NO BANCO DE DADOS (Ou RLS bloqueou a ANON KEY).");
  }
  
  // 3. Get recipe_items (JOIN)
  console.log(`\n⏳ Buscando itens com JOIN em: /rest/v1/recipe_items?recipe_id=eq.${recipe.id}&select=*,ingredient:ingredients!left(*)`);
  const r3 = await fetch(`${url}/rest/v1/recipe_items?recipe_id=eq.${recipe.id}&select=*,ingredient:ingredients!left(*)`, { headers });
  console.log(`\n⏳ Buscando saúde da tabela global: /rest/v1/recipe_items?select=*&limit=5`);
  const r4 = await fetch(`${url}/rest/v1/recipe_items?select=*&limit=5`, { headers });
  const globalItems = await r4.json();
  
  let outputLog = `--- AUDITORIA REST SUPABASE ---\n`;
  outputLog += `✅ ID do Bombom: ${recipe.id}\n\n`;
  outputLog += `⏳ Receita Específica Retornou: ${rawItems.length} Itens\n`;
  outputLog += `⏳ Global da tabela 'recipe_items' retornou (Max 5): ${globalItems.length} Itens\n\n`;
  outputLog += JSON.stringify(globalItems, null, 2) + "\n";
  
  fs.writeFileSync('debug_output.txt', outputLog);
  console.log("📝 Dump completo salvo em debug_output.txt");
}

test();
