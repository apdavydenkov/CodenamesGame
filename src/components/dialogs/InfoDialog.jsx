import { useTranslation } from "../../hooks/useTranslation";
import Dialog, { DialogBody, DialogFooter, BUTTON } from "./Dialog";

const FEATURES = [1, 2, 3, 4, 5, 6];
const STEPS = [1, 2, 3, 4];

const InfoDialog = ({ isOpen, onClose }) => {
  const { t } = useTranslation();

  return (
    <Dialog isOpen={isOpen} title={t('info.title')} onClose={onClose}>
      <DialogBody className="space-y-2 sm:space-y-4 text-sm opacity-80">
        <p>{t('info.description')}</p>

        <section className="space-y-1 sm:space-y-2">
          <h3 className="text-base font-medium">{t('info.features')}:</h3>
          <ul className="space-y-1">
            {FEATURES.map((n) => <li key={n}>• {t(`info.feature${n}`)}</li>)}
          </ul>
        </section>

        <section className="space-y-1 sm:space-y-2">
          <h3 className="text-base font-medium">{t('info.howToPlay')}:</h3>
          <ol className="space-y-1">
            {STEPS.map((n) => <li key={n}>{n}. {t(`info.step${n}`)}</li>)}
          </ol>
        </section>

        <section className="space-y-1 sm:space-y-2">
          <h3 className="text-base font-medium">{t('info.aiGames')}:</h3>
          <p>{t('info.aiDescription')}</p>
        </section>
      </DialogBody>

      <DialogFooter className="flex justify-end">
        <button onClick={onClose} className={BUTTON}>{t('common.close')}</button>
      </DialogFooter>
    </Dialog>
  );
};

export default InfoDialog;
