import { useState, useEffect } from "react";
import { useTranslation } from "../../hooks/useTranslation";
import { useNotify } from "../../contexts/NotificationContext";
import { api } from "../../services/api";
import Dialog, { DialogBody, DialogFooter, BUTTON, BUTTON_PRIMARY, INPUT, PANEL } from "./Dialog";

const AuthDialog = ({ isOpen, onClose, onSuccess }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const [step, setStep] = useState('name');
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [generatedPin, setGeneratedPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStep('name');
      setUsername('');
      setPin('');
      setGeneratedPin('');
    }
  }, [isOpen]);

  const register = async () => {
    const created = await api.register(username.trim());

    localStorage.setItem('codenames-user-id', created.id);
    localStorage.setItem('codenames-username', created.username);
    localStorage.setItem('codenames-pin', created.pin);

    setGeneratedPin(created.pin);
    setStep('register');
  };

  const handleCheckUsername = async (event) => {
    event.preventDefault();

    const name = username.trim();
    if (name.length < 2 || name.length > 30) {
      notify(t('auth.nameLength'));
      return;
    }

    setIsLoading(true);

    try {
      if (await api.userExists(name)) setStep('pin');
      else await register();
    } catch (error) {
      notify(error.message || t('auth.checkError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyPin = async (event) => {
    event.preventDefault();

    setIsLoading(true);

    try {
      const { record } = await api.login(username.trim(), pin.trim());

      localStorage.setItem('codenames-user-id', record.id);
      localStorage.setItem('codenames-username', record.username);
      localStorage.setItem('codenames-pin', pin.trim());

      onSuccess({ userId: record.id, username: record.username });
    } catch (error) {
      notify(error.message || t('auth.wrongPin'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyPin = () => {
    navigator.clipboard.writeText(generatedPin);
    notify(t('chat.pinCopied'));
  };

  return (
    <Dialog isOpen={isOpen} title={t('auth.title')} onClose={onClose}>
      <DialogBody className="space-y-2 sm:space-y-4">
        {step === 'name' && (
          <form onSubmit={handleCheckUsername} className="space-y-2">
            <label className="block text-sm font-medium">{t('auth.enterName')}</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t('auth.namePlaceholder')}
              maxLength={30}
              disabled={isLoading}
              autoFocus
              className={`${INPUT} block w-full`}
            />
            <p className={`${PANEL} text-xs sm:text-sm`}>{t('auth.nameHint')}</p>
            <p className={`${PANEL} text-xs sm:text-sm text-[var(--red-accent)]!`}>{t('auth.testWarning')}</p>
          </form>
        )}

        {step === 'pin' && (
          <form onSubmit={handleVerifyPin} className="space-y-2">
            <p className="text-center text-sm opacity-80">
              {t('auth.userExists')} <strong>«{username}»</strong> {t('auth.userExistsEnd')} {t('auth.isYourAccount')}
            </p>
            <label className="block text-sm font-medium">{t('auth.enterPin')}</label>
            <input
              type="text"
              value={pin}
              onChange={(e) => setPin(e.target.value.toUpperCase())}
              placeholder={t('auth.pinPlaceholder')}
              maxLength={14}
              disabled={isLoading}
              autoFocus
              className={`${INPUT} block w-full`}
            />
          </form>
        )}

        {step === 'register' && (
          <div className="space-y-2 sm:space-y-4 text-center">
            <p className="text-base opacity-80">{t('auth.welcome')} {username}!</p>

            <button onClick={handleCopyPin} className={`${PANEL} w-full px-4 py-6 border-2 border-ui-accent cursor-pointer hover:bg-ui-accent/10`}>
              <span className="block text-sm opacity-70">{t('auth.pinGenerated')}</span>
              <span className="mt-2 block select-all font-mono text-2xl font-bold tracking-wider text-ui-accent">
                {generatedPin}
              </span>
            </button>

            <p className={`${PANEL} text-xs sm:text-sm font-medium text-[var(--red-accent)]!`}>{t('auth.savePinWarning')}</p>
          </div>
        )}
      </DialogBody>

      <DialogFooter className="flex justify-end gap-2 sm:gap-4">
        {step === 'name' && (
          <>
            <button type="button" onClick={onClose} className={BUTTON}>{t('auth.cancelBtn')}</button>
            <button onClick={handleCheckUsername} disabled={isLoading || !username.trim()} className={BUTTON_PRIMARY}>
              {isLoading ? t('common.loading') : t('auth.continueBtn')}
            </button>
          </>
        )}

        {step === 'pin' && (
          <>
            <button type="button" onClick={() => { setStep('name'); setPin(''); }} className={BUTTON}>
              {t('auth.backBtn')}
            </button>
            <button onClick={handleVerifyPin} disabled={isLoading || !pin.trim()} className={BUTTON_PRIMARY}>
              {isLoading ? t('common.loading') : t('auth.loginBtn')}
            </button>
          </>
        )}

        {step === 'register' && (
          <button
            onClick={() => onSuccess({ userId: localStorage.getItem('codenames-user-id'), username: username.trim() })}
            className={BUTTON_PRIMARY}
          >
            {t('auth.continueBtn')}
          </button>
        )}
      </DialogFooter>
    </Dialog>
  );
};

export default AuthDialog;
