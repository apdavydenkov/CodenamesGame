import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localesPath = path.join(__dirname, '../locales');

// Рекурсивная функция для получения всех ключей из объекта
function getAllKeys(obj, prefix = '') {
  const keys = [];
  
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      
      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        // Рекурсивно обрабатываем вложенные объекты
        keys.push(...getAllKeys(obj[key], fullKey));
      } else {
        // Добавляем конечный ключ
        keys.push(fullKey);
      }
    }
  }
  
  return keys;
}

// Рекурсивная функция для установки значения по пути
function setNestedValue(obj, path, value) {
  const keys = path.split('.');
  let current = obj;
  
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key];
  }
  
  const lastKey = keys[keys.length - 1];
  if (!(lastKey in current)) {
    current[lastKey] = value;
  }
}

// Функция для получения значения по пути
function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined;
  }, obj);
}

// Функция для удаления значения по пути
function deleteNestedValue(obj, path) {
  const keys = path.split('.');
  let current = obj;
  
  for (let i = 0; i < keys.length - 1; i++) {
    if (!current[keys[i]]) return;
    current = current[keys[i]];
  }
  
  delete current[keys[keys.length - 1]];
}

async function syncLocales() {
  console.log('Синхронизация локалей с master.js...');
  
  // Загружаем master.js
  const masterPath = path.join(localesPath, 'master.js');
  if (!fs.existsSync(masterPath)) {
    console.error('Файл master.js не найден!');
    return;
  }
  
  const masterModule = await import(`file:///${masterPath.replace(/\\/g, '/')}`);
  const masterTranslations = masterModule.default;
  
  // Получаем все ключи из master
  const masterKeys = getAllKeys(masterTranslations);
  console.log(`Найдено ${masterKeys.length} ключей в master.js`);
  
  // Находим все файлы локалей (кроме master.js)
  const localeFiles = fs.readdirSync(localesPath)
    .filter(file => file.endsWith('.js') && file !== 'master.js')
    .map(file => file.replace('.js', ''));
  
  console.log(`Найдено локалей: ${localeFiles.join(', ')}`);
  
  // Синхронизируем каждую локаль
  for (const locale of localeFiles) {
    const localeFilePath = path.join(localesPath, `${locale}.js`);
    
    // Загружаем текущую локаль
    const localeModule = await import(`file:///${localeFilePath.replace(/\\/g, '/')}?t=${Date.now()}`);
    const currentTranslations = JSON.parse(JSON.stringify(localeModule.default));
    
    let addedKeys = 0;
    let hasChanges = false;
    
    // Получаем ключи текущей локали
    const currentKeys = getAllKeys(currentTranslations);
    
    // Удаляем ключи, которых нет в master
    const keysToRemove = currentKeys.filter(key => !masterKeys.includes(key));
    if (keysToRemove.length > 0) {
      hasChanges = true;
      for (const key of keysToRemove) {
        deleteNestedValue(currentTranslations, key);
      }
    }
    
    // Проверяем каждый ключ из master
    for (const key of masterKeys) {
      const existingValue = getNestedValue(currentTranslations, key);
      
      if (existingValue === undefined) {
        // Добавляем отсутствующий ключ как пустую строку
        setNestedValue(currentTranslations, key, "");
        addedKeys++;
        hasChanges = true;
      }
    }
    
    if (hasChanges) {
      // Записываем обновленную локаль обратно в файл
      const fileContent = `export default ${JSON.stringify(currentTranslations, null, 2)};`;
      fs.writeFileSync(localeFilePath, fileContent, 'utf8');
      console.log(`✓ ${locale}.js: добавлено ${addedKeys} новых ключей`);
    } else {
      console.log(`✓ ${locale}.js: синхронизация не требуется`);
    }
  }
  
  console.log('Синхронизация завершена!');
}

// Запускаем синхронизацию
syncLocales().catch(console.error);