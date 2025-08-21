import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generateLocaleFolders() {
  const localesDir = path.join(__dirname, '..', 'locales');
  const distDir = path.join(__dirname, '..', '..', 'dist');

  // Проверяем существование dist/index.html
  const indexPath = path.join(distDir, 'index.html');
  if (!(await fs.access(indexPath).then(() => true).catch(() => false))) {
    console.error('Error: dist/index.html does not exist. Run build first.');
    process.exit(1);
  }

  // Получаем список локалей из src/locales, исключая master.js
  const locales = (await fs.readdir(localesDir))
    .filter(file => file.endsWith('.js') && file !== 'master.js')
    .map(file => path.basename(file, '.js'));

  // Получаем текущие папки в dist
  const existsDist = await fs.access(distDir).then(() => true).catch(() => false);
  const existingLocaleDirs = existsDist
    ? await Promise.all(
        (await fs.readdir(distDir)).map(async item => {
          const stat = await fs.stat(path.join(distDir, item));
          return stat.isDirectory() ? item : null;
        })
      ).then(items => items.filter(item => item !== null))
    : [];

  // Удаляем папки локалей, которых больше нет в src/locales
  for (const dir of existingLocaleDirs) {
    if (!locales.includes(dir) && dir !== 'assets' && dir !== 'static') {
      console.log(`Removing unused locale folder: ${dir}`);
      await fs.rm(path.join(distDir, dir), { recursive: true, force: true });
    }
  }

  // Создаем/обновляем папки для каждой локали и копируем index.html
  for (const locale of locales) {
    console.log(`Creating/updating locale folder: ${locale}`);
    const localeDir = path.join(distDir, locale);
    await fs.mkdir(localeDir, { recursive: true });
    await fs.copyFile(indexPath, path.join(localeDir, 'index.html'));
  }

  console.log(`✓ Generated ${locales.length} locale folders: ${locales.join(', ')}`);
}

generateLocaleFolders().catch(console.error);