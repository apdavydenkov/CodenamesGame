import { useState, useEffect } from "react";
import { FiX } from "react-icons/fi";
import { useTranslation } from "../../hooks/useTranslation";

const HintDialog = ({
  isOpen,
  onClose,
  hint,  // { word, number, attempts, timestamp }
  team,  // 'blue' или 'red'
  remainingCards,
  onEndTurn,
  canEndTurn  // Может ли пользователь передать ход (только игрок команды, не капитан)
}) => {
  const [showWord, setShowWord] = useState(true);
  const [countdown, setCountdown] = useState(30);
  const { t } = useTranslation();

  // Скрыть слово через 30 секунд + обратный отсчёт
  useEffect(() => {
    if (!hint) return;

    const elapsed = Date.now() - hint.timestamp;
    const remaining = 30000 - elapsed;

    if (remaining <= 0) {
      setShowWord(false);
      setCountdown(0);
    } else {
      setShowWord(true);
      setCountdown(Math.ceil(remaining / 1000));

      const timer = setTimeout(() => {
        setShowWord(false);
        setCountdown(0);
      }, remaining);

      // Обновляем счётчик каждую секунду
      const countdownInterval = setInterval(() => {
        const currentRemaining = 30000 - (Date.now() - hint.timestamp);
        if (currentRemaining <= 0) {
          setCountdown(0);
          clearInterval(countdownInterval);
        } else {
          setCountdown(Math.ceil(currentRemaining / 1000));
        }
      }, 1000);

      return () => {
        clearTimeout(timer);
        clearInterval(countdownInterval);
      };
    }
  }, [hint]);

  if (!hint || !isOpen) return null;

  const maxAttempts = hint.number === 0
    ? remainingCards[team]
    : hint.number + 1;

  const remaining = maxAttempts - hint.attempts;
  const titleKey = team === 'blue' ? 'hintDialog.titleBlue' : 'hintDialog.titleRed';

  const teamColors = {
    blue: {
      bg: 'bg-blue-600',
      text: 'text-blue-600',
      border: 'border-blue-600'
    },
    red: {
      bg: 'bg-red-600',
      text: 'text-red-600',
      border: 'border-red-600'
    }
  };

  const colors = teamColors[team] || teamColors.blue;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
      <div className="flex flex-col h-full sm:h-auto sm:max-h-[calc(100vh-2rem)] w-full max-w-md bg-white sm:rounded-lg">

        {/* HEADER */}
        <div className={`hint-dialog-header flex items-center justify-between border-b border-gray-200 px-3 sm:px-4 ${colors.bg}`}>
          <h2 className="text-base font-semibold text-white">
            {t(titleKey)}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-white hover:bg-white/20 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <FiX size={20} />
          </button>
        </div>

        {/* BODY */}
        <div className="hint-dialog-content flex-1 overflow-y-auto px-3 sm:px-4 py-4 space-y-2 sm:space-y-4 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-gray-400">

          {/* Hint Word Display */}
          <div className={`rounded-lg border-2 ${colors.border} p-4 text-center`}>
            <div className={`text-2xl font-bold ${colors.text}`}>
              {showWord ? (
                <>{hint.word} - {hint.number}</>
              ) : (
                <>??? - {hint.number}</>
              )}
            </div>
          </div>

          {/* Status */}
          <div className="text-center text-sm text-gray-600">
            {showWord
              ? t('hintDialog.wordVisibleCountdown').replace('{seconds}', countdown)
              : t('hintDialog.wordExpired')
            }
          </div>

          {/* Attempts */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="text-sm text-gray-600">
              {t('hintDialog.attemptsLeft')} <strong className="text-gray-900">{remaining}</strong>
              {hint.number > 0 && <span className={colors.text}> {t('hintDialog.bonusAttempt')}</span>}
            </p>
          </div>

        </div>

        {/* FOOTER */}
        {canEndTurn && (
          <div className="hint-dialog-footer border-t border-gray-200 px-3 sm:px-4 py-2">
            <button
              onClick={onEndTurn}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 sm:px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 cursor-pointer"
            >
              {t('hintDialog.endTurn')}
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default HintDialog;
