import React from 'react';
import { useTranslation } from '../hooks/useTranslation';

const LanguageSwitcher = () => {
  const { language, setLanguage, availableLanguages, translations } = useTranslation();

  const handleLanguageChange = (newLanguage) => {
    setLanguage(newLanguage);
    
    // Обновляем URL
    const url = new URL(window.location);
    
    // Сохраняем параметры запроса (например, key)
    const params = url.searchParams.toString();
    
    if (newLanguage === 'ru') {
      url.pathname = '/';
    } else {
      url.pathname = `/${newLanguage}/`;
    }
    
    // Восстанавливаем параметры запроса
    if (params) {
      url.search = `?${params}`;
    }
    
    window.history.pushState({}, '', url.toString());
  };

  return (
    <div className="language-switcher" style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      zIndex: 1000,
      background: 'rgba(0,0,0,0.1)',
      borderRadius: '5px',
      padding: '5px'
    }}>
      <select
        value={language}
        onChange={(e) => handleLanguageChange(e.target.value)}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'white',
          fontSize: '14px'
        }}
      >
        {availableLanguages.map((lang) => (
          <option key={lang} value={lang} style={{ color: 'black' }}>
            {translations[lang]?.language?.name || lang.toUpperCase()}
          </option>
        ))}
      </select>
    </div>
  );
};

export default LanguageSwitcher;