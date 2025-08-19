import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Загружаем переменные окружения
dotenv.config();

const localesPath = path.join(__dirname, '../locales');
const sitemapsPath = path.join(__dirname, '../../public/sitemaps');
const publicSitemapsPath = path.join(__dirname, '../../public/sitemaps');

// Базовый URL сайта из переменных окружения
const BASE_URL = process.env.VITE_SITE_URL;

if (!BASE_URL) {
  console.error('Ошибка: VITE_SITE_URL не определен в переменных окружения');
  process.exit(1);
}

// Функция для получения всех доступных локалей
function getAvailableLocales() {
  const localeFiles = fs.readdirSync(localesPath)
    .filter(file => file.endsWith('.js') && file !== 'master.js')
    .map(file => file.replace('.js', ''));
  
  return localeFiles;
}

// Функция для создания карты сайта для конкретной локали
function generateLocaleSitemap(locale) {
  const now = new Date().toISOString();
  
  const urls = [
    {
      loc: locale === 'ru' ? BASE_URL : `${BASE_URL}/${locale}`,
      lastmod: now,
      changefreq: 'weekly',
      priority: '1.0'
    }
    // Здесь можно добавить другие страницы для каждой локали
    // Например: about, rules, etc.
  ];

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"';
  xml += ' xmlns:xhtml="http://www.w3.org/1999/xhtml">\n';
  
  urls.forEach(url => {
    xml += '  <url>\n';
    xml += `    <loc>${url.loc}</loc>\n`;
    xml += `    <lastmod>${url.lastmod}</lastmod>\n`;
    xml += `    <changefreq>${url.changefreq}</changefreq>\n`;
    xml += `    <priority>${url.priority}</priority>\n`;
    
    // Добавляем альтернативные языковые версии
    const locales = getAvailableLocales();
    locales.forEach(altLocale => {
      const altUrl = altLocale === 'ru' ? BASE_URL : `${BASE_URL}/${altLocale}`;
      xml += `    <xhtml:link rel="alternate" hreflang="${altLocale}" href="${altUrl}" />\n`;
    });
    
    xml += '  </url>\n';
  });
  
  xml += '</urlset>';
  
  return xml;
}

// Функция для создания основной карты сайта (индекс карт сайта)
function generateSitemapIndex() {
  const locales = getAvailableLocales();
  const now = new Date().toISOString();
  
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  
  locales.forEach(locale => {
    xml += '  <sitemap>\n';
    xml += `    <loc>${BASE_URL}/sitemaps/sitemap-${locale}.xml</loc>\n`;
    xml += `    <lastmod>${now}</lastmod>\n`;
    xml += '  </sitemap>\n';
  });
  
  xml += '</sitemapindex>';
  
  return xml;
}

// Основная функция
function generateSitemaps() {
  try {
    // Создаем папку для карт сайта, если её нет
    if (!fs.existsSync(sitemapsPath)) {
      fs.mkdirSync(sitemapsPath, { recursive: true });
    }
    
    const locales = getAvailableLocales();
    
    // Генерируем карты сайта для каждой локали
    locales.forEach(locale => {
      const sitemapContent = generateLocaleSitemap(locale);
      const filename = `sitemap-${locale}.xml`;
      const filepath = path.join(sitemapsPath, filename);
      
      fs.writeFileSync(filepath, sitemapContent);
      console.log(`✓ Создана карта сайта: ${filename}`);
    });
    
    // Генерируем основную карту сайта (индекс)
    const sitemapIndexContent = generateSitemapIndex();
    const indexPath = path.join(publicSitemapsPath, 'sitemap.xml');
    
    fs.writeFileSync(indexPath, sitemapIndexContent);
    console.log('✓ Создана основная карта сайта: sitemaps/sitemap.xml');
    
    console.log(`\nВсего создано карт сайта: ${locales.length}`);
    console.log(`Доступные локали: ${locales.join(', ')}`);
    
  } catch (error) {
    console.error('Ошибка при генерации карт сайта:', error);
    process.exit(1);
  }
}

// Запускаем генерацию
generateSitemaps();