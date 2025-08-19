import React, { createContext, useState, useEffect } from 'react';

const LanguageContext = createContext();

// Автоматическое подключение всех локалей
const loadTranslations = () => {
  const translations = {};
  const localeFiles = import.meta.glob('../locales/*.js', { eager: true });
  
  for (const path in localeFiles) {
    const localeCode = path.match(/\/([^/]+)\.js$/)?.[1];
    if (localeCode) {
      translations[localeCode] = localeFiles[path].default;
    }
  }
  
  return translations;
};

const translations = loadTranslations();

const LanguageProvider = ({ children }) => {
  // Определяем язык из URL или localStorage
  const getInitialLanguage = () => {
    // Сначала проверяем URL
    const path = window.location.pathname;
    const urlLang = path.split('/')[1];
    
    if (urlLang && Object.keys(loadTranslations()).includes(urlLang)) {
      return urlLang;
    }
    
    // Если в URL нет языка, проверяем localStorage
    const savedLang = localStorage.getItem('language');
    if (savedLang && Object.keys(loadTranslations()).includes(savedLang)) {
      return savedLang;
    }
    
    // По умолчанию русский
    return 'ru';
  };

  const [language, setLanguage] = useState(getInitialLanguage);

  // Сохраняем выбранный язык в localStorage
  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  // Функция для получения значения по точечной нотации
  const getNestedTranslation = (obj, path) => {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : null;
    }, obj);
  };

  // Функция перевода
  const t = (key) => {
    const translation = getNestedTranslation(translations[language], key);
    
    // Fallback на master, если перевода нет или он пустой
    if ((!translation || translation === "") && translations['master']) {
      const masterTranslation = getNestedTranslation(translations['master'], key);
      return masterTranslation || key;
    }
    
    return translation || key;
  };

  const value = {
    language,
    setLanguage,
    t,
    availableLanguages: Object.keys(translations).filter(lang => lang !== 'master'),
    translations
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export { LanguageContext, LanguageProvider };