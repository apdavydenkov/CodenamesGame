import React, { useState } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import LanguageDialog from './LanguageDialog';

const LanguageSwitcher = () => {
  const { language, setLanguage, availableLanguages, translations } = useTranslation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

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

  const openDialog = () => {
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
  };

  const currentLanguageName = translations[language]?.language?.name || language.toUpperCase();

  return (
    <>
      <div className="language-switcher" style={{
        position: 'fixed',
        top: '10px',
        right: '10px',
        zIndex: 49,
        background: 'rgba(0,0,0,0.1)',
        borderRadius: '5px',
        padding: '5px'
      }}>
        <button
          onClick={openDialog}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'white',
            fontSize: '14px',
            cursor: 'pointer',
            padding: '4px 8px',
            borderRadius: '3px'
          }}
          onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
          onMouseLeave={(e) => e.target.style.background = 'transparent'}
        >
          {currentLanguageName}
        </button>
      </div>
      
      <LanguageDialog
        isOpen={isDialogOpen}
        onClose={closeDialog}
        onLanguageChange={handleLanguageChange}
      />
    </>
  );
};

export default LanguageSwitcher;