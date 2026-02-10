const fs = require('fs');
require('dotenv').config();

console.log('Testing FS and Dotenv...');
try {
    fs.writeFileSync('fs-test.log', 'Hello from Node\n');
    console.log('File written successfully.');
} catch (e) {
    console.error('File write failed:', e);
}

console.log('SUPABASE_URL:', process.env.VITE_SUPABASE_URL ? 'Defined' : 'Undefined');
