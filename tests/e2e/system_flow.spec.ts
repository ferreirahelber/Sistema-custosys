import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

// Configuração Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const ADMIN_EMAIL = process.env.VITE_ADMIN_EMAIL || 'helberflopes@gmail.com';
const ADMIN_PASS = process.env.VITE_ADMIN_PASSWORD || '1s4b3ll3';

const CASHIER_EMAIL = `vendedor_test_${Date.now()}@test.com`;
const CASHIER_PASS = 'senha123';

const TIMESTAMP = Date.now();
const INGREDIENT_NAME = `Farinha E2E ${TIMESTAMP}`;
const RECIPE_NAME = `Bolo E2E ${TIMESTAMP}`;
const PRODUCT_NAME = `Coca E2E ${TIMESTAMP}`;

test.describe.serial('Fluxo Completo do Sistema (Admin + Vendedor)', () => {

    // =========================================================================
    // 1. FLUXO DO ADMINISTRADOR
    // =========================================================================
    test('Admin: Cadastrar Insumos, Receitas e Produtos', async ({ page }) => {
        try {
            // Login Admin
            await page.goto('/login');

            await page.fill('input[type="email"]', ADMIN_EMAIL);
            await page.fill('input[type="password"]', ADMIN_PASS);
            await page.click('button:has-text("Entrar")');

            // Wait for login processing and potential redirects
            await page.waitForTimeout(3000);

            if (page.url().includes('/pos')) {
                await page.goto('/');
            }

            await expect(page).toHaveURL('/'); // Dashboard

            // 1. Cadastrar Ingrediente
            await page.goto('/ingredients');
            await page.click('button:has-text("Novo")');
            await page.fill('input[placeholder*="Ex: Farinha"]', INGREDIENT_NAME);
            await page.locator('input[type="number"]').first().fill('10.00'); // Preço
            await page.locator('input[type="number"]').nth(1).fill('1'); // Quantidade Pacote
            await page.click('button:has-text("Cadastrar")');
            await expect(page.getByText(INGREDIENT_NAME)).toBeVisible();

            // 2. Cadastrar Receita (Usando o Ingrediente)
            await page.goto('/recipes');
            await page.click('a[href="/recipes/new"]');

            // Aguardar transição para o formulário
            await expect(page).toHaveURL(/\/recipes\/new|RecipeForm/);

            await page.fill('input[placeholder*="Ex: Bolo"]', RECIPE_NAME);

            // Scoping
            const settingsPanel = page.locator('.bg-white', { hasText: 'Nome da Receita' });
            const ingredientsPanel = page.locator('.bg-white', { hasText: 'Ingredientes' });

            // Select Categoria (dentro do settingsPanel)
            await settingsPanel.locator('select').first().selectOption({ label: 'Geral' });

            await page.fill('input[name="preparation_time_minutes"]', '60');

            // Adicionar Ingrediente (Primeiro select da lista de ingredientes)
            // Select Ingredient
            await ingredientsPanel.locator('select').first().selectOption({ label: INGREDIENT_NAME });

            // Quantidade
            await ingredientsPanel.locator('input[type="number"]').first().fill('0.5');

            // Botão Adicionar
            await ingredientsPanel.locator('button:has(.lucide-plus)').first().click();

            // Salvar
            await page.click('button:has-text("Salvar")');

            await expect(page).toHaveURL('/recipes', { timeout: 10000 });
            await expect(page.getByText(RECIPE_NAME)).toBeVisible();

            // 3. Cadastrar Produto de Revenda
            await page.goto('/resale-products');
            await page.click('button:has-text("Novo")');
            await page.fill('input[placeholder*="Ex: Coca-Cola"]', PRODUCT_NAME);
            await page.fill('input[placeholder="0.00"]', '8.00'); // Preço Venda pode ser pelo placeholder ou ordem

            // Custo (Valor Pago): placeholder="Ex: 30.00"
            await page.locator('input[placeholder="Ex: 30.00"]').fill('4.00');
            // Qtd Pacote: placeholder="Ex: 12"
            await page.locator('input[placeholder="Ex: 12"]').fill('1');

            // Preço Venda (Ultimo input, background emerald)
            await page.locator('input[placeholder="0.00"]').last().fill('8.00');

            await page.click('button:has-text("Cadastrar Produto")');
            await expect(page.getByText(PRODUCT_NAME)).toBeVisible();

            // Logout
            await page.getByRole('button', { name: /Sair/i }).click();

            // Verifica se o formulário de login está visível (Botão Entrar)
            await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible();
        } catch (error) {
            throw error; // Re-throw to mark test as failed
        }
    });

    // =========================================================================
    // 2. SETUP DO VENDEDOR (Backend)
    // =========================================================================
    test.beforeAll(async () => {
        // Criar usuário vendedor via API para garantir existência
        const { error } = await supabase.auth.signUp({
            email: CASHIER_EMAIL,
            password: CASHIER_PASS,
        });
        if (error) console.log('Aviso ao criar vendedor (pode já existir):', error.message);

        // Seed Categories
        const { error: catError } = await supabase.from('product_categories').upsert(
            { id: 1, name: 'Geral' },
            { onConflict: 'id' }
        );
        if (catError) {
            // Fallback if id is auto-increment and 1 is taken
            await supabase.from('product_categories').insert({ name: 'Geral' });
        }
    });

    // =========================================================================
    // 3. FLUXO DO VENDEDOR
    // =========================================================================
    test('Vendedor: Abrir Caixa, Vender e Fechar Caixa', async ({ page }) => {
        try {
            // Login Vendedor
            await page.goto('/login');
            await page.fill('input[type="email"]', CASHIER_EMAIL);
            await page.fill('input[type="password"]', CASHIER_PASS);
            await page.click('button:has-text("Entrar")');

            // Deve ser redirecionado para o POS
            await expect(page).toHaveURL('/pos');

            // 1. Abrir Caixa (se não estiver aberto)
            // Verifica se pede abertura de caixa
            await page.waitForTimeout(2000);

            if (await page.getByText('Abrir Caixa').isVisible()) {
                await page.getByRole('button', { name: 'Abrir Caixa' }).first().click(); // Click trigger (dashboard)
                await page.fill('input[type="number"]', '100.00'); // Fundo de troco
                await page.click('button[type="submit"]'); // Click submit in modal ("Abrir Caixa")
            }

            // Aguarda interface de venda carregar
            await expect(page.getByPlaceholder('Buscar...')).toBeVisible();

            // 2. Adicionar Itens ao Carrinho
            // Busca e adiciona Receita
            await page.fill('input[placeholder="Buscar..."]', RECIPE_NAME);
            await page.waitForTimeout(1000); // Wait for search debounce
            await page.click(`text=${RECIPE_NAME}`); // Clica no card do produto

            // Busca e adiciona Produto Revenda
            await page.fill('input[placeholder="Buscar..."]', ''); // Limpa
            await page.fill('input[placeholder="Buscar..."]', PRODUCT_NAME);
            await page.waitForTimeout(1000);
            await page.click(`text=${PRODUCT_NAME}`);

            // 3. Finalizar Venda
            // O painel mostra diretamente os métodos de pagamento
            await page.click('button:has-text("Dinheiro")');

            // Modal de Pagamento
            const paymentInput = page.locator('input[placeholder="0.00"]').last(); // Pode haver mais inputs na página, pegar o último visível ou específico
            await expect(paymentInput).toBeVisible();
            await paymentInput.fill('1000.00'); // Valor suficiente

            await page.click('button:has-text("Finalizar Venda")');

            // 4. Verificar Sucesso e Iniciar Nova Venda
            await expect(page.getByText('Venda Realizada!')).toBeVisible();
            await page.click('button:has-text("Nova Venda")');

            // 5. Fechar Caixa
            await page.click('button[title="Fechar Caixa"]');

            // Modal de Fechamento
            await expect(page.getByText('Conferência de Fechamento')).toBeVisible();
            await page.fill('input[type="number"]', '1000.00'); // Valor em caixa
            await page.click('button:has-text("Fechar Caixa")');

        } catch (error) {
            throw error;
        }
    });

});
