
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

console.log('CWD:', process.cwd());
console.log('ENV keys:', Object.keys(process.env).filter(k => k.includes('SUPA')));
console.log('Is URL present:', !!supabaseUrl);
console.log('Is Key present:', !!supabaseKey);

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

// Use Service Role Key if available to bypass RLS, otherwise Anon Key might not allow update if RLS forbids it.
// Assuming we have service role key in .env or .env.local?
// If not, we try with what we have.

const supabase = createClient(supabaseUrl, supabaseKey);

import fs from 'fs';

const log = (msg) => {
    console.log(msg);
    fs.appendFileSync('role-fix.log', msg + '\n');
};

async function fixRole() {
    log('Checking user role...');

    const email = 'helberflopes@gmail.com';

    // Get user ID from profiles (or auth if possible, but admin api requires service key)
    // We can try to select from profiles matches email.

    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email);

    if (error) {
        log('Error fetching profile: ' + JSON.stringify(error));
        return;
    }

    if (!profiles || profiles.length === 0) {
        log('Profile not found for ' + email);
        return;
    }

    const profile = profiles[0];
    log('Current profile: ' + JSON.stringify(profile));

    if (profile.role !== 'admin') {
        log(`Updating role from ${profile.role} to admin...`);
        const { error: updateError } = await supabase
            .from('profiles')
            .update({ role: 'admin' })
            .eq('id', profile.id);

        if (updateError) {
            log('Error updating role: ' + JSON.stringify(updateError));
        } else {
            log('Role updated successfully.');
        }
    } else {
        log('User is already admin.');
    }
}

fixRole();
