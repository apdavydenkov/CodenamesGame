import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generateLocaleDictionaries() {
  const localesDir = path.join(__dirname, '..', 'locales');
  const dictionariesDir = path.join(__dirname, '..', '..', 'public', 'dictionaries');

  // Получаем список локалей из src/locales, исключая master.js
  const locales = (await fs.readdir(localesDir))
    .filter(file => file.endsWith('.js') && file !== 'master.js')
    .map(file => path.basename(file, '.js'));

  // Создаем папку dictionaries если не существует
  await fs.mkdir(dictionariesDir, { recursive: true });

  // Пустая структура словаря для новых локалей (без словарей в ИИ)
  const emptyDictionaries = {
    "dictionaries": []
  };

  // Для каждой локали проверяем существование файла словарей
  for (const locale of locales) {
    const dictionaryFile = path.join(dictionariesDir, `dictionaries_${locale}.json`);
    
    try {
      // Проверяем существование файла
      await fs.access(dictionaryFile);
      console.log(`✓ Dictionary file exists: dictionaries_${locale}.json`);
    } catch {
      // Файл не существует - создаем пустой
      await fs.writeFile(dictionaryFile, JSON.stringify(emptyDictionaries, null, 2));
      console.log(`+ Created empty dictionary: dictionaries_${locale}.json`);
    }
  }

  console.log(`✓ Processed ${locales.length} locale dictionaries: ${locales.join(', ')}`);
}

generateLocaleDictionaries().catch(console.error);