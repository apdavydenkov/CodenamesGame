import { useState, useEffect } from "react";
import { FiX, FiDelete, FiPlus } from "react-icons/fi";
import Notification from "../Notification";
import { useTranslation } from "../../hooks/useTranslation";
import { isValidKeyFormat, generateNewKey } from "../../utils/gameGenerator";

const KeyDialog = ({
  isOpen,
  onClose,
  onKeySubmit,
  currentKey,
  onBack,
  currentDictionary,
  dictionaries,
}) => {
  const { t } = useTranslation();
  const [key, setKey] = useState(currentKey || "");
  const [isValidInput, setIsValidInput] = useState(true);
  const [showNotification, setShowNotification] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    setKey(currentKey || "");
    setIsValidInput(currentKey ? isValidKeyFormat(currentKey) : true);
    setErrorMessage("");
  }, [currentKey, isOpen]);

  const handleKeyInput = (e) => {
    const value = e.target.value.toUpperCase().replace(/[^А-ЯЁ]/g, "");
    const cleanValue = value.slice(0, 7);
    setKey(cleanValue);
    setIsValidInput(cleanValue.length !== 7 || isValidKeyFormat(cleanValue));
    setErrorMessage("");
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(key);
      setShowNotification(true);
    } catch {
      // Clipboard API may fail
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
    } catch {
      // Clipboard API may fail
    }
  };

  const handleClear = () => {
    setKey("");
    setIsValidInput(true);
  };

  const handleNewKey = () => {
    if (currentDictionary && currentDictionary.id !== "ai_dictionary") {
      const regularDictionaries = dictionaries.filter(d => d.id !== "ai_dictionary");
      const dictionaryIndex = regularDictionaries.findIndex(d => d.id === currentDictionary.id);
      const newKey = generateNewKey(dictionaryIndex);
      setKey(newKey);
      setIsValidInput(true);
      setErrorMessage("");
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
      if (error.message && error.message.includes(t('keyDialog.aiGameNotFound'))) {
        setErrorMessage(t('keyDialog.aiGameNotFound'));
      } else {
        setErrorMessage(t('keyDialog.invalidKey'));
      }
    }
  };

  const isAIKey = key[6] === 'Н';

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
        <div className="flex flex-col h-full sm:h-auto sm:max-h-[calc(100vh-2rem)] w-full max-w-md bg-white sm:rounded-lg">

          {/* HEADER */}
          <div className="key-dialog-header flex items-center justify-between border-b border-gray-200 px-3 sm:px-4">
            <h2 className="text-base font-semibold text-gray-900">
              {t('keyDialog.title')}
            </h2>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <FiX size={20} />
            </button>
          </div>

          {/* BODY */}
          <div className="key-dialog-content flex-1 overflow-y-auto px-3 sm:px-4 py-4 space-y-2 sm:space-y-4 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-gray-400">

            {/* Description */}
            <p className="text-sm text-gray-600">
              {t('keyDialog.description')}
            </p>

            {/* Key Input */}
            <div className="space-y-1 sm:space-y-2">
              <div className="flex gap-2 sm:gap-4">
                <input
                  type="text"
                  value={key}
                  onChange={handleKeyInput}
                  placeholder={t('keyDialog.keyPlaceholder')}
                  maxLength={7}
                  className={`flex-1 min-w-0 rounded-lg border ${!isValidInput ? 'border-red-500' : 'border-gray-300'} bg-white px-3 sm:px-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900`}
                />
                <button
                  onClick={handleClear}
                  title={t('common.clear')}
                  className="flex-shrink-0 rounded-lg border border-gray-200 bg-white p-2 text-gray-900 hover:bg-gray-50 cursor-pointer"
                >
                  <FiDelete size={20} />
                </button>
              </div>

              {/* Error Messages */}
              {!isValidInput && key.length === 7 && (
                <p className="text-xs sm:text-sm text-red-600">{t('keyDialog.invalidKey')}</p>
              )}
              {errorMessage && (
                <p className="text-xs sm:text-sm text-red-600">{errorMessage}</p>
              )}
              {isAIKey && !errorMessage && (
                <p className="text-xs sm:text-sm text-green-600">{t('keyDialog.aiKey')}</p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 sm:gap-4">
              <button
                onClick={handleNewKey}
                title={currentDictionary?.id === "ai_dictionary" ? t('keyDialog.aiKeysInMenu') : t('keyDialog.newKey')}
                disabled={!currentDictionary}
                className="flex-shrink-0 rounded-lg border border-gray-200 bg-white p-2 text-gray-900 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <FiPlus size={20} />
              </button>
              <button
                onClick={handleCopy}
                className="flex-1 rounded-lg border border-gray-200 bg-white px-3 sm:px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 cursor-pointer"
              >
                {t('common.copy')}
              </button>
              <button
                onClick={handlePaste}
                className="flex-1 rounded-lg border border-gray-200 bg-white px-3 sm:px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 cursor-pointer"
              >
                {t('common.paste')}
              </button>
            </div>

          </div>

          {/* FOOTER */}
          <div className="key-dialog-footer border-t border-gray-200 px-3 sm:px-4 py-2">
            <div className="flex gap-2 sm:gap-4">
              <button
                onClick={onBack}
                className="flex-1 rounded-lg border border-gray-200 bg-white px-3 sm:px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 cursor-pointer"
              >
                {t('keyDialog.back')}
              </button>
              <button
                onClick={handleCreate}
                disabled={!isValidInput || !key || key.length !== 7 || !isValidKeyFormat(key)}
                className="flex-1 rounded-lg bg-gray-900 px-3 sm:px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {t('keyDialog.join')}
              </button>
            </div>
          </div>

        </div>
      </div>

      <Notification
        message={t('notifications.keyCopied')}
        isVisible={showNotification}
        onClose={() => setShowNotification(false)}
      />
    </>
  );
};

export default KeyDialog;
