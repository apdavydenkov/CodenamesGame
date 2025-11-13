import { useState } from "react";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
} from "./Dialog";
import { Button } from "./Button";
import { Input } from "./Input";
import { FiX } from "react-icons/fi";
import { useTranslation } from "../hooks/useTranslation";

const SettingsDialog = ({ isOpen, onClose, userId, username, onLogout, onBackToGame }) => {
  const { t } = useTranslation();
  const [newUsername, setNewUsername] = useState("");
  const [isChangingName, setIsChangingName] = useState(false);

  const pin = localStorage.getItem('codenames-pin');

  const handleChangeName = async () => {
    if (!newUsername.trim() || newUsername.trim().length < 2) {
      alert(t('chat.nameChangeError'));
      return;
    }

    if (!pin) {
      alert('Ошибка: PIN-код не найден. Перезайдите в чат.');
      return;
    }

    setIsChangingName(true);

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3050';

    try {
      const response = await fetch(`${apiUrl}/api/auth/change-name`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, newUsername: newUsername.trim(), pin })
      });

      const result = await response.json();

      if (result.success) {
        localStorage.setItem('codenames-username', result.newUsername);
        alert(t('chat.nameChanged'));
        window.location.reload();
      } else {
        alert(result.error || t('chat.nameChangeError'));
      }
    } catch {
      alert(t('chat.nameChangeError'));
    } finally {
      setIsChangingName(false);
    }
  };

  const handleCopyPin = () => {
    if (pin) {
      navigator.clipboard.writeText(pin);
      alert(t('chat.pinCopied'));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      {/* Шапка (фиксированная) */}
      <div className="settings-header-fixed">
        <DialogHeader>
          <div className="settings-header-content">
            <DialogTitle>{t('chat.settings')}</DialogTitle>
            <button onClick={onClose} className="settings-close-button" aria-label="Close">
              <FiX size={20} />
            </button>
          </div>
        </DialogHeader>
      </div>

      {/* Контент (прокручивается) */}
      <div className="settings-content-scrollable">
        {/* Текущий пользователь */}
        <div className="settings-user-info">
          {t('chat.currentUser')}: <strong>{username}</strong>
        </div>

        {/* PIN код */}
        <div className="settings-section">
          <label className="label settings-label">
            {t('chat.yourPin')}
          </label>
          <div className="settings-input-row">
            <Input
              value={pin || ''}
              readOnly
              style={{ flex: 1 }}
            />
            <Button variant="outline" onClick={handleCopyPin}>
              {t('chat.copy')}
            </Button>
          </div>
          <p className="settings-warning">
            {t('auth.savePinWarning')}
          </p>
        </div>

        {/* Смена имени */}
        <div className="settings-section">
          <label className="label settings-label">
            {t('chat.changeName')}
          </label>
          <div className="settings-input-row">
            <Input
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              placeholder={username}
              maxLength={50}
              style={{ flex: 1 }}
            />
            <Button
              onClick={handleChangeName}
              disabled={!newUsername.trim() || isChangingName}
            >
              {t('chat.save')}
            </Button>
          </div>
        </div>

        {/* Кнопки навигации */}
        <div className="settings-nav-buttons">
          <Button
            variant="outline"
            onClick={onClose}
            style={{ flex: 1 }}
          >
            {t('chat.backToChat')}
          </Button>

          <Button
            variant="outline"
            onClick={onBackToGame}
            style={{ flex: 1 }}
          >
            {t('chat.backToGame')}
          </Button>
        </div>

        {/* Статистика профиля */}
        <div className="settings-stats">
          <h3 className="settings-stats-title">
            {t('chat.profileStats')}
          </h3>
          <div className="settings-stats-grid">
            <div className="settings-stat-row">
              <span>{t('chat.gamesPlayed')}:</span>
              <span className="settings-stat-value">{t('chat.inDevelopment')}</span>
            </div>
            <div className="settings-stat-row">
              <span>{t('chat.gamesWon')}:</span>
              <span className="settings-stat-value">{t('chat.inDevelopment')}</span>
            </div>
            <div className="settings-stat-row">
              <span>{t('chat.winRate')}:</span>
              <span className="settings-stat-value">{t('chat.inDevelopment')}</span>
            </div>
            <div className="settings-stat-row">
              <span>{t('chat.favoriteRole')}:</span>
              <span className="settings-stat-value">{t('chat.inDevelopment')}</span>
            </div>
          </div>
        </div>

        {/* Кнопка выхода */}
        <Button
          variant="outline"
          onClick={() => {
            onLogout();
            onClose();
          }}
          className="settings-logout-button"
        >
          {t('chat.logoutWithPin')}
        </Button>
      </div>

      <style>{`
        /* Базовая структура настроек (как у чата) */
        .dialog {
          height: 80vh;
          max-height: 600px;
          display: flex;
          flex-direction: column;
          padding: 1rem;
        }

        @media (max-width: 768px) {
          .dialog {
            padding: 0;
          }
        }

        .settings-header-fixed {
          flex-shrink: 0;
          background: white;
          z-index: 10;
        }

        .settings-content-scrollable {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 0.75rem;
        }

        /* Мобильные стили для диалога */
        @media (max-width: 768px) {
          .dialog-overlay {
            padding: 0 !important;
            align-items: stretch !important;
          }

          .dialog {
            width: 100vw !important;
            max-width: 100vw !important;
            height: 100dvh !important;
            max-height: 100dvh !important;
            border-radius: 0 !important;
            margin: 0 !important;
          }

          .dialog-header {
            padding: 0.5rem 0.75rem 0 0.75rem !important;
            margin-bottom: 0 !important;
            position: relative;
          }

          .settings-content-scrollable {
            padding: 0.75rem;
          }
        }

        /* Заголовок настроек */
        .settings-header-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.5rem;
          position: relative;
        }

        .settings-close-button {
          background: transparent;
          border: none;
          cursor: pointer;
          color: var(--text-secondary, #666);
          padding: 0.25rem;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.2s;
        }

        .settings-close-button:hover {
          color: var(--text-primary, #333);
        }

        /* Информация о пользователе */
        .settings-user-info {
          font-size: 0.875rem;
          color: #6b7280;
          margin-bottom: 1rem;
        }

        .settings-user-info strong {
          color: #111827;
        }

        /* Секции */
        .settings-section {
          margin-bottom: 1rem;
        }

        .settings-label {
          display: block;
          margin-bottom: 0.5rem;
        }

        .settings-input-row {
          display: flex;
          gap: 0.5rem;
        }

        .settings-warning {
          margin-top: 0.5rem;
          font-size: 0.875rem;
          color: #dc2626;
          font-weight: 500;
        }

        /* Навигационные кнопки */
        .settings-nav-buttons {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }

        /* Статистика */
        .settings-stats {
          padding: 1rem;
          background: #f3f4f6;
          border-radius: 0.5rem;
          border: 1px solid #e5e7eb;
          margin-bottom: 1rem;
        }

        .settings-stats-title {
          font-size: 1rem;
          font-weight: 600;
          margin: 0 0 0.75rem 0;
          color: #111827;
        }

        .settings-stats-grid {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .settings-stat-row {
          display: flex;
          justify-content: space-between;
          color: #6b7280;
        }

        .settings-stat-value {
          font-weight: 500;
          color: #9ca3af;
        }

        /* Кнопка выхода */
        .settings-logout-button {
          color: #dc2626;
          border-color: #dc2626;
        }
      `}</style>
    </Dialog>
  );
};

export default SettingsDialog;
