const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
    console.log('Checking Ingredients...');
    const { data: ingredients, error: ingError } = await supabase
        .from('ingredients')
        .select('*');

    if (ingError) {
        console.error('Error fetching ingredients:', ingError);
    } else {
        console.log(`Found ${ingredients?.length} ingredients.`);
        if (ingredients && ingredients.length > 0) {
            console.log('Sample ingredient:', ingredients[0].name);
        }
    }

    console.log('\nChecking Recipes...');
    const { data: recipes, error: recError } = await supabase
        .from('recipes')
        .select('*');

    if (recError) {
        console.error('Error fetching recipes:', recError);
    } else {
        console.log(`Found ${recipes?.length} recipes.`);
    }
}

checkData();
