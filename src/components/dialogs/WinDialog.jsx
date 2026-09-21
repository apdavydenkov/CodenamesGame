import { useTranslation } from "../../hooks/useTranslation";
import Dialog, { DialogBody, DialogFooter, BUTTON, BUTTON_PRIMARY } from "./Dialog";

const WINNER_FILL = {
  blue: 'bg-[var(--blue-accent)]',
  red: 'bg-[var(--red-accent)]',
  assassin: 'bg-[var(--assassin)]',
};

const WinDialog = ({ isOpen, winner, onClose, onReturn }) => {
  const { t } = useTranslation();

  const description = winner === "assassin"
    ? t('winDialog.assassinLoss')
    : `${t(winner === "blue" ? 'winDialog.blueTeam' : 'winDialog.redTeam')} ${t('winDialog.teamWon')}`;

  return (
    <Dialog isOpen={isOpen} title={t('winDialog.title')} onClose={onReturn}>
      <DialogBody className="flex flex-col justify-center">
        <p className={`rounded-xl p-6 text-center text-2xl font-bold text-ui-panel ${WINNER_FILL[winner] ?? ''}`}>
          {description}
        </p>
      </DialogBody>

      <DialogFooter className="flex gap-2 sm:gap-4">
        <button onClick={onReturn} className={`${BUTTON} flex-1`}>
          {t('winDialog.return')}
        </button>
        <button onClick={onClose} className={`${BUTTON_PRIMARY} flex-1`}>
          {t('winDialog.newGame')}
        </button>
      </DialogFooter>
    </Dialog>
  );
};

export default WinDialog;
