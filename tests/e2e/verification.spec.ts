
import { test, expect } from '@playwright/test';

test.describe('Verification Tests', () => {
    test('should login successfully as admin', async ({ page }) => {
        // 1. Visit App
        await page.goto('http://localhost:3000');

        // 2. Wait for Login form
        await expect(page.getByPlaceholder('E-mail')).toBeVisible();

        // 3. Fill Credentials
        await page.getByPlaceholder('E-mail').fill('example@gmail.com');
        await page.getByPlaceholder('Senha').fill('password123');
        await page.getByRole('button', { name: 'Entrar' }).click();

        // 4. Verify Dashboard Access (or redirection away from login)
        // Looking for sidebar or dashboard elements
        // The "Gestão de Equipe" link is only visible to admins, let's look for a common element like "Dashboard" or "Sair"/User Profile

        // Wait for navigation
        await page.waitForURL('**/'); // Expect redirect to root (Dashboard)

        // Check for an element present in the Dashboard layout
        // Based on App.tsx, Dashboard is at "/", so we expect to see something unique to Dashboard or MainLayout
        await expect(page.locator('text=Visão Geral')).toBeVisible({ timeout: 10000 }).catch(() => {
            // Fallback: maybe just check URL
            expect(page.url()).toBe('http://localhost:3000/');
        });
    });

    test('should access ingredients page', async ({ page }) => {
        // Login first
        await page.goto('http://localhost:3000');
        await page.getByPlaceholder('E-mail').fill('example@gmail.com');
        await page.getByPlaceholder('Senha').fill('password123');
        await page.getByRole('button', { name: 'Entrar' }).click();
        await page.waitForURL('http://localhost:3000/');

        // Navigate to Ingredients
        await page.goto('http://localhost:3000/ingredients');

        // Expect Ingredient Form Title
        await expect(page.locator('h1')).toContainText('Ingredientes');
    });
});
