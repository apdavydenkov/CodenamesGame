import { useState } from "react";
import { FiX } from "react-icons/fi";
import { useTranslation } from "../../hooks/useTranslation";

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
      <div className="flex flex-col h-full sm:h-auto sm:max-h-[calc(100vh-2rem)] w-full max-w-md bg-white sm:rounded-lg">

        {/* HEADER */}
        <div className="settings-dialog-header flex items-center justify-between border-b border-gray-200 px-3 sm:px-4">
          <h2 className="text-base font-semibold text-gray-900">
            {t('chat.settings')}
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
        <div className="settings-dialog-content flex-1 overflow-y-auto px-3 sm:px-4 py-4 space-y-2 sm:space-y-4 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-gray-400">

          {/* Current User */}
          <div className="text-sm text-gray-600">
            {t('chat.currentUser')}: <strong className="text-gray-900">{username}</strong>
          </div>

          {/* PIN Section */}
          <div className="space-y-1 sm:space-y-2">
            <label className="block text-sm font-medium text-gray-900">
              {t('chat.yourPin')}
            </label>
            <div className="flex gap-2 sm:gap-4">
              <input
                type="text"
                value={pin || ''}
                readOnly
                className="flex-1 min-w-0 rounded-lg border border-gray-300 bg-gray-50 px-3 sm:px-4 py-2 text-sm text-gray-900 cursor-default"
              />
              <button
                onClick={handleCopyPin}
                className="flex-shrink-0 rounded-lg border border-gray-200 bg-white px-3 sm:px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 cursor-pointer"
              >
                {t('chat.copy')}
              </button>
            </div>
            <p className="text-xs sm:text-sm font-medium text-red-600">
              {t('auth.savePinWarning')}
            </p>
          </div>

          {/* Change Name Section */}
          <div className="space-y-1 sm:space-y-2">
            <label className="block text-sm font-medium text-gray-900">
              {t('chat.changeName')}
            </label>
            <div className="flex gap-2 sm:gap-4">
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder={username}
                maxLength={50}
                className="flex-1 min-w-0 rounded-lg border border-gray-300 bg-white px-3 sm:px-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
              <button
                onClick={handleChangeName}
                disabled={!newUsername.trim() || isChangingName}
                className="flex-shrink-0 rounded-lg bg-gray-900 px-3 sm:px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {t('chat.save')}
              </button>
            </div>
          </div>

          {/* Stats Section */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-1 sm:space-y-2">
            <h3 className="text-base font-medium text-gray-900">
              {t('chat.profileStats')}
            </h3>
            <div className="space-y-1">
              <div className="flex justify-between text-sm text-gray-600">
                <span>{t('chat.gamesPlayed')}:</span>
                <span className="font-medium text-gray-400">{t('chat.inDevelopment')}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>{t('chat.gamesWon')}:</span>
                <span className="font-medium text-gray-400">{t('chat.inDevelopment')}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>{t('chat.winRate')}:</span>
                <span className="font-medium text-gray-400">{t('chat.inDevelopment')}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>{t('chat.favoriteRole')}:</span>
                <span className="font-medium text-gray-400">{t('chat.inDevelopment')}</span>
              </div>
            </div>
          </div>

        </div>

        {/* FOOTER */}
        <div className="settings-dialog-footer border-t border-gray-200 px-3 sm:px-4 py-2">
          <button
            onClick={() => {
              onLogout();
              onClose();
            }}
            className="w-full rounded-lg border border-red-600 bg-white px-3 sm:px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 cursor-pointer"
          >
            {t('chat.logoutWithPin')}
          </button>
        </div>

      </div>
    </div>
  );
};

export default SettingsDialog;
