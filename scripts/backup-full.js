import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { google } from 'googleapis';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env.local') });
dotenv.config({ path: path.join(__dirname, '../.env') });

const DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;

const rootDir = path.join(__dirname, '../');
const backupDir = path.join(rootDir, 'backups');

if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir);

const date = new Date();
const timestamp = date.toISOString().replace(/T/, '_').replace(/\..+/, '').replace(/:/g, '-');
const zipFileName = `FULL_SYSTEM_${timestamp}.zip`;
const zipFilePath = path.join(backupDir, zipFileName);

console.log('========================================');
console.log('🚀 INICIANDO BACKUP COMPLETO DO SISTEMA');
console.log('========================================');

// 1. CHAMA O SCRIPT DE CIMA (backup-db.js)
try {
  console.log('Step 1: Gerando dump do Banco...');
  execSync('npm run db:backup', { stdio: 'inherit', cwd: rootDir });
  console.log('✅ Banco processado.');
} catch (err) {
  console.error('❌ Erro no backup do banco.');
}

// 2. CRIA O ZIP
console.log('\nStep 2: Compactando arquivos do sistema...');
const output = fs.createWriteStream(zipFilePath);
const archive = archiver('zip', { zlib: { level: 9 } });

const zipPromise = new Promise((resolve, reject) => {
  output.on('close', resolve);
  archive.on('error', reject);
});

archive.pipe(output);

archive.glob('**/*', {
  cwd: rootDir,
  ignore: [
    'node_modules/**',
    'dist/**',
    '.git/**',
    'backups/*.zip',
    '*.log'
  ]
});

archive.finalize();

// 3. ENVIA O ZIP
zipPromise.then(async () => {
  const sizeMB = (archive.pointer() / 1024 / 1024).toFixed(2);
  console.log(`✅ Arquivo ZIP criado: ${zipFilePath} (${sizeMB} MB)`);

  if (CLIENT_ID && CLIENT_SECRET && REFRESH_TOKEN && DRIVE_FOLDER_ID) {
    console.log('\nStep 3: Enviando ZIP Completo para o Drive...');
    try {
      const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET);
      oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });
      const drive = google.drive({ version: 'v3', auth: oauth2Client });
      const response = await drive.files.create({
        requestBody: { name: zipFileName, parents: [DRIVE_FOLDER_ID] },
        media: { mimeType: 'application/zip', body: fs.createReadStream(zipFilePath) }
      });
      console.log(`🚀 SUCESSO! Backup Completo salvo. ID: ${response.data.id}`);
    } catch (error) {
      console.error('❌ Erro no upload:', error.message);
    }
  }
}).catch(err => console.error('❌ Erro zip:', err));