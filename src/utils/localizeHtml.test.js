import { describe, it, expect } from 'vitest';
import { localizeHtml } from './localizeHtml.js';

const meta = {
  title: 'Кодовые имена',
  description: 'Описание',
  keywords: 'игра, слова',
  ogTitle: 'Кодовые имена',
  ogDescription: 'Описание для соцсетей',
  seoH1: 'Заголовок',
  seoDescription: 'Текст',
};

const localize = (template, overrides = {}) =>
  localizeHtml(template, { locale: 'en', meta, locales: ['ru', 'en'], baseUrl: 'https://site.tld', ...overrides });

describe('localizeHtml', () => {
  it('подставляет значения локали', () => {
    expect(localize('<title>{{title}}</title>')).toBe('<title>Кодовые имена</title>');
  });

  it('даёт локали свой адрес, а корневой — адрес сайта', () => {
    expect(localize('{{url}}')).toBe('https://site.tld/en');
    expect(localize('{{url}}', { locale: 'ru' })).toBe('https://site.tld');
  });

  it('экранирует кавычки и амперсанд', () => {
    const html = localize('content="{{title}}"', { meta: { ...meta, title: 'Кино "Дюна" & чай' } });
    expect(html).toBe('content="Кино &quot;Дюна&quot; &amp; чай"');
  });

  it('перечисляет языковые версии и x-default', () => {
    const links = localize('{{alternates}}').split('\n');
    expect(links).toHaveLength(3);
    expect(links[0]).toContain('hreflang="ru" href="https://site.tld"');
    expect(links[1]).toContain('hreflang="en" href="https://site.tld/en"');
    expect(links[2]).toContain('hreflang="x-default" href="https://site.tld"');
  });

  it('без списка локалей не выводит ссылок на версии', () => {
    expect(localize('{{alternates}}', { locales: [] })).toBe('');
  });

  it('падает, если плейсхолдер нечем заполнить', () => {
    expect(() => localize('{{title}}', { meta: {} })).toThrow('{{title}}');
  });

  it('падает на неизвестном плейсхолдере', () => {
    expect(() => localize('{{author}}')).toThrow('{{author}}');
  });
});
