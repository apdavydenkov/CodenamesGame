import master from './src/locales/master.js';
import cs from './src/locales/cs.js';
import de from './src/locales/de.js';
import en from './src/locales/en.js';
import es from './src/locales/es.js';
import fr from './src/locales/fr.js';
import it from './src/locales/it.js';
import ja from './src/locales/ja.js';
import ko from './src/locales/ko.js';
import pt from './src/locales/pt.js';
import vi from './src/locales/vi.js';
import zh from './src/locales/zh.js';
import ru from './src/locales/ru.js';

const locales = {
  cs, de, en, es, fr, it, ja, ko, pt, vi, zh, ru
};

function getAllKeys(obj, prefix = '') {
  const keys = [];
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        keys.push(...getAllKeys(obj[key], fullKey));
      } else {
        keys.push(fullKey);
      }
    }
  }
  return keys;
}

function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined;
  }, obj);
}

const masterKeys = getAllKeys(master);

console.log('🔍 Анализ переводов...\n');

const missingByLocale = {};
const allMissingKeys = new Set();

for (const [lang, localeData] of Object.entries(locales)) {
  const missing = [];

  for (const key of masterKeys) {
    const value = getNestedValue(localeData, key);
    if (value === '' || value === null || value === undefined) {
      missing.push(key);
      allMissingKeys.add(key);
    }
  }

  if (missing.length > 0) {
    missingByLocale[lang] = missing;
  }
}

if (Object.keys(missingByLocale).length === 0) {
  console.log('✓ Все локали полностью заполнены!');
  console.log(`  Всего ключей: ${masterKeys.length}`);
} else {
  console.log('❌ Найдены пустые переводы:\n');

  for (const [lang, keys] of Object.entries(missingByLocale)) {
    console.log(`📍 ${lang.toUpperCase()}: ${keys.length} пустых ключей`);
    keys.forEach(key => console.log(`   - ${key}`));
    console.log('');
  }

  console.log(`\n📊 Итого: ${allMissingKeys.size} уникальных ключей требуют перевода`);
  console.log(`📋 Локалей с пустыми значениями: ${Object.keys(missingByLocale).length}`);
}
