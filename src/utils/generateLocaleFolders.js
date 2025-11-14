import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Функция для загрузки локали
async function loadLocale(localePath) {
  const localeModule = await import(`file:///${localePath.replace(/\\/g, '/')}?t=${Date.now()}`);
  return localeModule.default;
}

// Функция для генерации локализованного index.html
function generateLocalizedHTML(baseHTML, locale, localeData) {
  let html = baseHTML;

  // 1. Заменяем lang="ru" на соответствующую локаль
  html = html.replace(/(<html\s+lang=")ru(")/, `$1${locale}$2`);

  // 2. Заменяем title
  if (localeData.meta?.title) {
    html = html.replace(
      /<title>.*?<\/title>/,
      `<title>${localeData.meta.title}</title>`
    );
  }

  // 3. Заменяем meta description
  if (localeData.meta?.description) {
    html = html.replace(
      /(<meta name="description" content=").*?(")/,
      `$1${localeData.meta.description}$2`
    );
  }

  // 4. Заменяем meta keywords
  if (localeData.meta?.keywords) {
    html = html.replace(
      /(<meta name="keywords" content=").*?(")/,
      `$1${localeData.meta.keywords}$2`
    );
  }

  // 5. Заменяем Open Graph теги
  if (localeData.meta?.ogTitle) {
    html = html.replace(
      /(<meta property="og:title" content=").*?(")/,
      `$1${localeData.meta.ogTitle}$2`
    );
  }
  if (localeData.meta?.ogDescription) {
    html = html.replace(
      /(<meta property="og:description" content=").*?(")/,
      `$1${localeData.meta.ogDescription}$2`
    );
  }

  // 6. Заменяем og:url и canonical
  const siteUrl = 'https://code-names.ru';
  const localeUrl = locale === 'ru' ? siteUrl : `${siteUrl}/${locale}`;
  html = html.replace(
    /(<meta property="og:url" content=").*?(")/,
    `$1${localeUrl}$2`
  );
  html = html.replace(
    /(<link rel="canonical" href=").*?(")/,
    `$1${localeUrl}$2`
  );

  // 7. Заменяем только текст в h1 и p внутри #seo-content
  if (localeData.meta?.seoH1) {
    html = html.replace(/(<h1>).*?(<\/h1>)/, `$1${localeData.meta.seoH1}$2`);
  }
  if (localeData.meta?.seoDescription) {
    html = html.replace(/(<p>).*?(<\/p>)/, `$1${localeData.meta.seoDescription}$2`);
  }

  return html;
}

async function generateLocaleFolders() {
  const localesDir = path.join(__dirname, '..', 'locales');
  const distDir = path.join(__dirname, '..', '..', 'dist');

  // Проверяем существование dist/index.html
  const indexPath = path.join(distDir, 'index.html');
  if (!(await fs.access(indexPath).then(() => true).catch(() => false))) {
    console.error('Error: dist/index.html does not exist. Run build first.');
    process.exit(1);
  }

  // Читаем базовый index.html
  const baseHTML = await fs.readFile(indexPath, 'utf8');

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
  // Проверяем только папки длиной 2 символа (коды локалей)
  for (const dir of existingLocaleDirs) {
    if (dir.length === 2 && !locales.includes(dir)) {
      console.log(`Removing unused locale folder: ${dir}`);
      await fs.rm(path.join(distDir, dir), { recursive: true, force: true });
    }
  }

  // Создаем/обновляем папки для каждой локали и генерируем локализованный index.html
  for (const locale of locales) {
    console.log(`Creating/updating locale folder: ${locale}`);
    const localeDir = path.join(distDir, locale);
    await fs.mkdir(localeDir, { recursive: true });

    // Загружаем данные локали
    const localePath = path.join(localesDir, `${locale}.js`);
    const localeData = await loadLocale(localePath);

    // Генерируем локализованный HTML
    const localizedHTML = generateLocalizedHTML(baseHTML, locale, localeData);

    // Сохраняем локализованный index.html
    await fs.writeFile(path.join(localeDir, 'index.html'), localizedHTML, 'utf8');
  }

  // Генерируем корневой index.html из ru.js
  console.log('Generating root index.html from ru.js');
  const ruLocalePath = path.join(localesDir, 'ru.js');
  const ruLocaleData = await loadLocale(ruLocalePath);
  const rootHTML = generateLocalizedHTML(baseHTML, 'ru', ruLocaleData);
  await fs.writeFile(indexPath, rootHTML, 'utf8');

  console.log(`✓ Generated ${locales.length} locale folders with localized index.html: ${locales.join(', ')}`);
}

generateLocaleFolders().catch(console.error);