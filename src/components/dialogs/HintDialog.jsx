import { useState, useEffect } from "react";
import { useTranslation } from "../../hooks/useTranslation";
import Dialog, { DialogBody, DialogFooter, BUTTON, PANEL } from "./Dialog";

const WORD_VISIBLE_MS = 30000;

const TEAM_FILL = { blue: 'bg-[var(--blue-accent)]', red: 'bg-[var(--red-accent)]' };
const TEAM_TEXT = { blue: 'text-[var(--blue-on-panel)]', red: 'text-[var(--red-on-panel)]' };

const HintDialog = ({ isOpen, onClose, hint, team, remainingCards, onEndTurn, canEndTurn }) => {
  const { t } = useTranslation();
  const [countdown, setCountdown] = useState(0);

  // Слово капитана видно полминуты, дальше остаётся только число
  useEffect(() => {
    if (!hint) return;

    const tick = () => setCountdown(Math.max(0, Math.ceil((WORD_VISIBLE_MS - (Date.now() - hint.timestamp)) / 1000)));
    tick();

    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [hint]);

  if (!hint) return null;

  const maxAttempts = hint.number === 0 ? remainingCards[team] : hint.number + 1;
  const remaining = maxAttempts - hint.attempts;

  return (
    <Dialog isOpen={isOpen} title={t(team === 'blue' ? 'hintDialog.titleBlue' : 'hintDialog.titleRed')} onClose={onClose}>
      <DialogBody className="flex flex-col justify-center space-y-2 sm:space-y-4">
        <div className={`rounded-xl ${TEAM_FILL[team]} p-5 text-center text-3xl font-bold text-ui-panel`}>
          {countdown > 0 ? hint.word : '???'} - {hint.number}
        </div>

        <p className="text-center text-sm opacity-80">
          {countdown > 0
            ? t('hintDialog.wordVisibleCountdown').replace('{seconds}', countdown)
            : t('hintDialog.wordExpired')}
        </p>

        <p className={`${PANEL} p-4 text-sm ${TEAM_TEXT[team]}!`}>
          {t('hintDialog.attemptsLeft')} <strong>{remaining}</strong>
          {hint.number > 0 && <span className="opacity-70"> {t('hintDialog.bonusAttempt')}</span>}
        </p>
      </DialogBody>

      {canEndTurn && (
        <DialogFooter>
          <button onClick={onEndTurn} className={`${BUTTON} w-full`}>
            {t('hintDialog.endTurn')}
          </button>
        </DialogFooter>
      )}
    </Dialog>
  );
};

export default HintDialog;
