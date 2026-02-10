import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in environment');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

describe('Refactoring Verification: POS & Fees', () => {
    let user: any;
    let ingredientId: string;
    let productId: string;
    let recipeId: string;
    let categoryId: number;

    const TEST_PREFIX = `test_${Date.now()}`;

    beforeAll(async () => {
        console.log('Starting setup...');
        const email = `${TEST_PREFIX}@test.com`;
        const password = 'password123';

        // 1. Try SignUp
        const { data: auth, error: authError } = await supabase.auth.signUp({
            email,
            password,
        });

        if (authError) {
            console.log('SignUp failed, trying login...', authError.message);
            // If error, try login
            const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({ email, password });
            if (loginError) {
                console.error('Login also failed:', loginError);
                throw loginError;
            }
            user = loginData.user;
        } else {
            user = auth.user;
        }

        if (!user) {
            // Sometimes signUp returns null user if email confirmation is required.
            // Try strict login again to be sure
            const { data: loginData } = await supabase.auth.signInWithPassword({ email, password });
            user = loginData.user;
        }

        if (!user) throw new Error('Could not authenticate user');

        console.log('User authenticated:', user.id);

        // 2. Create Category
        // CORRIGIDO: Nome da tabela é 'product_categories'
        const { data: cat, error: catError } = await supabase.from('product_categories').insert({ name: `${TEST_PREFIX}_Cat` }).select().single();
        if (catError) {
            console.error('Category creation failed:', catError);
            throw catError;
        }
        categoryId = cat.id;
        console.log('Category created:', categoryId);
    });

    afterAll(async () => {
        // Cleanup if possible (optional)
        if (user) await supabase.auth.signOut();
    });

    it('should create test data (Ingredient, Recipe, Product)', async () => {
        // Create Ingredient (Stock: 1000g)
        // FIXED: Added package_amount and package_price to satisfy checks
        const { data: ing, error: ingError } = await supabase.from('ingredients').insert({
            name: `${TEST_PREFIX}_Flour`,
            category: 'food',
            price: 10,
            unit: 'g',
            base_unit: 'g',
            current_stock: 1000,
            min_stock: 100,
            package_amount: 1000,
            package_price: 10,
            package_unit: 'g'
        }).select().single();

        if (ingError) {
            console.error('Ingredient creation failed:', ingError);
            throw ingError;
        }
        expect(ing).toBeDefined();
        ingredientId = ing.id;
        console.log('Ingredient created:', ingredientId);

        // Create Recipe (Uses 100g of Flour)
        const { data: recipe, error: recipeError } = await supabase.from('recipes').insert({
            name: `${TEST_PREFIX}_Cake`,
            category: 'food',
            selling_price: 50,
            unit_cost: 1, // FIXED: cost_price -> unit_cost
            is_base: false,
            preparation_time_minutes: 10,
            yield_units: 1,
            yield_quantity: 1,
            yield_unit: 'un'
        }).select().single();

        if (recipeError) {
            console.error('Recipe creation failed:', recipeError);
            throw recipeError;
        }
        expect(recipe).toBeDefined();
        recipeId = recipe.id;
        console.log('Recipe created:', recipeId);

        // Link Ingredient to Recipe
        const { error: itemError } = await supabase.from('recipe_items').insert({
            recipe_id: recipeId,
            ingredient_id: ingredientId,
            quantity: 100, // Uses 100g
            item_type: 'ingredient' // Added type
        });
        if (itemError) {
            console.error('Recipe Item creation failed:', itemError);
            throw itemError;
        }

        // Create Resale Product (Stock: 10)
        const { data: prod, error: prodError } = await supabase.from('products').insert({
            name: `${TEST_PREFIX}_Coke`,
            type: 'resale',
            price: 5,
            cost_price: 2,
            current_stock: 10,
            min_stock: 2,
            category: `${TEST_PREFIX}_Cat` // Uses created category
        }).select().single();

        if (prodError) {
            console.error('Product creation failed:', prodError);
            throw prodError;
        }
        expect(prod).toBeDefined();
        productId = prod.id;
        console.log('Product created:', productId);
    });

    it('should process a sale atomically using RPC', async () => {
        // 1. Create a valid Cash Session (Required for Foreign Key)
        const { data: session, error: sessionError } = await supabase.from('cash_sessions').insert({
            user_id: user.id,
            initial_balance: 100,
            status: 'open',
            opened_at: new Date().toISOString()
        }).select().single();

        if (sessionError) {
            console.error('Session creation failed:', sessionError);
            throw sessionError;
        }
        console.log('Session created:', session.id);

        // Payload for RPC
        const salePayload = {
            session_id: session.id, // REAL SESSION ID
            total_amount: 55, // 50 (Cake) + 5 (Coke)
            payment_method: 'Crédito', // Should trigger fee
            fee_amount: 2.50, // Arbitrary fee
            net_amount: 52.50,
            user_id: user.id,
            user_email: user.email
        };

        const itemsPayload = [
            {
                product_id: recipeId,
                product_name: 'Cake',
                quantity: 2, // 2 Cakes -> Should deduct 200g flour
                unit_price: 50,
                total_price: 100,
                type: 'recipe'
            },
            {
                product_id: productId,
                product_name: 'Coke',
                quantity: 3, // 3 Cokes -> Should deduct 3 units
                unit_price: 5,
                total_price: 15,
                type: 'resale'
            }
        ];

        // Recalculate totals
        salePayload.total_amount = 115;
        salePayload.net_amount = 112.5;

        // CALL RPC
        const { data: orderId, error } = await supabase.rpc('process_sale', {
            payload: salePayload,
            items: itemsPayload
        });

        expect(error).toBeNull();
        expect(orderId).toBeDefined();

        console.log('Sale processed. Order ID:', orderId);
    });

    it('should verify STOCK deduction', async () => {
        // 1. Check Ingredient Stock
        // Initial: 1000g. Used: 2 cakes * 100g = 200g. Expected: 800g.
        const { data: ing } = await supabase.from('ingredients').select('current_stock').eq('id', ingredientId).single();
        expect(ing.current_stock).toBe(800);

        // 2. Check Product Stock
        // Initial: 10. Used: 3. Expected: 7.
        const { data: prod } = await supabase.from('products').select('current_stock').eq('id', productId).single();
        expect(prod.current_stock).toBe(7);
    });

    it('should verify FINANCIAL records', async () => {
        // 1. Check Sale
        const { data: sales } = await supabase.from('sales').select('*').like('description', `%PDV%`).order('created_at', { ascending: false }).limit(1);
        const lastSale = sales[0];
        expect(lastSale.amount).toBe(115);
        expect(lastSale.payment_method).toBe('Crédito');

        // 2. Check Expense (Fee)
        const { data: expenses } = await supabase.from('expenses').select('*').eq('category', 'Taxas Financeiras').order('created_at', { ascending: false }).limit(1);
        const lastFee = expenses[0];
        expect(lastFee.amount).toBe(2.50);
        expect(lastFee.description).toContain('Taxa Cartão');
    });
});
