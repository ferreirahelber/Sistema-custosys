import { test, expect } from '@playwright/test';

test.describe('Fluxo Crítico do Sistema', () => {
  
  // Antes de cada teste, fazemos login
  // IMPORTANTE: Substitua pelo email/senha de um usuário de teste válido no seu banco
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'helberflopes@gmail.com'); // SEU EMAIL DE TESTE
    await page.fill('input[type="password"]', '1s4b3ll3');         // SUA SENHA DE TESTE
    await page.click('button:has-text("Entrar")');
    
    // Espera redirecionar para o dashboard
    await expect(page).toHaveURL('/');
  });

  test('Deve cadastrar um ingrediente e criar uma receita com ele', async ({ page }) => {
    // 1. Cadastrar Ingrediente
    await page.click('a[href="/ingredients"]');
    await page.click('button:has-text("Novo")'); // Botão na barra superior ou painel vazio
    
    const nomeIngrediente = `Farinha Teste ${Date.now()}`; // Nome único para não dar erro de duplicidade
    
    await page.fill('input[placeholder*="Ex: Farinha"]', nomeIngrediente);
    await page.fill('input[placeholder="0.00"]', '10'); // Preço
    // Procura o input de quantidade (pode precisar ajustar o seletor dependendo do seu HTML exato)
    await page.locator('input[type="number"]').nth(1).fill('1'); // Quantidade
    
    await page.click('button:has-text("Cadastrar Item")');
    
    // Verifica se apareceu o toast de sucesso ou se o item está na lista
    await expect(page.getByText(nomeIngrediente)).toBeVisible();

    // 2. Criar Receita
    await page.click('a[href="/recipes"]');
    await page.click('a:has-text("Nova Receita")');
    
    const nomeReceita = `Bolo Teste ${Date.now()}`;
    await page.fill('input[placeholder*="Ex: Bolo"]', nomeReceita);
    
    // Selecionar o ingrediente que acabamos de criar
    await page.selectOption('select', { label: nomeIngrediente }); 
    // Preencher quantidade do item na receita
    await page.locator('input[placeholder="0"]').first().fill('0.5'); // 500g se for kg
    // Clicar no botão de adicionar (+)
    await page.locator('button:has(.lucide-plus)').click();

    // Salvar Receita
    await page.click('button:has-text("Salvar")');
    
    // Verifica se foi redirecionado para a lista e se a receita está lá
    await expect(page).toHaveURL('/recipes');
    await expect(page.getByText(nomeReceita)).toBeVisible();
  });
});