import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "./Dialog";
import { useTranslation } from '../hooks/useTranslation';
import { FiX } from "react-icons/fi";
import "../styles/dialogs.css";

const LanguageDialog = ({ isOpen, onClose, onLanguageChange }) => {
  const { t, language, availableLanguages, translations } = useTranslation();

  const handleLanguageSelect = (newLanguage) => {
    onLanguageChange(newLanguage);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <div className="dialog-header-with-close">
          <DialogTitle>{t('languageDialog.title')}</DialogTitle>
          <button className="close-button" onClick={onClose}>
            <FiX size={20} />
          </button>
        </div>
        
        <div className="language-dialog-content">
          <p className="section-label">{t('languageDialog.selectLanguage')}</p>
          
          <div className="language-options">
            {availableLanguages.map((lang) => (
              <button
                key={lang}
                className={`language-option ${language === lang ? 'selected' : ''}`}
                onClick={() => handleLanguageSelect(lang)}
              >
                <span className="language-option-label">
                  {translations[lang]?.language?.name || lang.toUpperCase()}
                </span>
              </button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LanguageDialog;