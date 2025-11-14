import { useState, useEffect } from "react";
import { FiX } from "react-icons/fi";
import { useTranslation } from "../../hooks/useTranslation";

const API_URL = import.meta.env.VITE_API_URL || "https://server.code-names.ru";

const AuthDialog = ({ isOpen, onClose, onSuccess }) => {
  const { t } = useTranslation();
  const [step, setStep] = useState('name');
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [generatedPin, setGeneratedPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [pinCopied, setPinCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStep('name');
      setUsername('');
      setPin('');
      setGeneratedPin('');
      setError('');
    }
  }, [isOpen]);

  const handleCheckUsername = async (e) => {
    e.preventDefault();

    if (!username.trim()) {
      setError(t('auth.enterName'));
      return;
    }

    if (username.trim().length < 2 || username.trim().length > 30) {
      setError(t('auth.nameLength'));
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/api/auth/check-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim() })
      });

      const data = await response.json();

      if (data.exists) {
        setStep('pin');
      } else {
        await handleRegister();
      }
    } catch {
      setError(t('auth.checkError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    setIsLoading(true);
    setError('');

    try {
      let userId = localStorage.getItem('codenames-user-id');
      if (!userId) {
        userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('codenames-user-id', userId);
      }

      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId,
          username: username.trim()
        })
      });

      const data = await response.json();

      if (data.success) {
        setGeneratedPin(data.pin);
        setStep('register');
        localStorage.setItem('codenames-username', username.trim());
        localStorage.setItem('codenames-pin', data.pin);
      } else {
        setError(data.error || t('auth.registerError'));
      }
    } catch {
      setError(t('auth.registerError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyPin = async (e) => {
    e.preventDefault();

    if (!pin.trim()) {
      setError(t('auth.enterPin'));
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/api/auth/verify-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          pin: pin.trim()
        })
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('codenames-user-id', data.user_id);
        localStorage.setItem('codenames-username', data.username);
        localStorage.setItem('codenames-pin', pin.trim());

        onSuccess({
          userId: data.user_id,
          username: data.username
        });
      } else {
        setError(data.error || t('auth.wrongPin'));
      }
    } catch {
      setError(t('auth.verifyError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegistrationComplete = () => {
    const userId = localStorage.getItem('codenames-user-id');
    onSuccess({
      userId: userId,
      username: username.trim()
    });
  };

  const handleCopyPin = async () => {
    try {
      await navigator.clipboard.writeText(generatedPin);
      setPinCopied(true);
      setTimeout(() => setPinCopied(false), 2000);
    } catch {
      // Clipboard API may fail
    }
  };

  const handleBack = () => {
    setStep('name');
    setPin('');
    setError('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
      <div className="flex flex-col h-full sm:h-auto sm:max-h-[calc(100vh-2rem)] w-full max-w-md bg-white sm:rounded-lg">

        {/* HEADER */}
        <div className="auth-dialog-header flex-shrink-0 flex items-center justify-between border-b border-gray-200 px-3 sm:px-4">
          <h2 className="text-base font-semibold text-gray-900">
            {t('auth.title')}
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
        <div className="auth-dialog-content flex-1 overflow-y-auto px-3 sm:px-4 py-4 space-y-2 sm:space-y-4 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-gray-400">

          {/* STEP 1: Name */}
          {step === 'name' && (
            <form onSubmit={handleCheckUsername} className="space-y-1 sm:space-y-2">
              <div>
                <label className="block text-sm font-medium text-gray-900">
                  {t('auth.enterName')}
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={t('auth.namePlaceholder')}
                  maxLength={30}
                  disabled={isLoading}
                  autoFocus
                  className="mt-2 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>

              <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs sm:text-sm text-blue-700">
                {t('auth.nameHint')}
              </div>

              <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-2 text-xs sm:text-sm text-yellow-800">
                {t('auth.testWarning')}
              </div>

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}
            </form>
          )}

          {/* STEP 2: PIN */}
          {step === 'pin' && (
            <form onSubmit={handleVerifyPin} className="space-y-1 sm:space-y-2">
              <div className="text-center space-y-1">
                <p className="text-sm text-gray-600">
                  {t('auth.userExists')} <strong>"{username}"</strong> {t('auth.userExistsEnd')}
                </p>
                <p className="text-sm text-gray-600">{t('auth.isYourAccount')}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900">
                  {t('auth.enterPin')}
                </label>
                <input
                  type="text"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.toUpperCase())}
                  placeholder={t('auth.pinPlaceholder')}
                  maxLength={14}
                  disabled={isLoading}
                  autoFocus
                  className="mt-2 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}
            </form>
          )}

          {/* STEP 3: Register Success */}
          {step === 'register' && (
            <div className="space-y-2 sm:space-y-4 text-center">
              <p className="text-base text-gray-600">
                {t('auth.welcome')} {username}!
              </p>

              <div
                onClick={handleCopyPin}
                className="rounded-lg border-2 border-blue-600 bg-blue-50 px-4 py-6 cursor-pointer hover:bg-blue-100 transition-colors"
                title="Нажмите чтобы скопировать"
              >
                <div className="text-sm text-gray-600 mb-2">
                  {t('auth.pinGenerated')}
                </div>
                <p className="text-2xl font-bold font-mono text-blue-600 tracking-wider select-all">
                  {generatedPin}
                </p>
                {pinCopied && (
                  <p className="mt-3 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                    {t('chat.pinCopied')}
                  </p>
                )}
              </div>

              <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-2 text-xs sm:text-sm font-medium text-yellow-800">
                {t('auth.savePinWarning')}
              </div>
            </div>
          )}

        </div>

        {/* FOOTER */}
        <div className="auth-dialog-footer flex-shrink-0 bg-white border-t border-gray-200 px-3 sm:px-4 py-2 sm:rounded-b-lg overflow-hidden">
          <div className="flex justify-end gap-2 sm:gap-4">
            {step === 'name' && (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 cursor-pointer"
                >
                  {t('auth.cancelBtn')}
                </button>
                <button
                  onClick={handleCheckUsername}
                  disabled={isLoading || !username.trim()}
                  className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isLoading ? t('common.loading') : t('auth.continueBtn')}
                </button>
              </>
            )}

            {step === 'pin' && (
              <>
                <button
                  type="button"
                  onClick={handleBack}
                  className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 cursor-pointer"
                >
                  {t('auth.backBtn')}
                </button>
                <button
                  onClick={handleVerifyPin}
                  disabled={isLoading || !pin.trim()}
                  className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isLoading ? t('common.loading') : t('auth.loginBtn')}
                </button>
              </>
            )}

            {step === 'register' && (
              <button
                onClick={handleRegistrationComplete}
                className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 cursor-pointer"
              >
                {t('auth.continueBtn')}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default AuthDialog;
