import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import master from './src/locales/master.js';

const localeFiles = {
  cs: { name: 'Czech', file: './src/locales/cs.js' },
  de: { name: 'German', file: './src/locales/de.js' },
  en: { name: 'English', file: './src/locales/en.js' },
  es: { name: 'Spanish', file: './src/locales/es.js' },
  fr: { name: 'French', file: './src/locales/fr.js' },
  it: { name: 'Italian', file: './src/locales/it.js' },
  ja: { name: 'Japanese', file: './src/locales/ja.js' },
  ko: { name: 'Korean', file: './src/locales/ko.js' },
  pt: { name: 'Portuguese', file: './src/locales/pt.js' },
  vi: { name: 'Vietnamese', file: './src/locales/vi.js' },
  zh: { name: 'Chinese', file: './src/locales/zh.js' },
  ru: { name: 'Russian', file: './src/locales/ru.js' }
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

function setNestedValue(obj, path, value) {
  const keys = path.split('.');
  const lastKey = keys.pop();
  const target = keys.reduce((current, key) => {
    if (!current[key]) current[key] = {};
    return current[key];
  }, obj);
  target[lastKey] = value;
}

async function translateText(text, targetLang) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY || '',
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `Translate this text from Russian to ${targetLang}. Return ONLY the translation, no explanations:\n\n"${text}"`
      }]
    })
  });

  if (!response.ok) {
    throw new Error(`Translation API error: ${response.status}`);
  }

  const data = await response.json();
  return data.content[0].text.trim().replace(/^["']|["']$/g, '');
}

async function translateMissingKeys() {
  console.log('🔄 Начинаю автоматический перевод...\n');

  const masterKeys = getAllKeys(master);

  for (const [langCode, langInfo] of Object.entries(localeFiles)) {
    console.log(`📍 Обрабатываю ${langInfo.name} (${langCode})...`);

    // Загружаем текущую локаль
    const localeModule = await import(langInfo.file);
    const localeData = JSON.parse(JSON.stringify(localeModule.default));

    let translatedCount = 0;
    const translations = [];

    // Находим пустые ключи
    for (const key of masterKeys) {
      const currentValue = getNestedValue(localeData, key);
      if (currentValue === '' || currentValue === null || currentValue === undefined) {
        const masterValue = getNestedValue(master, key);

        if (masterValue) {
          try {
            const translated = await translateText(masterValue, langInfo.name);
            setNestedValue(localeData, key, translated);
            translations.push({ key, original: masterValue, translated });
            translatedCount++;
            console.log(`   ✓ ${key}: "${translated}"`);

            // Задержка между запросами
            await new Promise(resolve => setTimeout(resolve, 500));
          } catch (error) {
            console.error(`   ✗ Ошибка перевода ${key}: ${error.message}`);
          }
        }
      }
    }

    // Сохраняем файл
    if (translatedCount > 0) {
      const filePath = path.resolve(__dirname, langInfo.file);
      const fileContent = `export default ${JSON.stringify(localeData, null, 2)};\n`;
      fs.writeFileSync(filePath, fileContent, 'utf8');
      console.log(`   💾 Сохранено ${translatedCount} переводов\n`);
    } else {
      console.log(`   ✓ Все ключи уже заполнены\n`);
    }
  }

  console.log('✅ Перевод завершён!');
}

translateMissingKeys().catch(console.error);
