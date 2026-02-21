
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars from .env file directly (bypass .env.local for script simplicity if needed, but try both)
dotenv.config({ path: path.join(__dirname, '../.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('❌ Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function main() {
    const email = 'example@gmail.com';
    const password = 'password123';

    console.log(`🔍 Checking user: ${email}`);

    // 1. Check Auth User
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
        console.error('❌ Error listing users:', listError);
        return;
    }

    let user = users.find(u => u.email === email);

    if (!user) {
        console.log('✨ User not found in Auth. Creating...');
        const { data, error: createError } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { name: 'Test Admin' }
        });

        if (createError) {
            console.error('❌ Error creating user:', createError);
            return;
        }
        user = data.user;
        console.log('✅ Auth User created:', user.id);
    } else {
        console.log('ℹ️ Auth User already exists:', user.id);
        // Optional: Update password to ensure it matches
        const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
            password: password
        });
        if (updateError) {
            console.error('⚠️ Could not update password:', updateError);
        } else {
            console.log('✅ Password ensured.');
        }
    }

    // 2. Check/Fix Profile
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email)
        .maybeSingle();

    if (profileError) {
        console.error('❌ Error fetching profile:', profileError);
        return;
    }

    if (profile) {
        console.log(`ℹ️ Profile found. Current Role: ${profile.role}, UserID: ${profile.user_id}`);

        // Force Update
        const { error: updateProfileError } = await supabase
            .from('profiles')
            .update({
                user_id: user.id,
                role: 'admin'
            })
            .eq('email', email);

        if (updateProfileError) {
            console.error('❌ Error updating profile:', updateProfileError);
        } else {
            console.log('✅ Profile linked to Auth User and promoted to Admin.');
        }

    } else {
        console.log('⚠️ Profile not found. Inserting new profile...');
        const { error: insertError } = await supabase
            .from('profiles')
            .insert({
                user_id: user.id,
                email: email,
                role: 'admin',
                name: 'Test Admin'
            });

        if (insertError) {
            console.error('❌ Error inserting profile:', insertError);
        } else {
            console.log('✅ Profile created and linked.');
        }
    }
}

main().catch(console.error);
