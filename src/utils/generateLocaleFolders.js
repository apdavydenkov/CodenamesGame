import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import dotenv from 'dotenv';
import { localizeHtml, ROOT_LOCALE } from './localizeHtml.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config();
dotenv.config({ path: '.env.production', override: true });

const BASE_URL = process.env.VITE_SITE_URL;

if (!BASE_URL) {
  console.error('Ошибка: VITE_SITE_URL не определен в переменных окружения');
  process.exit(1);
}

// Папка локали: код языка, при необходимости с регионом (ru, pt-BR, zh-Hans)
const LOCALE_DIR = /^[a-z]{2}(-[A-Za-z]+)?$/;

const loadMeta = async file => (await import(pathToFileURL(file))).default.meta;

async function generateLocaleFolders() {
  const localesDir = path.join(__dirname, '..', 'locales');
  const distDir = path.join(__dirname, '..', '..', 'dist');
  const indexPath = path.join(distDir, 'index.html');

  const template = await fs.readFile(indexPath, 'utf8');

  if (!template.includes('{{')) {
    console.error('Ошибка: в dist/index.html нет плейсхолдеров, сначала нужна сборка');
    process.exit(1);
  }

  const locales = (await fs.readdir(localesDir))
    .filter(file => file.endsWith('.js') && file !== 'master.js')
    .map(file => path.basename(file, '.js'));

  // Папки локалей, которых больше нет в src/locales
  for (const entry of await fs.readdir(distDir, { withFileTypes: true })) {
    if (entry.isDirectory() && LOCALE_DIR.test(entry.name) && !locales.includes(entry.name)) {
      console.log(`Удалена лишняя папка локали: ${entry.name}`);
      await fs.rm(path.join(distDir, entry.name), { recursive: true });
    }
  }

  for (const locale of locales) {
    const meta = await loadMeta(path.join(localesDir, `${locale}.js`));
    const html = localizeHtml(template, { locale, meta, locales, baseUrl: BASE_URL });

    await fs.mkdir(path.join(distDir, locale), { recursive: true });
    await fs.writeFile(path.join(distDir, locale, 'index.html'), html, 'utf8');

    if (locale === ROOT_LOCALE) {
      await fs.writeFile(indexPath, html, 'utf8');
    }
  }

  console.log(`✓ index.html: корень (${ROOT_LOCALE}) и ${locales.length} локалей — ${locales.join(', ')}`);
}

generateLocaleFolders();
