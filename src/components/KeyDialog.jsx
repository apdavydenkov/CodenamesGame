import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./Dialog";
import { Button } from "./Button";
import { Input } from "./Input";
import { FiDelete, FiPlus } from "react-icons/fi";
import Notification from "./Notification";
import { useTranslation } from "../hooks/useTranslation";
import { isValidKeyFormat, generateNewKey } from "../utils/gameGenerator";
import "../styles/dialogs.css";

const KeyDialog = ({
  isOpen,
  onClose,
  onKeySubmit,
  currentKey,
  onBack,
  currentDictionary,
}) => {
  const { t } = useTranslation();
  const [key, setKey] = useState(currentKey || "");
  const [isValidInput, setIsValidInput] = useState(true);
  const [showNotification, setShowNotification] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    setKey(currentKey || "");
    setIsValidInput(currentKey ? isValidKeyFormat(currentKey) : true);
    setErrorMessage(""); // Очищаем ошибку при изменении ключа
  }, [currentKey, isOpen]);

  const handleKeyInput = (e) => {
    const value = e.target.value.toUpperCase().replace(/[^А-ЯЁ]/g, "");
    const cleanValue = value.slice(0, 7);
    setKey(cleanValue);
    setIsValidInput(cleanValue.length !== 7 || isValidKeyFormat(cleanValue));
    setErrorMessage(""); // Очищаем ошибку при вводе
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(key);
      setShowNotification(true);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const formattedText = text
        .toUpperCase()
        .replace(/[^А-ЯЁ]/g, "")
        .slice(0, 7);
      setKey(formattedText);
      setIsValidInput(
        formattedText.length !== 7 || isValidKeyFormat(formattedText)
      );
    } catch (err) {
      console.error("Failed to paste:", err);
    }
  };

  const handleClear = () => {
    setKey("");
    setIsValidInput(true);
  };

  const handleNewKey = () => {
    // ТОЛЬКО обычные ключи! ИИ-ключи генерируются в MenuDialog
    if (currentDictionary && currentDictionary.id !== "ai_dictionary") {
      // Находим индекс текущего словаря среди обычных словарей
      const regularDictionaries = dictionaries.filter(d => d.id !== "ai_dictionary");
      const dictionaryIndex = regularDictionaries.findIndex(d => d.id === currentDictionary.id);
      const newKey = generateNewKey(dictionaryIndex);
      setKey(newKey);
      setIsValidInput(true);
      setErrorMessage(""); // Очищаем ошибку
    } else if (currentDictionary && currentDictionary.id === "ai_dictionary") {
      setErrorMessage(t('keyDialog.aiGameNotFound'));
    }
  };

  const handleCreate = async () => {
    if (!isValidInput || !key || key.length !== 7 || !isValidKeyFormat(key)) {
      return;
    }

    
    try {
      await onKeySubmit(key);
      onClose();
    } catch (error) {
      // Если ошибка при создании игры
      if (error.message && error.message.includes(t('keyDialog.aiGameNotFound'))) {
        setErrorMessage(t('keyDialog.aiGameNotFound'));
      } else {
        setErrorMessage(t('keyDialog.invalidKey'));
      }
    }
  };

  const isAIKey = key[6] === 'Н';

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="dialog-content">
          <DialogHeader className="dialog-header">
            <DialogTitle>{t('keyDialog.title')}</DialogTitle>
			<DialogDescription>
			 {t('keyDialog.description')}
			</DialogDescription>
          </DialogHeader>

          <div className="key-content">
            <div>
              <div className="input-container">
                <Input
                  value={key}
                  onChange={handleKeyInput}
                  placeholder={t('keyDialog.keyPlaceholder')}
                  error={!isValidInput}
                  className="key-input"
                />
                <Button
                  onClick={handleClear}
                  title={t('common.clear')}
                  variant="outline"
                  className="icon-button"
                >
                  <FiDelete size={20} />
                </Button>
              </div>
              {!isValidInput && key.length === 7 && (
                <p className="error-message">{t('keyDialog.invalidKey')}</p>
              )}
              {errorMessage && (
                <p className="error-message">{errorMessage}</p>
              )}
              {isAIKey && !errorMessage && (
                <p className="success-message">{t('keyDialog.aiKey')}</p>
              )}
            </div>

            <div className="action-buttons">
              <Button
                onClick={handleNewKey}
                variant="outline"
                className="icon-button"
                title={currentDictionary?.id === "ai_dictionary" ? t('keyDialog.aiKeysInMenu') : t('keyDialog.newKey')}
                disabled={!currentDictionary}
              >
                <FiPlus size={20} />
              </Button>
              <Button onClick={handleCopy} variant="outline">
                {t('common.copy')}
              </Button>
              <Button onClick={handlePaste} variant="outline">
                {t('common.paste')}
              </Button>
            </div>
          </div>

          <DialogFooter>
            <div className="footer-buttons">
              <Button variant="outline" onClick={onBack}>
                {t('keyDialog.back')}
              </Button>
              <Button
                onClick={handleCreate}
                disabled={
                  !isValidInput ||
                  !key ||
                  key.length !== 7 ||
                  !isValidKeyFormat(key)
                }
              >
                {t('keyDialog.join')}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Notification
        message={t('notifications.keyCopied')}
        isVisible={showNotification}
        onClose={() => setShowNotification(false)}
      />
    </>
  );
};

export default KeyDialog;