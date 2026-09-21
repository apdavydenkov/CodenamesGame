const escapeHtml = text => String(text)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

// Корневой index.html отдаётся на этой локали, у остальных свои папки
export const ROOT_LOCALE = 'ru';

const pageUrl = (baseUrl, locale) =>
  locale === ROOT_LOCALE ? baseUrl : `${baseUrl}/${locale}`;

// Ссылки на языковые версии страницы
const alternate = (code, href) => `  <link rel="alternate" hreflang="${code}" href="${href}" />`;

const alternates = (baseUrl, locales) => locales
  .map(code => alternate(code, pageUrl(baseUrl, code)))
  .concat(locales.length ? alternate('x-default', baseUrl) : [])
  .join('\n');

// Заполняет плейсхолдеры {{name}} в шаблоне index.html
export function localizeHtml(template, { locale, meta, locales, baseUrl }) {
  const values = {
    lang: locale,
    url: pageUrl(baseUrl, locale),
    siteUrl: baseUrl,
    title: meta.title,
    description: meta.description,
    keywords: meta.keywords,
    ogTitle: meta.ogTitle,
    ogDescription: meta.ogDescription,
    seoH1: meta.seoH1,
    seoDescription: meta.seoDescription,
  };

  return template
    .replace('{{alternates}}', alternates(baseUrl, locales))
    .replace(/\{\{(\w+)\}\}/g, (_, key) => {
      if (values[key] === undefined) {
        throw new Error(`Плейсхолдер {{${key}}} нечем заполнить: локаль ${locale}`);
      }
      return escapeHtml(values[key]);
    });
}
