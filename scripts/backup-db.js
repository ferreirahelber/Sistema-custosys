import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { google } from 'googleapis';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carrega variáveis
dotenv.config({ path: path.join(__dirname, '../.env.local') });
dotenv.config({ path: path.join(__dirname, '../.env') });

const DATABASE_URL = process.env.DATABASE_URL;
const DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;

// Variáveis OAuth
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;

if (!DATABASE_URL) {
  console.error('❌ Erro: DATABASE_URL não definida.');
  process.exit(1);
}

const backupDir = path.join(__dirname, '../backups');
if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir);

// Nomes de arquivo
const date = new Date();
const timestamp = date.toISOString().replace(/T/, '_').replace(/\..+/, '').replace(/:/g, '-');
const fileName = `backup_${timestamp}.sql`;
const filePath = path.join(backupDir, fileName);

console.log('🔄 [SQL] Criando dump do banco...');

const command = `pg_dump "${DATABASE_URL}" -f "${filePath}" --no-owner --no-acl`;

exec(command, async (error, stdout, stderr) => {
  if (error) {
    console.error(`❌ Erro no pg_dump: ${error.message}`);
    return;
  }

  console.log(`✅ [SQL] Arquivo local salvo: ${fileName}`);

  // Upload para Google Drive (Apenas do SQL)
  if (CLIENT_ID && CLIENT_SECRET && REFRESH_TOKEN && DRIVE_FOLDER_ID) {
    console.log('☁️ [SQL] Enviando para Google Drive...');
    try {
      const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET);
      oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

      const drive = google.drive({ version: 'v3', auth: oauth2Client });

      const response = await drive.files.create({
        requestBody: {
          name: fileName,
          parents: [DRIVE_FOLDER_ID],
        },
        media: {
          mimeType: 'application/sql',
          body: fs.createReadStream(filePath),
        },
      });

      console.log(`🚀 [SQL] Upload concluído! ID: ${response.data.id}`);
    } catch (driveError) {
      console.error('❌ Erro no upload:', driveError.message);
    }
  }
});