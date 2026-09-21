import { useState } from "react";
import { useTranslation } from "../../hooks/useTranslation";
import { useNotify } from "../../contexts/NotificationContext";
import { api } from "../../services/api";
import Dialog, { DialogBody, DialogFooter, BUTTON, BUTTON_DANGER, BUTTON_PRIMARY, INPUT, PANEL } from "./Dialog";

const STATS = ['gamesPlayed', 'gamesWon', 'winRate', 'favoriteRole'];

const SettingsDialog = ({ isOpen, onClose, userId, username, onLogout }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const [newUsername, setNewUsername] = useState("");
  const [isChangingName, setIsChangingName] = useState(false);

  const pin = localStorage.getItem('codenames-pin');

  const handleChangeName = async () => {
    const name = newUsername.trim();

    if (name.length < 2) {
      notify(t('chat.nameChangeError'));
      return;
    }

    if (!pin) {
      notify(t('chat.pinMissing'));
      return;
    }

    setIsChangingName(true);

    try {
      const record = await api.changeUsername(userId, name, pin);
      localStorage.setItem('codenames-username', record.username);
      window.location.reload();
    } catch (error) {
      notify(error.message || t('chat.nameChangeError'));
      setIsChangingName(false);
    }
  };

  const handleCopyPin = () => {
    navigator.clipboard.writeText(pin);
    notify(t('chat.pinCopied'));
  };

  return (
    <Dialog isOpen={isOpen} title={t('chat.settings')} onClose={onClose}>
      <DialogBody className="space-y-2 sm:space-y-4">
        <p className="text-sm opacity-80">
          {t('chat.currentUser')}: <strong>{username}</strong>
        </p>

        <section className="space-y-1 sm:space-y-2">
          <label className="block text-sm font-medium">{t('chat.yourPin')}</label>
          <div className="flex gap-2 sm:gap-4">
            <input type="text" value={pin || ''} readOnly className={`${INPUT} flex-1 min-w-0 cursor-default`} />
            <button onClick={handleCopyPin} disabled={!pin} className={`${BUTTON} flex-shrink-0`}>
              {t('chat.copy')}
            </button>
          </div>
          <p className="text-xs sm:text-sm font-medium text-[var(--red-accent)]">{t('auth.savePinWarning')}</p>
        </section>

        <section className="space-y-1 sm:space-y-2">
          <label className="block text-sm font-medium">{t('chat.changeName')}</label>
          <div className="flex gap-2 sm:gap-4">
            <input
              type="text"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              placeholder={username}
              maxLength={50}
              className={`${INPUT} flex-1 min-w-0`}
            />
            <button
              onClick={handleChangeName}
              disabled={!newUsername.trim() || isChangingName}
              className={`${BUTTON_PRIMARY} flex-shrink-0`}
            >
              {t('chat.save')}
            </button>
          </div>
        </section>

        <section className={`${PANEL} p-4 space-y-1 sm:space-y-2`}>
          <h3 className="text-base font-medium">{t('chat.profileStats')}</h3>
          {STATS.map((stat) => (
            <div key={stat} className="flex justify-between text-sm">
              <span>{t(`chat.${stat}`)}:</span>
              <span className="font-medium opacity-60">{t('chat.inDevelopment')}</span>
            </div>
          ))}
        </section>
      </DialogBody>

      <DialogFooter>
        <button
          onClick={() => {
            onLogout();
            onClose();
          }}
          className={`${BUTTON_DANGER} w-full`}
        >
          {t('chat.logoutWithPin')}
        </button>
      </DialogFooter>
    </Dialog>
  );
};

export default SettingsDialog;
