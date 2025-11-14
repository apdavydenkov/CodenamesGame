import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "./Dialog";
import { Button } from "./Button";
import { FiX, FiFileText } from "react-icons/fi";
import { useTranslation } from "../hooks/useTranslation";
import "../styles/dialogs.css";

const HintPopup = ({
  isOpen,
  onClose,
  hint,  // { word, number, attempts, timestamp }
  team,  // 'blue' или 'red'
  remainingCards,
  onEndTurn,
  canEndTurn  // Может ли пользователь передать ход (только игрок команды, не капитан)
}) => {
  const [showWord, setShowWord] = useState(true);
  const { t } = useTranslation();

  // Скрыть слово через 30 секунд
  useEffect(() => {
    if (!hint) return;

    const elapsed = Date.now() - hint.timestamp;
    const remaining = 30000 - elapsed;

    if (remaining <= 0) {
      setShowWord(false);
    } else {
      setShowWord(true);
      const timer = setTimeout(() => {
        setShowWord(false);
      }, remaining);

      return () => clearTimeout(timer);
    }
  }, [hint]);

  if (!hint) return null;

  const maxAttempts = hint.number === 0
    ? remainingCards[team]
    : hint.number + 1;

  const remaining = maxAttempts - hint.attempts;
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`hint-popup hint-${team}`}>
        <div className="dialog-header-with-close">
          <DialogTitle><FiFileText /> {t('hintDialog.title')}</DialogTitle>
          <button className="close-button" onClick={onClose}>
            <FiX size={20} />
          </button>
        </div>

        <div className="hint-info">
          <div className="hint-word-display">
            {showWord ? (
              <span className="hint-word-visible">{hint.word} - {hint.number}</span>
            ) : (
              <span className="hint-word-hidden">??? - {hint.number}</span>
            )}
          </div>

          {!showWord && (
            <div className="hint-word-expired">
              {t('hintDialog.wordExpired')}
            </div>
          )}

          <div className="hint-attempts">
            {t('hintDialog.attemptsLeft')} <strong>{remaining}</strong>
            {hint.number > 0 && <span className="hint-bonus"> {t('hintDialog.bonusAttempt')}</span>}
          </div>
        </div>

        {canEndTurn && (
          <Button onClick={onEndTurn} variant="outline" className="end-turn-button">
            {t('hintDialog.endTurn')}
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default HintPopup;
