import { useContext } from 'react';
import { LanguageContext } from '../contexts/LanguageContext';

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }

  const { t, language, setLanguage, availableLanguages, translations } = context;

  return {
    t,
    language,
    setLanguage,
    availableLanguages,
    translations
  };
};