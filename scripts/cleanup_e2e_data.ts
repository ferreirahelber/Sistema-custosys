import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Fix for loading .env correctly if script is run from project root or scripts folder
// Try standard config first, then explicit path
dotenv.config();
if (!process.env.VITE_SUPABASE_URL) {
    dotenv.config({ path: path.resolve(__dirname, '../.env') });
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
// Prefer Service Role Key for cleanup if available, otherwise Anon
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || (!supabaseServiceKey && !supabaseAnonKey)) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

// Use Service Role if available to bypass RLS
const supabase = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey!);

async function cleanup() {
    console.log(`Starting E2E data cleanup using ${supabaseServiceKey ? 'SERVICE_ROLE' : 'ANON'} key...`);

    // 1. Delete Recipes
    const { error: recipeError } = await supabase
        .from('recipes')
        .delete()
        .ilike('name', 'Bolo E2E %');

    if (recipeError) console.error('Error deleting recipes:', recipeError);
    else console.log('Recipes cleanup command executed.');

    // 2. Delete Ingredients
    const { error: ingredientError } = await supabase
        .from('ingredients')
        .delete()
        .ilike('name', 'Farinha E2E %');

    if (ingredientError) console.error('Error deleting ingredients:', ingredientError);
    else console.log('Ingredients cleanup command executed.');

    // 3. Delete Products (Resale)
    const { error: productError } = await supabase
        .from('products')
        .delete()
        .ilike('name', 'Coca E2E %');

    if (productError) console.error('Error deleting products:', productError);
    else console.log('Products cleanup command executed.');

    // 4. Delete Test Users and related data
    // If using Service Role, we can query auth.users directly or profiles
    // If Anon, we depend on RLS. 

    // Strategy: 
    // A. Try to find users in 'profiles' by email pattern
    // B. If Service Role, also look in auth.users

    let userIds: string[] = [];

    // Step A: Check Profiles
    const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, email')
        .ilike('email', 'vendedor_test_%'); // Broader filter

    if (profileError) {
        console.error('Error fetching profiles:', profileError);
    } else if (profiles) {
        // Double check in js
        const targetProfiles = profiles.filter(p => p.email?.includes('vendedor_test_'));
        targetProfiles.forEach(p => userIds.push(p.id));
        console.log(`Found ${targetProfiles.length} profiles matching pattern.`);
    }

    // Step B: Check Auth Users (if service role)
    if (supabaseServiceKey) {
        const { data: authUsers, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
        if (!listError && authUsers?.users) {
            // CAST TO ANY TO AVOID TS ERROR
            const users = authUsers.users as any[];
            const targetAuthUsers = users.filter(u => u.email?.includes('vendedor_test_'));
            console.log(`Found ${targetAuthUsers.length} auth users matching pattern.`);

            targetAuthUsers.forEach(u => {
                if (!userIds.includes(u.id)) userIds.push(u.id);
            });
        }
    }

    // Remove duplicates
    userIds = [...new Set(userIds)];
    console.log(`Total unique Test User IDs to cleanup: ${userIds.length}`);

    if (userIds.length > 0) {
        // 4a. Delete Sales Items
        // We need sale IDs first
        const { data: sales } = await supabase.from('sales').select('id').in('user_id', userIds);
        const saleIds = sales?.map(s => s.id) || [];

        if (saleIds.length > 0) {
            await supabase.from('sale_items').delete().in('sale_id', saleIds);
            console.log(`Deleted items for ${saleIds.length} sales.`);
            await supabase.from('sales').delete().in('id', saleIds);
            console.log(`Deleted ${saleIds.length} sales.`);
        }

        // 4b. Delete Cash Sessions and related Orders
        const { data: sessions } = await supabase.from('cash_sessions').select('id').in('user_id', userIds);
        const sessionIds = sessions?.map(s => s.id) || [];

        if (sessionIds.length > 0) {
            // 4b-1. Delete Orders associated with sessions
            const { data: orders } = await supabase.from('orders').select('id').in('session_id', sessionIds);
            const orderIds = orders?.map(o => o.id) || [];

            if (orderIds.length > 0) {
                // Delete order items first
                const { error: orderItemsError } = await supabase.from('order_items').delete().in('order_id', orderIds);
                if (orderItemsError) console.error('Error deleting order items:', orderItemsError);
                else console.log(`Deleted order items for ${orderIds.length} orders.`);

                // Delete orders
                const { error: ordersError } = await supabase.from('orders').delete().in('id', orderIds);
                if (ordersError) console.error('Error deleting orders:', ordersError);
                else console.log(`Deleted ${orderIds.length} orders.`);
            }

            // 4b-2. Delete Sessions
            // Try valid table for movements if exists, otherwise just session
            // Assuming no separate movements table or Cascade. 
            const { error: sessionDelError } = await supabase.from('cash_sessions').delete().in('id', sessionIds);
            if (sessionDelError) console.error('Error deleting sessions:', sessionDelError);
            else console.log(`Deleted ${sessionIds.length} cash sessions.`);
        }

        // 4c. Delete Profiles
        const { error: profileDelError } = await supabase.from('profiles').delete().in('id', userIds);
        if (profileDelError) console.error('Error deleting profiles:', profileDelError);
        else console.log(`Deleted profiles for ${userIds.length} users.`);

        // 4d. Delete Auth Users (Service Role only)
        if (supabaseServiceKey) {
            for (const uid of userIds) {
                const { error: authDelError } = await supabase.auth.admin.deleteUser(uid);
                if (authDelError) console.error(`Failed to delete auth user ${uid}:`, authDelError.message);
                else console.log(`Deleted auth user ${uid}`);
            }
        } else {
            console.log('Skipping Auth User deletion (No Service Role Key). Profiles were deleted (if permissions allowed).');
        }

    } else {
        console.log('No test users found to cleanup.');
    }

    console.log('Cleanup finished.');
}

cleanup().catch(err => console.error(err));
