import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./Dialog";
import { Button } from "./Button";
import { Input } from "./Input";
import { FiAlertCircle, FiKey } from "react-icons/fi";
import { useTranslation } from "../hooks/useTranslation";

const API_URL = import.meta.env.VITE_API_URL || "https://server.code-names.ru";

const AuthDialog = ({ isOpen, onClose, onSuccess }) => {
  const { t } = useTranslation();
  const [step, setStep] = useState('name'); // 'name' | 'pin' | 'register'
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [generatedPin, setGeneratedPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [pinCopied, setPinCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      console.log('[AuthDialog] Opened');
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
      console.log('[AuthDialog] Checking username:', username.trim());

      const response = await fetch(`${API_URL}/api/auth/check-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim() })
      });

      const data = await response.json();
      console.log('[AuthDialog] Check result:', data);

      if (data.exists) {
        // Имя занято - спросить "это ваш аккаунт?"
        setStep('pin');
      } else {
        // Имя свободно - зарегистрировать
        await handleRegister();
      }
    } catch (err) {
      console.error('[AuthDialog] Error checking username:', err);
      setError(t('auth.checkError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    setIsLoading(true);
    setError('');

    try {
      // Генерируем или получаем userId
      let userId = localStorage.getItem('codenames-user-id');
      if (!userId) {
        userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('codenames-user-id', userId);
      }

      console.log('[AuthDialog] Registering user:', { userId, username: username.trim() });

      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId,
          username: username.trim()
        })
      });

      const data = await response.json();
      console.log('[AuthDialog] Register result:', data);

      if (data.success) {
        setGeneratedPin(data.pin);
        setStep('register');

        // Сохраняем имя и PIN
        localStorage.setItem('codenames-username', username.trim());
        localStorage.setItem('codenames-pin', data.pin); // Сохраняем PIN
      } else {
        setError(data.error || t('auth.registerError'));
      }
    } catch (err) {
      console.error('[AuthDialog] Error registering:', err);
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
      console.log('[AuthDialog] Verifying PIN for user:', username.trim());

      const response = await fetch(`${API_URL}/api/auth/verify-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          pin: pin.trim()
        })
      });

      const data = await response.json();
      console.log('[AuthDialog] Verify result:', data);

      if (data.success) {
        // Успешная авторизация
        localStorage.setItem('codenames-user-id', data.user_id);
        localStorage.setItem('codenames-username', data.username);
        localStorage.setItem('codenames-pin', pin.trim()); // Сохраняем PIN

        console.log('[AuthDialog] Login successful:', { userId: data.user_id, username: data.username });

        onSuccess({
          userId: data.user_id,
          username: data.username
        });
      } else {
        setError(data.error || t('auth.wrongPin'));
      }
    } catch (err) {
      console.error('[AuthDialog] Error verifying PIN:', err);
      setError(t('auth.verifyError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegistrationComplete = () => {
    const userId = localStorage.getItem('codenames-user-id');
    console.log('[AuthDialog] Registration complete:', { userId, username: username.trim() });

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
    } catch (err) {
      console.error('[Auth] Failed to copy PIN:', err);
    }
  };

  const handleBack = () => {
    setStep('name');
    setPin('');
    setError('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('auth.title')}</DialogTitle>
        </DialogHeader>

        <div className="auth-container">
          {/* Этап 1: Ввод имени */}
          {step === 'name' && (
            <form onSubmit={handleCheckUsername}>
              <div className="auth-field">
                <label>{t('auth.enterName')}</label>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={t('auth.namePlaceholder')}
                  maxLength={30}
                  disabled={isLoading}
                  autoFocus
                />
              </div>

              <div className="auth-hint">
                <span>{t('auth.nameHint')}</span>
              </div>

              <div className="auth-test-warning">
                <span>{t('auth.testWarning')}</span>
              </div>

              {error && <div className="auth-error">{error}</div>}

              <div className="auth-buttons">
                <Button type="button" variant="outline" onClick={onClose}>
                  {t('auth.cancelBtn')}
                </Button>
                <Button type="submit" disabled={isLoading || !username.trim()}>
                  {isLoading ? t('common.loading') : t('auth.continueBtn')}
                </Button>
              </div>
            </form>
          )}

          {/* Этап 2: Ввод PIN (если имя занято) */}
          {step === 'pin' && (
            <form onSubmit={handleVerifyPin}>
              <div className="auth-info">
                <p>{t('auth.userExists')} <strong>"{username}"</strong> {t('auth.userExistsEnd')}</p>
                <p>{t('auth.isYourAccount')}</p>
              </div>

              <div className="auth-field">
                <label>{t('auth.enterPin')}</label>
                <Input
                  value={pin}
                  onChange={(e) => setPin(e.target.value.toUpperCase())}
                  placeholder={t('auth.pinPlaceholder')}
                  maxLength={14}
                  disabled={isLoading}
                  autoFocus
                />
              </div>

              {error && <div className="auth-error">{error}</div>}

              <div className="auth-buttons">
                <Button type="button" variant="outline" onClick={handleBack}>
                  {t('auth.backBtn')}
                </Button>
                <Button type="submit" disabled={isLoading || !pin.trim()}>
                  {isLoading ? t('common.loading') : t('auth.loginBtn')}
                </Button>
              </div>
            </form>
          )}

          {/* Этап 3: Показать сгенерированный PIN */}
          {step === 'register' && (
            <div>
              <div className="auth-success">
                <p className="auth-welcome">{t('auth.welcome')} {username}!</p>

                <div
                  className="auth-pin-box"
                  onClick={handleCopyPin}
                  style={{ cursor: 'pointer' }}
                  title="Нажмите чтобы скопировать"
                >
                  <div className="auth-pin-header">
                    <span>{t('auth.pinGenerated')}</span>
                  </div>
                  <p className="auth-pin-value">{generatedPin}</p>
                  {pinCopied && (
                    <p className="auth-pin-copied">{t('chat.pinCopied')}</p>
                  )}
                </div>

                <div className="auth-warning">
                  <span>{t('auth.savePinWarning')}</span>
                </div>
              </div>

              <div className="auth-buttons">
                <Button onClick={handleRegistrationComplete}>
                  {t('auth.continueBtn')}
                </Button>
              </div>
            </div>
          )}
        </div>

        <style>{`
          .auth-container {
            padding: 1rem 0;
          }

          .auth-field {
            margin-bottom: 1rem;
          }

          .auth-field label {
            display: block;
            margin-bottom: 0.5rem;
            font-weight: 500;
            color: var(--text-primary, #333);
          }

          .auth-info {
            margin-bottom: 1.5rem;
            text-align: center;
          }

          .auth-info p {
            margin: 0.5rem 0;
            color: var(--text-secondary, #666);
          }

          .auth-username {
            font-size: 1.25rem;
            font-weight: bold;
            color: var(--primary-color, #007bff);
            margin: 0.75rem 0 !important;
          }

          .auth-hint {
            padding: 0.75rem;
            margin-bottom: 0.75rem;
            background: #f0f7ff;
            border: 1px solid #b3d9ff;
            border-radius: 6px;
            color: #0066cc;
            font-size: 0.85rem;
            line-height: 1.4;
          }

          .auth-test-warning {
            padding: 0.75rem;
            margin-bottom: 1rem;
            background: #fff3cd;
            border: 1px solid #ffd966;
            border-radius: 6px;
            color: #856404;
            font-size: 0.85rem;
            line-height: 1.4;
          }

          .auth-error {
            padding: 0.75rem;
            margin-bottom: 1rem;
            background: #fee;
            border: 1px solid #fcc;
            border-radius: 6px;
            color: #c33;
            font-size: 0.9rem;
          }

          .auth-buttons {
            display: flex;
            gap: 0.75rem;
            justify-content: flex-end;
            margin-top: 1.5rem;
          }

          .auth-success {
            text-align: center;
          }

          .auth-welcome {
            font-size: 1.1rem;
            color: var(--text-secondary, #666);
            margin-bottom: 0.5rem;
          }

          .auth-pin-box {
            background: #f0f7ff;
            border: 2px solid #007bff;
            border-radius: 8px;
            padding: 1.5rem;
            margin: 1.5rem 0;
          }

          .auth-pin-header {
            font-size: 0.9rem;
            color: var(--text-secondary, #666);
            margin-bottom: 0.75rem;
          }

          .auth-pin-value {
            font-size: 1.75rem;
            font-weight: bold;
            font-family: monospace;
            color: #007bff;
            letter-spacing: 0.1em;
            user-select: all;
            margin: 0;
          }

          .auth-pin-copied {
            margin-top: 0.75rem;
            padding: 0.5rem;
            background: #d4edda;
            border: 1px solid #c3e6cb;
            border-radius: 4px;
            color: #155724;
            font-size: 0.85rem;
            text-align: center;
          }

          .auth-warning {
            padding: 0.75rem;
            background: #fff3cd;
            border: 1px solid #ffd966;
            border-radius: 6px;
            color: #856404;
            font-weight: 500;
            font-size: 0.9rem;
            margin-top: 1rem;
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
};

export default AuthDialog;
