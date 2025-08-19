import { useEffect } from 'react';
import { useTranslation } from '../hooks/useTranslation';

const MetaTags = () => {
  const { t, language } = useTranslation();

  useEffect(() => {
    // Обновляем title
    document.title = t('meta.title');

    // Обновляем lang атрибут html
    document.documentElement.lang = language;

    // Обновляем meta теги
    const updateMetaTag = (name, content, attribute = 'name') => {
      let meta = document.querySelector(`meta[${attribute}="${name}"]`);
      if (meta) {
        meta.setAttribute('content', content);
      } else {
        meta = document.createElement('meta');
        meta.setAttribute(attribute, name);
        meta.setAttribute('content', content);
        document.head.appendChild(meta);
      }
    };

    // Основные meta теги
    updateMetaTag('description', t('meta.description'));
    updateMetaTag('keywords', t('meta.keywords'));
    updateMetaTag('author', t('meta.author'));
    updateMetaTag('application-name', t('meta.applicationName'));

    // Open Graph теги
    updateMetaTag('og:title', t('meta.ogTitle'), 'property');
    updateMetaTag('og:description', t('meta.ogDescription'), 'property');
    updateMetaTag('og:url', language === 'ru' ? import.meta.env.VITE_SITE_URL : `${import.meta.env.VITE_SITE_URL}/${language}`, 'property');

    // Twitter теги
    updateMetaTag('twitter:title', t('meta.twitterTitle'), 'property');
    updateMetaTag('twitter:description', t('meta.twitterDescription'), 'property');
    updateMetaTag('twitter:url', language === 'ru' ? import.meta.env.VITE_SITE_URL : `${import.meta.env.VITE_SITE_URL}/${language}`, 'property');

    // Canonical URL
    let canonical = document.querySelector('link[rel="canonical"]');
    const canonicalUrl = language === 'ru' ? import.meta.env.VITE_SITE_URL : `${import.meta.env.VITE_SITE_URL}/${language}`;
    if (canonical) {
      canonical.href = canonicalUrl;
    } else {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      canonical.href = canonicalUrl;
      document.head.appendChild(canonical);
    }

    // Обновляем noscript текст
    const noscriptTextDiv = document.querySelector('#noscript-text');
    if (noscriptTextDiv) {
      noscriptTextDiv.textContent = t('meta.noScript');
    }

    // Обновляем скрытый SEO контент
    const seoDiv = document.querySelector('#seo-content');
    if (seoDiv) {
      const h1 = seoDiv.querySelector('h1');
      const p = seoDiv.querySelector('p');
      if (h1) h1.textContent = t('meta.seoH1');
      if (p) p.textContent = t('meta.seoDescription');
    }

    // Добавляем hreflang теги
    const addHreflangTag = (hreflang, href) => {
      let link = document.querySelector(`link[hreflang="${hreflang}"]`);
      if (link) {
        link.href = href;
      } else {
        link = document.createElement('link');
        link.rel = 'alternate';
        link.hreflang = hreflang;
        link.href = href;
        document.head.appendChild(link);
      }
    };

    // Добавляем hreflang для всех доступных языков
    addHreflangTag('ru', import.meta.env.VITE_SITE_URL);
    addHreflangTag('en', `${import.meta.env.VITE_SITE_URL}/en`);
    addHreflangTag('x-default', import.meta.env.VITE_SITE_URL);

  }, [t, language]);

  return null;
};

export default MetaTags;