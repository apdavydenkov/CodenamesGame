import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./Dialog";
import { Button } from "./Button";
import { Input } from "./Input";
import { FiSend, FiX, FiSettings, FiStar } from "react-icons/fi";
import { useTranslation } from "../hooks/useTranslation";
import SettingsDialog from "./SettingsDialog";

const ChatDialog = ({
  isOpen,
  onClose,
  gameKey,
  socket,
  userId,
  username,
  unreadCounts,
  lastReadMessageIds,
  onMarkAsRead,
  onUpdateUnreadCount,
  activeTab,
  onTabChange,
  onLogout,
  canAccessGame = true
}) => {
  const { t } = useTranslation();
  const [messagesCache, setMessagesCache] = useState({}); // Кеш сообщений по ключам
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);


  const currentChatKey = useMemo(() => {
    return activeTab === 'global' ? 'GLOBAL_CHAT' : gameKey;
  }, [activeTab, gameKey]);

  const messages = Array.isArray(messagesCache[currentChatKey])
    ? messagesCache[currentChatKey]
    : [];

  // Принудительное переключение на глобальную вкладку если нет доступа к игре
  useEffect(() => {
    if (!canAccessGame && activeTab === 'game') {
      onTabChange('global');
    }
  }, [canAccessGame, activeTab, onTabChange]);

  // Обновление lastReadMessageId при открытии или переключении вкладки
  useEffect(() => {
    if (isOpen && onMarkAsRead && messages.length > 0) {
      const chatKey = activeTab === 'global' ? 'global' : 'game';
      const lastMessage = messages[messages.length - 1];

      // Обновляем lastReadMessageId на ID последнего сообщения
      onMarkAsRead(chatKey, lastMessage.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, activeTab, messages.length]);

  // Подключение к чату и обработка сообщений (всегда активно, не зависит от isOpen)
  useEffect(() => {
    if (!socket) return;


    // Слушаем историю чата
    const handleChatHistory = ({ gameKey: historyGameKey, messages: historyMessages }) => {
      console.log('[ChatDialog] CHAT_HISTORY received:', {
        gameKey: historyGameKey,
        messagesCount: Array.isArray(historyMessages) ? historyMessages.length : 'NOT_ARRAY',
        messagesType: typeof historyMessages,
        firstMessage: Array.isArray(historyMessages) && historyMessages[0]
      });

      // Защита от невалидных данных
      if (!Array.isArray(historyMessages)) {
        console.error('[ChatDialog] historyMessages is not an array!', historyMessages);
        return;
      }

      // Определяем chatKey для lastReadMessageIds
      const chatKey = historyGameKey === 'GLOBAL_CHAT' ? 'global' : 'game';
      const lastReadId = lastReadMessageIds?.[chatKey];
      const cachedMessages = messagesCache[historyGameKey] || [];
      const cachedCount = cachedMessages.length;

      // Вычисляем счётчик непрочитанных ДО обновления кеша
      let unreadCountToSet = null;

      // Если кеш пустой - подсчитываем непрочитанные на основе lastReadMessageId
      if (cachedCount === 0) {
        if (lastReadId && historyMessages.length > 0) {
          const lastReadIndex = historyMessages.findIndex(m => m.id === lastReadId);

          if (lastReadIndex !== -1) {
            // Считаем все сообщения ПОСЛЕ lastReadId как непрочитанные
            unreadCountToSet = historyMessages.length - lastReadIndex - 1;
          } else {
            // lastReadId не найден в истории (старое сообщение удалено)
            // Считаем все сообщения непрочитанными
            unreadCountToSet = historyMessages.length;
          }
        } else if (!lastReadId && historyMessages.length > 0) {
          // Первый визит - все сообщения непрочитанные
          unreadCountToSet = historyMessages.length;
        }
      }

      // Обновляем кеш (БЕЗ вызовов setState внутри)
      setMessagesCache(prev => {
        const cachedMessages = prev[historyGameKey] || [];

        // Если кеш пустой - просто записываем историю
        if (cachedMessages.length === 0) {
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

      // Обновляем счётчик ПОСЛЕ обновления кеша
      if (unreadCountToSet !== null && unreadCountToSet > 0) {
        onUpdateUnreadCount(prevCounts => ({
          ...prevCounts,
          [chatKey]: unreadCountToSet
        }));
      }
    };

    // Слушаем новые сообщения
    const handleNewMessage = (message) => {
      console.log('[ChatDialog] NEW_MESSAGE received:', {
        gameKey: message.gameKey,
        author: message.author,
        team: message.team,
        role: message.role,
        text: message.text?.substring(0, 30)
      });

      const targetChatKey = message.gameKey;

      setMessagesCache(prev => {
        const chatMessages = prev[targetChatKey] || [];
        console.log('[ChatDialog] Current cache for', targetChatKey, ':', chatMessages.length, 'messages');

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
  }, [socket, lastReadMessageIds, onUpdateUnreadCount]);

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

    setInputText("");
    setIsSending(false);
  }, [currentChatKey, userId, username, inputText, socket, t]);

  const formatTime = useCallback((timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, []);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        {/* Шапка (фиксированная) */}
        <div className="chat-header-fixed">
            <DialogHeader>
              <div className="chat-header-content">
                <DialogTitle className="chat-title-greeting">
                  {t('chat.hello')}, <span className="chat-username">{username}</span>
                  <button onClick={() => setShowSettingsDialog(true)} className="chat-settings-button" aria-label="Settings">
                    <FiSettings size={18} />
                  </button>
                </DialogTitle>
                <button onClick={onClose} className="chat-close-button" aria-label="Close">
                  <FiX size={20} />
                </button>
              </div>
            </DialogHeader>

          {/* Вкладки */}
          <div className="chat-tabs">
            {canAccessGame && (
              <button
                className={`chat-tab ${activeTab === 'game' ? 'active' : ''}`}
                onClick={() => onTabChange('game')}
              >
                {t('chat.tabGame')}
                {unreadCounts && unreadCounts.game > 0 && (
                  <span className="tab-badge">+{unreadCounts.game}</span>
                )}
              </button>
            )}
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
        </div>

        {/* История сообщений (прокручивается)  */}
        <div className="chat-messages-scrollable">
          {messages.length === 0 ? (
            <div className="chat-empty">{t('chat.noMessages')}</div>
          ) : (
            [...messages].reverse().map((message) => {
              const isOwnMessage = message.userId === userId;
              const teamClass = message.team ? `team-${message.team}` : '';
              return (
                <div
                  key={message.id}
                  className={`chat-message ${isOwnMessage ? 'own-message' : 'other-message'} ${teamClass}`}
                >
                  <div className="chat-message-content">
                    {!isOwnMessage && (
                      <span className="chat-message-author">
                        {message.role === 'captain' && (
                          <FiStar height="16" width="16" style={{ marginRight: '4px', marginBottom: '2px', verticalAlign: 'middle' }} />
                        )}
                        {message.author}:
                      </span>
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

        {/* Форма ввода (фиксированная внизу) */}
        <div className="chat-input-fixed">
          <form className="chat-input-form" onSubmit={handleSendMessage}>
            <Input
              type="search"
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
              onMouseDown={(e) => e.preventDefault()}
            >
              <FiSend size={20} />
            </Button>
          </form>
        </div>

      <style>{`
        /* Базовая структура чата */
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

        .chat-header-fixed {
          flex-shrink: 0;
          background: white;
          z-index: 10;
        }

        .chat-messages-scrollable {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 0.75rem;
          display: flex;
          flex-direction: column-reverse;
        }

        .chat-input-fixed {
          flex-shrink: 0;
          background: white;
          z-index: 10;
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
            height: calc(100dvh - env(keyboard-inset-height, 0px)) !important;
            max-height: 100dvh !important;
            border-radius: 0 !important;
            margin: 0 !important;
          }

          .dialog-header {
            padding: 0.5rem 0.75rem 0 0.75rem !important;
            margin-bottom: 0 !important;
            position: relative;
          }

          .chat-tabs {
            margin: 0;
            padding: 0 0.75rem;
          }

          .chat-messages-scrollable {
            padding: 0.75rem;
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
          gap: 0.5rem;
          position: relative;
        }

        .chat-title-greeting {
          flex: 1;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: inherit;
          font-weight: inherit;
          display: flex;
          align-items: center;
        }

        .chat-username {
          color: inherit;
          font-weight: inherit;
        }

        .chat-settings-button {
          background: transparent;
          border: none;
          cursor: pointer;
          color: inherit;
          padding: 0;
          margin-left: 0.5rem;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: opacity 0.2s;
          flex-shrink: 0;
          line-height: 1;
          position: relative;
          top: 2px;
          -webkit-tap-highlight-color: transparent;
          user-select: none;
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
        }

        .chat-settings-button:hover {
          opacity: 0.7;
        }

        .chat-settings-popup {
          position: absolute;
          left: 0.75rem;
          margin-top: 0.5rem;
          background: white;
          border: 1px solid #ddd;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          z-index: 100;
          min-width: 150px;
        }

        .chat-settings-option {
          display: block;
          width: 100%;
          padding: 0.75rem 1rem;
          background: transparent;
          border: none;
          text-align: left;
          cursor: pointer;
          font-size: 0.9rem;
          transition: background 0.2s;
        }

        .chat-settings-option:first-child {
          border-radius: 8px 8px 0 0;
        }

        .chat-settings-option:last-child {
          border-radius: 0 0 8px 8px;
        }

        .chat-settings-option:hover {
          background: #f3f4f6;
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

        .chat-tabs {
          display: flex;
          gap: 0.5rem;
          padding: 0 0.75rem;
          border-bottom: 2px solid var(--border-color, #ddd);
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
          border: 1px solid var(--border-color, #ddd);
          border-radius: 8px;
          background: var(--bg-secondary, #f9f9f9);
          display: flex;
          flex-direction: column-reverse;
          min-height: 0;
        }

        @media (max-width: 768px) {
          .chat-messages {
            border-radius: 0;
            border-left: none;
            border-right: none;
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
          position: relative;
        }

        .own-message::after {
          content: '';
          position: absolute;
          bottom: 10px;
          right: -8px;
          width: 0;
          height: 0;
          border-style: solid;
          border-width: 6px 0 6px 8px;
          border-color: transparent transparent transparent #8b5cf6;
        }

        .other-message {
          background: #e0e0e0;
          color: var(--text-primary, #333);
          margin-right: auto;
          position: relative;
        }

        .other-message::before {
          content: '';
          position: absolute;
          bottom: 10px;
          left: -8px;
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

        /* Цвета команд для сообщений - окрашиваем пузырь */
        .other-message.team-blue {
          background-color: #2563eb;
        }

        .other-message.team-blue .chat-message-author,
        .other-message.team-blue .chat-message-text {
          color: white;
        }

        .other-message.team-blue::before {
          border-color: transparent #2563eb transparent transparent;
        }

        .other-message.team-red {
          background-color: #dc2626;
        }

        .other-message.team-red .chat-message-author,
        .other-message.team-red .chat-message-text {
          color: white;
        }

        .other-message.team-red::before {
          border-color: transparent #dc2626 transparent transparent;
        }

        .other-message.team-spectator {
          background-color: #e4d6c5;
        }

        .other-message.team-spectator .chat-message-author,
        .other-message.team-spectator .chat-message-text {
          color: #374151;
        }

        .other-message.team-spectator::before {
          border-color: transparent #e4d6c5 transparent transparent;
        }

        .other-message.team-blue .chat-message-time,
        .other-message.team-red .chat-message-time {
          color: rgba(255, 255, 255, 0.7);
        }

        .other-message.team-spectator .chat-message-time {
          color: rgba(55, 65, 81, 0.6);
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
          box-shadow: none;
        }

        @media (max-width: 768px) {
          .chat-input-form input {
            border-radius: 0;
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
    </Dialog>

    <SettingsDialog
      isOpen={showSettingsDialog}
      onClose={() => setShowSettingsDialog(false)}
      userId={userId}
      username={username}
      onLogout={onLogout}
      onBackToGame={() => {
        setShowSettingsDialog(false);
        onClose();
      }}
    />
    </>
  );
};

export default ChatDialog;
