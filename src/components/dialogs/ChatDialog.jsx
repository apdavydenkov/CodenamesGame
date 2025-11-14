import { useState, useEffect, useMemo, useCallback } from "react";
import { FiSend, FiX, FiSettings, FiStar } from "react-icons/fi";
import { useTranslation } from "../../hooks/useTranslation";
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
  const [messagesCache, setMessagesCache] = useState({});
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
      onMarkAsRead(chatKey, lastMessage.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, activeTab, messages.length]);

  // Подключение к чату и обработка сообщений
  useEffect(() => {
    if (!socket) return;

    const handleChatHistory = ({ gameKey: historyGameKey, messages: historyMessages }) => {
      if (!Array.isArray(historyMessages)) {
        return;
      }

      const chatKey = historyGameKey === 'GLOBAL_CHAT' ? 'global' : 'game';
      const lastReadId = lastReadMessageIds?.[chatKey];
      const cachedMessages = messagesCache[historyGameKey] || [];
      const cachedCount = cachedMessages.length;

      let unreadCountToSet = null;

      if (cachedCount === 0) {
        if (lastReadId && historyMessages.length > 0) {
          const lastReadIndex = historyMessages.findIndex(m => m.id === lastReadId);

          if (lastReadIndex !== -1) {
            unreadCountToSet = historyMessages.length - lastReadIndex - 1;
          } else {
            unreadCountToSet = historyMessages.length;
          }
        } else if (!lastReadId && historyMessages.length > 0) {
          unreadCountToSet = historyMessages.length;
        }
      }

      setMessagesCache(prev => {
        const cachedMessages = prev[historyGameKey] || [];

        if (cachedMessages.length === 0) {
          return {
            ...prev,
            [historyGameKey]: historyMessages
          };
        }

        const cachedIds = new Set(cachedMessages.map(m => m.id));
        const newMessages = historyMessages.filter(m => !cachedIds.has(m.id));

        if (newMessages.length > 0) {
          newMessages.forEach(message => {
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

      if (unreadCountToSet !== null && unreadCountToSet > 0) {
        onUpdateUnreadCount(prevCounts => ({
          ...prevCounts,
          [chatKey]: unreadCountToSet
        }));
      }
    };

    const handleNewMessage = (message) => {
      const targetChatKey = message.gameKey;

      setMessagesCache(prev => {
        const chatMessages = prev[targetChatKey] || [];

        if (chatMessages.some((m) => m.id === message.id)) {
          return prev;
        }

        return {
          ...prev,
          [targetChatKey]: [...chatMessages, message]
        };
      });
    };

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

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
        <div className="flex flex-col h-full sm:h-[calc(100vh-2rem)] w-full max-w-2xl bg-white sm:rounded-lg">

          {/* HEADER */}
          <div className="chat-dialog-header flex-shrink-0 flex items-center justify-between border-b border-gray-200 px-3 sm:px-4">
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              {t('chat.hello')}, <span className="font-semibold">{username}</span>
              <button
                onClick={() => setShowSettingsDialog(true)}
                className="rounded-lg p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors cursor-pointer"
                aria-label="Settings"
              >
                <FiSettings size={18} />
              </button>
            </h2>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <FiX size={20} />
            </button>
          </div>

          {/* TABS */}
          <div className="flex-shrink-0 flex gap-2 border-b-2 border-gray-200 px-3 sm:px-4 -mb-[2px] relative z-20 bg-white">
            {canAccessGame && (
              <button
                className={`relative px-3 py-2 text-sm font-medium border-b-2 transition-colors cursor-pointer -mb-[2px] ${
                  activeTab === 'game'
                    ? 'text-purple-600 border-purple-600'
                    : 'text-gray-600 border-transparent hover:text-purple-600'
                }`}
                onClick={() => onTabChange('game')}
              >
                {t('chat.tabGame')}
                {unreadCounts && unreadCounts.game > 0 && (
                  <span className="ml-2 text-xs font-bold text-purple-600">+{unreadCounts.game}</span>
                )}
              </button>
            )}
            <button
              className={`relative px-3 py-2 text-sm font-medium border-b-2 transition-colors cursor-pointer -mb-[2px] ${
                activeTab === 'global'
                  ? 'text-purple-600 border-purple-600'
                  : 'text-gray-600 border-transparent hover:text-purple-600'
              }`}
              onClick={() => onTabChange('global')}
            >
              {t('chat.tabGlobal')}
              {unreadCounts && unreadCounts.global > 0 && (
                <span className="ml-2 text-xs font-bold text-purple-600">+{unreadCounts.global}</span>
              )}
            </button>
          </div>

          {/* BODY */}
          <div className="chat-dialog-content flex-1 overflow-y-auto px-3 sm:px-4 py-4 flex flex-col-reverse bg-gray-50 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-gray-400">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 py-8">{t('chat.noMessages')}</div>
            ) : (
              [...messages].reverse().map((message) => {
                const isOwnMessage = message.userId === userId;
                const teamColorClass = message.team === 'blue' ? 'bg-blue-600' :
                                      message.team === 'red' ? 'bg-red-600' :
                                      message.team === 'spectator' ? 'bg-[#e4d6c5]' :
                                      '';
                const teamClass = message.team ? `chat-message-team-${message.team}` : '';

                return (
                  <div
                    key={message.id}
                    className={`mb-2 sm:mb-3 px-3 py-2 pb-6 rounded-xl relative w-fit max-w-[75%] sm:max-w-[70%] ${
                      isOwnMessage
                        ? 'chat-message-own bg-purple-600 text-white ml-auto'
                        : `chat-message-other ${teamClass} ${teamColorClass || 'bg-gray-200 text-gray-900'}`
                    }`}
                  >
                    <div className="leading-relaxed break-words">
                      {!isOwnMessage && (
                        <span className={`font-bold ${
                          message.team === 'spectator' && !isOwnMessage ? 'text-gray-900' :
                          message.team ? 'text-white' : 'text-purple-600'
                        }`}>
                          {message.role === 'captain' && (
                            <FiStar className="inline mr-1 mb-0.5" size={14} />
                          )}
                          {message.author}:
                        </span>
                      )}
                      {!isOwnMessage && ' '}
                      <span className={
                        isOwnMessage ? 'text-white' :
                        message.team === 'spectator' ? 'text-gray-900' :
                        message.team ? 'text-white' : ''
                      }>
                        {message.text}
                      </span>
                    </div>
                    <div className={`absolute bottom-1 right-2 text-[11px] ${
                      isOwnMessage ? 'text-white/70' :
                      message.team === 'spectator' ? 'text-gray-600' :
                      message.team ? 'text-white/70' : 'text-gray-500'
                    }`}>
                      {formatTime(message.timestamp)}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* FOOTER */}
          <div className="chat-dialog-footer flex-shrink-0 bg-white border-t border-gray-200 sm:rounded-b-lg overflow-hidden relative z-10">
            <form onSubmit={handleSendMessage} className="flex">
              <input
                type="search"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={t('chat.typeMessage')}
                maxLength={500}
                disabled={isSending}
                className="flex-1 border border-gray-300 border-r-0 bg-white px-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-900 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!inputText.trim() || isSending}
                className="px-4 py-2 bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center"
                onMouseDown={(e) => e.preventDefault()}
              >
                <FiSend size={20} />
              </button>
            </form>
          </div>

        </div>
      </div>

      <style>{`
        /* Треугольники для сообщений */
        .chat-message-own::after {
          content: '';
          position: absolute;
          bottom: 10px;
          right: -8px;
          width: 0;
          height: 0;
          border-style: solid;
          border-width: 6px 0 6px 8px;
          border-color: transparent transparent transparent #9333ea;
        }

        .chat-message-other::before {
          content: '';
          position: absolute;
          bottom: 10px;
          left: -8px;
          width: 0;
          height: 0;
          border-style: solid;
          border-width: 7px 9px 7px 0;
          border-color: transparent #e5e7eb transparent transparent;
        }

        .chat-message-other.chat-message-team-blue::before {
          border-color: transparent #2563eb transparent transparent;
        }

        .chat-message-other.chat-message-team-red::before {
          border-color: transparent #dc2626 transparent transparent;
        }

        .chat-message-other.chat-message-team-spectator::before {
          border-color: transparent #e4d6c5 transparent transparent;
        }
      `}</style>

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
