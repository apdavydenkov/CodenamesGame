import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./Dialog";
import { Button } from "./Button";
import { Input } from "./Input";
import { FiSend, FiX } from "react-icons/fi";
import { useTranslation } from "../hooks/useTranslation";

const ChatDialog = ({ isOpen, onClose, gameKey, socket, userId, username, unreadCounts, onMarkAsRead, activeTab, onTabChange, onLogout }) => {
  const { t } = useTranslation();
  const [messagesCache, setMessagesCache] = useState({}); // Кеш сообщений по ключам
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleChangeName = useCallback(async () => {
    const newName = prompt(t('chat.changeNamePrompt'), username);

    if (!newName || newName === username || newName.trim().length < 2) {
      return;
    }

    // Получаем PIN из localStorage
    const pin = localStorage.getItem('codenames-pin');
    if (!pin) {
      alert('Ошибка: PIN-код не найден. Перезайдите в чат.');
      return;
    }

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3050';

    try {
      const response = await fetch(`${apiUrl}/api/auth/change-name`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, newUsername: newName.trim(), pin })
      });

      const result = await response.json();

      if (result.success) {
        localStorage.setItem('codenames-username', result.newUsername);
        alert(t('chat.nameChanged'));
        window.location.reload(); // Перезагрузка для обновления username
      } else {
        alert(result.error || t('chat.nameChangeError'));
      }
    } catch {
      alert(t('chat.nameChangeError'));
    }
  }, [userId, username, t]);

  const currentChatKey = useMemo(() => {
    return activeTab === 'global' ? 'GLOBAL_CHAT' : gameKey;
  }, [activeTab, gameKey]);

  const messages = messagesCache[currentChatKey] || [];

  // Обнуление счётчика при открытии или переключении вкладки
  useEffect(() => {
    if (isOpen && onMarkAsRead) {
      const chatKey = activeTab === 'global' ? 'global' : 'game';
      onMarkAsRead(chatKey);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, activeTab]);

  // Подключение к чату и обработка сообщений (всегда активно, не зависит от isOpen)
  useEffect(() => {
    if (!socket) return;


    // Слушаем историю чата
    const handleChatHistory = ({ gameKey: historyGameKey, messages: historyMessages }) => {

      setMessagesCache(prev => {
        const cachedMessages = prev[historyGameKey] || [];
        const cachedCount = cachedMessages.length;


        // Если кеш пустой - просто записываем историю
        if (cachedCount === 0) {
          return {
            ...prev,
            [historyGameKey]: historyMessages
          };
        }

        // Мерджим сообщения: берём уникальные по ID
        const cachedIds = new Set(cachedMessages.map(m => m.id));
        const newMessages = historyMessages.filter(m => !cachedIds.has(m.id));

        if (newMessages.length > 0) {

          // Триггерим NEW_MESSAGE события для каждого нового сообщения
          // Это активирует существующую логику подсчёта в App.jsx
          newMessages.forEach(message => {
            // Вызываем все обработчики NEW_MESSAGE вручную через socket._callbacks
            const callbacks = socket._callbacks?.$NEW_MESSAGE || [];
            callbacks.forEach(cb => cb(message));
          });

          return {
            ...prev,
            [historyGameKey]: [...cachedMessages, ...newMessages]
          };
        } else {
          return prev;
        }
      });
    };

    // Слушаем новые сообщения
    const handleNewMessage = (message) => {
      const targetChatKey = message.gameKey;

      setMessagesCache(prev => {
        const chatMessages = prev[targetChatKey] || [];

        // Избегаем дубликатов
        if (chatMessages.some((m) => m.id === message.id)) {
          return prev;
        }

        return {
          ...prev,
          [targetChatKey]: [...chatMessages, message]
        };
      });
    };

    // Слушаем ошибки
    const handleChatError = ({ message: errorMessage }) => {
      alert(errorMessage);
    };

    socket.on("CHAT_HISTORY", handleChatHistory);
    socket.on("NEW_MESSAGE", handleNewMessage);
    socket.on("CHAT_ERROR", handleChatError);

    return () => {
      socket.off("CHAT_HISTORY", handleChatHistory);
      socket.off("NEW_MESSAGE", handleNewMessage);
      socket.off("CHAT_ERROR", handleChatError);
    };
  }, [socket]);

  const handleSendMessage = useCallback((e) => {
    e.preventDefault();

    if (!inputText.trim()) return;

    if (inputText.length > 500) {
      alert(t('chat.messageTooLong'));
      return;
    }

    setIsSending(true);

    // Получаем PIN из localStorage
    const pin = localStorage.getItem('codenames-pin');
    if (!pin) {
      alert('Ошибка: PIN-код не найден. Перезайдите в чат.');
      setIsSending(false);
      return;
    }

    const messageData = {
      gameKey: currentChatKey,
      userId: userId,
      author: username,
      text: inputText.trim(),
      pin: pin,
    };


    socket.emit("SEND_MESSAGE", messageData);

    // Очищаем поле ввода
    setInputText("");
    setIsSending(false);
  }, [currentChatKey, userId, username, inputText, socket, t]);

  const formatTime = useCallback((timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="chat-dialog-content">
        <DialogHeader>
          <div className="chat-header-content">
            <DialogTitle>{t('chat.title')}</DialogTitle>
            <div className="chat-header-user">
              <span className="chat-greeting">
                {t('chat.hello')}, <strong onClick={handleChangeName} style={{cursor: 'pointer'}} title={t('chat.changeNameHint')}>{username}</strong>
              </span>
              <button onClick={onLogout} className="chat-logout-btn-header">
                {t('chat.logout')}
              </button>
              <button onClick={onClose} className="chat-close-button" aria-label="Close">
                <FiX size={20} />
              </button>
            </div>
          </div>
        </DialogHeader>
        <div className="chat-container">
        {/* Вкладки */}
        <div className="chat-tabs">
          <button
            className={`chat-tab ${activeTab === 'game' ? 'active' : ''}`}
            onClick={() => onTabChange('game')}
          >
            {t('chat.tabGame')}
            {unreadCounts && unreadCounts.game > 0 && (
              <span className="tab-badge">+{unreadCounts.game}</span>
            )}
          </button>
          <button
            className={`chat-tab ${activeTab === 'global' ? 'active' : ''}`}
            onClick={() => onTabChange('global')}
          >
            {t('chat.tabGlobal')}
            {unreadCounts && unreadCounts.global > 0 && (
              <span className="tab-badge">+{unreadCounts.global}</span>
            )}
          </button>
        </div>

        {/* История сообщений */}
        <div className="chat-messages">
          {messages.length === 0 ? (
            <div className="chat-empty">{t('chat.noMessages')}</div>
          ) : (
            [...messages].reverse().map((message) => {
              const isOwnMessage = message.userId === userId;
              return (
                <div
                  key={message.id}
                  className={`chat-message ${isOwnMessage ? 'own-message' : 'other-message'}`}
                >
                  <div className="chat-message-content">
                    {!isOwnMessage && (
                      <span className="chat-message-author">{message.author}:</span>
                    )}
                    {!isOwnMessage && ' '}
                    <span className="chat-message-text">{message.text}</span>
                  </div>
                  <div className="chat-message-time">
                    {formatTime(message.timestamp)}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Форма отправки */}
        <form className="chat-input-form" onSubmit={handleSendMessage}>
          <Input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={t('chat.typeMessage')}
            maxLength={500}
            disabled={isSending}
          />
          <Button
            type="submit"
            disabled={!inputText.trim() || isSending}
            className="chat-send-button"
          >
            <FiSend size={20} />
          </Button>
        </form>
      </div>

      <style>{`
        /* Мобильные стили для диалога */
        @media (max-width: 768px) {
          .dialog-overlay {
            padding: 0 !important;
          }

          .dialog {
            width: 100vw !important;
            max-width: 100vw !important;
            height: 100dvh !important;
            max-height: 100dvh !important;
            border-radius: 0 !important;
            margin: 0 !important;
          }

          .chat-dialog-content {
            padding: 0 !important;
            height: 100dvh;
            display: flex;
            flex-direction: column;
            overflow: hidden;
          }

          .chat-dialog-content > * {
            padding-bottom: 0 !important;
          }

          .dialog-header {
            margin-bottom: 0 !important;
            flex-shrink: 0;
            padding: 0.5rem 0.75rem !important;
          }

          .chat-container {
            padding: 0 !important;
            flex: 1;
            min-height: 0;
          }

          .chat-tabs {
            margin-left: 0;
            margin-right: 0;
          }

          .chat-messages {
            margin-left: 0;
            margin-right: 0;
          }

          .chat-input-form {
            margin: 0 !important;
            border-radius: 0 !important;
          }
        }

        /* Заголовок чата */
        .chat-header-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          position: relative;
        }

        .chat-header-user {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.85rem;
        }

        @media (max-width: 768px) {
          .chat-header-user {
            font-size: 0.75rem;
            gap: 0.4rem;
          }
        }

        .chat-greeting {
          color: var(--text-secondary, #666);
          white-space: nowrap;
        }

        .chat-greeting strong {
          color: #8b5cf6;
          font-weight: 600;
        }

        .chat-logout-btn-header {
          padding: 0.25rem 0.5rem;
          background: transparent;
          border: 1px solid #000;
          border-radius: 4px;
          color: #000;
          font-size: 0.75rem;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .chat-logout-btn-header:hover {
          background: #000;
          color: white;
        }

        @media (max-width: 768px) {
          .chat-logout-btn-header {
            padding: 0.2rem 0.4rem;
            font-size: 0.7rem;
          }
        }

        .chat-close-button {
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

        .chat-close-button:hover {
          color: var(--text-primary, #333);
        }

        .chat-container {
          display: flex;
          flex-direction: column;
          height: 500px;
          max-height: 70vh;
        }

        @media (max-width: 768px) {
          .chat-container {
            height: 100%;
            max-height: 100%;
            flex: 1;
          }
        }

        .chat-tabs {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
          border-bottom: 2px solid var(--border-color, #ddd);
          flex-shrink: 0;
        }

        .chat-tab {
          position: relative;
          padding: 0.5rem 0.75rem;
          background: transparent;
          border: none;
          border-bottom: 2px solid transparent;
          cursor: pointer;
          font-size: 0.9rem;
          color: var(--text-secondary, #666);
          transition: all 0.2s;
          margin-bottom: -2px;
        }

        @media (max-width: 768px) {
          .chat-tab {
            padding: 0.4rem 0.6rem;
            font-size: 0.85rem;
          }
        }

        .chat-tab:hover {
          color: #8b5cf6;
        }

        .chat-tab.active {
          color: #8b5cf6;
          border-bottom-color: #8b5cf6;
          font-weight: bold;
        }

        .tab-badge {
          display: inline-block;
          margin-left: 0.5rem;
          color: #8b5cf6;
          font-size: 12px;
          font-weight: bold;
        }

        .chat-messages {
          flex: 1;
          overflow-y: auto;
          border: 1px solid var(--border-color, #ddd);
          border-radius: 8px;
          padding: 0.75rem;
          margin-bottom: 0.75rem;
          background: var(--bg-secondary, #f9f9f9);
          display: flex;
          flex-direction: column-reverse;
        }

        @media (max-width: 768px) {
          .chat-messages {
            padding: 0.5rem;
            margin-bottom: 0;
            border-radius: 0;
            min-height: 0;
          }
        }

        .chat-empty {
          text-align: center;
          color: var(--text-secondary, #999);
          padding: 2rem;
        }

        .chat-message {
          position: relative;
          margin-bottom: 0.6rem;
          padding: 0.6rem;
          padding-bottom: 1.4rem;
          border-radius: 12px;
          box-shadow: none;
          max-width: 75%;
          min-width: 30%;
          width: fit-content;
        }

        @media (max-width: 768px) {
          .chat-message {
            margin-bottom: 0.4rem;
            padding: 0.4rem;
            padding-bottom: 1.2rem;
            border-radius: 8px;
            max-width: 85%;
          }
        }

        .own-message {
          background: #8b5cf6;
          color: white;
          margin-left: auto;
          border-bottom-right-radius: 0;
          position: relative;
        }

        .own-message::after {
          content: '';
          position: absolute;
          bottom: 0;
          right: -8px;
          width: 0;
          height: 0;
          border-style: solid;
          border-width: 6px 0 6px 8px;
          border-color: transparent transparent transparent #8b5cf6;
        }

        .other-message {
          background: white;
          color: var(--text-primary, #333);
          margin-right: auto;
          border-bottom-left-radius: 0;
          position: relative;
          border: 1px solid #e0e0e0;
        }

        .other-message::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: -7px;
          width: 0;
          height: 0;
          border-style: solid;
          border-width: 6px 7px 6px 0;
          border-color: transparent white transparent transparent;
        }

        .other-message::before {
          content: '';
          position: absolute;
          bottom: -1px;
          left: -9px;
          width: 0;
          height: 0;
          border-style: solid;
          border-width: 7px 9px 7px 0;
          border-color: transparent #e0e0e0 transparent transparent;
        }

        .chat-message-content {
          line-height: 1.4;
          word-wrap: break-word;
        }

        .chat-message-author {
          font-weight: bold;
          color: #8b5cf6;
        }

        .own-message .chat-message-text {
          color: white;
        }

        .other-message .chat-message-text {
          color: var(--text-primary, #333);
        }

        .chat-message-time {
          position: absolute;
          bottom: 0.25rem;
          right: 0.5rem;
          font-size: 0.7rem;
        }

        .own-message .chat-message-time {
          color: rgba(255, 255, 255, 0.7);
        }

        .other-message .chat-message-time {
          color: var(--text-secondary, #999);
        }

        .chat-input-form {
          display: flex;
          gap: 0;
          margin-top: 0.5rem;
          margin-bottom: 0.5rem;
        }

        @media (max-width: 768px) {
          .chat-input-form {
            margin-top: 0;
            margin-bottom: 0;
            flex-shrink: 0;
          }
        }

        .chat-input-form input {
          flex: 1;
          border-top-right-radius: 0;
          border-bottom-right-radius: 0;
          border-right: none;
          height: 42px;
        }

        .chat-input-form input:focus {
          outline: none;
          border-color: #000;
          box-shadow: 0 0 0 1px #000;
        }

        @media (max-width: 768px) {
          .chat-input-form input {
            border-top-left-radius: 0;
            border-bottom-left-radius: 0;
          }
        }

        .chat-send-button {
          padding: 0 1rem;
          border-top-left-radius: 0;
          border-bottom-left-radius: 0;
          height: 42px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #000 !important;
          border-color: #000 !important;
        }

        .chat-send-button:hover:not(:disabled) {
          background: #333 !important;
          border-color: #333 !important;
        }

        @media (max-width: 768px) {
          .chat-send-button {
            border-top-right-radius: 0;
            border-bottom-right-radius: 0;
          }
        }
      `}</style>
      </DialogContent>
    </Dialog>
  );
};

export default ChatDialog;
