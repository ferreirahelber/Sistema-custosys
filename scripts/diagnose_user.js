
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function diagnose() {
    const email = 'example@gmail.com';
    console.log(`Diagnosing user: ${email}`);

    try {
        // Check auth.users
        const authRes = await pool.query('SELECT id, email, created_at, last_sign_in_at FROM auth.users WHERE email = $1', [email]);
        console.log('--- auth.users ---');
        if (authRes.rows.length === 0) {
            console.log('User NOT FOUND in auth.users');
        } else {
            console.log(authRes.rows[0]);
        }

        // Check public.profiles
        const profileRes = await pool.query('SELECT id, user_id, email, role, name FROM public.profiles WHERE email = $1', [email]);
        console.log('--- public.profiles ---');
        if (profileRes.rows.length === 0) {
            console.log('User NOT FOUND in public.profiles');
        } else {
            console.log(profileRes.rows[0]);
        }

    } catch (err) {
        console.error('Error querying database:', err);
    } finally {
        await pool.end();
    }
}

diagnose();
