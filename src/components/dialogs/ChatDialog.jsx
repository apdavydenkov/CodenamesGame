import { Fragment, useState, useEffect, useMemo, useCallback, useRef } from "react";
import { FiArrowRight, FiSettings, FiStar } from "react-icons/fi";
import { useTranslation } from "../../hooks/useTranslation";
import { useNotify } from "../../contexts/NotificationContext";
import Dialog, { DialogBody, ICON_BUTTON, TAB, TAB_ACTIVE, TAB_IDLE } from "./Dialog";
import SettingsDialog from "./SettingsDialog";

const MESSAGE_LIMIT = 500;

const BUBBLE = "mb-2 sm:mb-3 w-fit max-w-[75%] sm:max-w-[70%] rounded-xl px-3 py-2 pb-6 relative chat-bubble";
const OWN_BUBBLE = "chat-bubble-own ml-auto bg-[var(--chat-own)] text-ui-panel";
const TEAM_BUBBLE = {
  blue: "bg-[var(--blue-accent)] text-ui-panel",
  red: "bg-[var(--red-accent)] text-ui-panel",
};
const PLAIN_BUBBLE = "bg-ui-panel text-ui-on-panel";

const ChatDialog = ({
  isOpen,
  onClose,
  gameKey,
  socket,
  userId,
  username,
  messages: chatMessages,
  unreadCounts,
  onMarkRead,
  onLoadOlder,
  activeTab,
  onTabChange,
  onLogout,
  canAccessGame = true
}) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const [inputText, setInputText] = useState("");
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);

  const currentChatKey = activeTab === 'global' ? 'GLOBAL_CHAT' : gameKey;
  const messages = activeTab === 'global' ? chatMessages.global : chatMessages.game;

  // Принудительное переключение на глобальную вкладку если нет доступа к игре
  useEffect(() => {
    if (!canAccessGame && activeTab === 'game') {
      onTabChange('global');
    }
  }, [canAccessGame, activeTab, onTabChange]);

  // Открытый чат считается прочитанным, в том числе по приходу новых сообщений
  useEffect(() => {
    if (isOpen && messages.length) {
      onMarkRead(currentChatKey, messages.at(-1).id);
    }
  }, [isOpen, currentChatKey, messages, onMarkRead]);

  const listRef = useRef(null);
  const atBottom = useRef(true);
  const lastHeight = useRef(0);
  const firstMessage = useRef(null);
  const requestedOlder = useRef(null);

  const handleScroll = useCallback((event) => {
    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;

    atBottom.current = scrollHeight - clientHeight - scrollTop < 40;

    // Долистали до начала — просим порцию постарее, по разу на сообщение; события партии в БД нет
    const oldest = messages.find((message) => !message.system)?.id;
    if (oldest && requestedOlder.current !== oldest && scrollTop < 80) {
      requestedOlder.current = oldest;
      onLoadOlder(currentChatKey, oldest);
    }
  }, [messages, currentChatKey, onLoadOlder]);

  // При переключении вкладки смотрим на последние сообщения
  useEffect(() => {
    atBottom.current = true;
  }, [currentChatKey, isOpen]);

  // Новое сообщение подматываем к низу, как в мессенджерах; догруженную историю — нет
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;

    const grew = list.scrollHeight - lastHeight.current;
    const prepended = messages[0]?.id !== firstMessage.current;

    lastHeight.current = list.scrollHeight;
    firstMessage.current = messages[0]?.id;

    if (prepended && grew > 0 && !atBottom.current) list.scrollTop += grew;
    else if (atBottom.current) list.scrollTop = list.scrollHeight;
  }, [messages, isOpen, currentChatKey]);

  const handleSendMessage = useCallback((event) => {
    event.preventDefault();

    const text = inputText.trim();
    if (!text) return;

    const pin = localStorage.getItem('codenames-pin');
    if (!pin) {
      notify(t('chat.pinMissing'));
      return;
    }

    socket.emit("SEND_MESSAGE", { gameKey: currentChatKey, userId, author: username, text, pin });
    setInputText("");
  }, [currentChatKey, userId, username, inputText, socket, notify, t]);

  // Сообщения разбиты по дням: у каждого дня свой разделитель, у сообщения — только время
  const dayGroups = useMemo(
    () => Object.entries(Object.groupBy(messages, (message) => new Date(message.created).toDateString())),
    [messages]
  );

  const formatDay = useCallback((day) => {
    const date = new Date(day);
    const sameYear = date.getFullYear() === new Date().getFullYear();
    return date.toLocaleDateString([], { day: 'numeric', month: 'long', year: sameYear ? undefined : 'numeric' });
  }, []);

  const formatTime = useCallback((timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, []);

  const tabs = [
    ...(canAccessGame ? [['game', t('chat.tabGame'), unreadCounts?.game]] : []),
    ['global', t('chat.tabGlobal'), unreadCounts?.global],
  ];

  return (
    <>
      <Dialog
        isOpen={isOpen}
        onClose={onClose}
        panelClass="sm:h-[calc(100vh-2rem)] max-w-2xl"
        title={`${t('chat.hello')}, ${username}`}
        actions={
          <button
            onClick={() => setShowSettingsDialog(true)}
            className={ICON_BUTTON}
            aria-label={t('chat.settings')}
          >
            <FiSettings size={18} />
          </button>
        }
      >
        <div className="flex-shrink-0 flex gap-2 border-b-2 border-ui-surface-line px-3 sm:px-4">
          {tabs.map(([tab, label, unread]) => (
            <button
              key={tab}
              onClick={() => onTabChange(tab)}
              className={`${TAB} ${activeTab === tab ? TAB_ACTIVE : TAB_IDLE}`}
            >
              {label}
              {unread > 0 && <span className="ml-2 text-xs font-bold text-ui-accent">+{unread}</span>}
            </button>
          ))}
        </div>

        <DialogBody ref={listRef} onScroll={handleScroll} className="flex flex-col">
          {messages.length === 0 ? (
            <p className="py-8 text-center opacity-60">{t('chat.noMessages')}</p>
          ) : (
            dayGroups.map(([day, dayMessages]) => (
              <Fragment key={day}>
                <div className="mb-2 text-center text-[11px] opacity-60">{formatDay(day)}</div>
                {dayMessages.map((message) => {
                  if (message.system) {
                    const text = Object.entries(message.params ?? {}).reduce(
                      (result, [name, value]) => result.replace(`{${name}}`, value),
                      t(`notifications.${message.key}`)
                    );

                    return (
                      <p key={message.id} className="mb-2 text-center text-sm opacity-70">{text}</p>
                    );
                  }

                  const isOwn = message.userId === userId;

                  return (
                    <div
                      key={message.id}
                      className={`${BUBBLE} ${isOwn ? OWN_BUBBLE : TEAM_BUBBLE[message.team] ?? PLAIN_BUBBLE}`}
                    >
                      <div className="leading-relaxed break-words">
                        {!isOwn && (
                          <span className="font-bold">
                            {message.role === 'captain' && <FiStar className="inline mr-1 mb-0.5" size={14} />}
                            {message.author}:{' '}
                          </span>
                        )}
                        {message.text}
                      </div>
                      <div className="absolute bottom-1 right-2 text-[11px] opacity-70">
                        {formatTime(message.created)}
                      </div>
                    </div>
                  );
                })}
              </Fragment>
            ))
          )}
        </DialogBody>

        <div className="flex-shrink-0 border-t border-ui-surface-line p-2 sm:rounded-b-lg">
          <form onSubmit={handleSendMessage} className="relative">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
              placeholder={t('chat.typeMessage')}
              maxLength={MESSAGE_LIMIT}
              rows={1}
              className="block w-full resize-none field-sizing-content max-h-[88px] rounded-3xl bg-ui-panel py-2.5 pl-4 pr-14 text-sm leading-relaxed text-ui-on-panel placeholder-ui-on-panel/40 outline-none [scrollbar-width:none]"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              onMouseDown={(e) => e.preventDefault()}
              className="absolute bottom-1.5 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-ui-accent text-ui-panel hover:bg-ui-accent-hover disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <FiArrowRight size={16} />
            </button>
          </form>
        </div>

      </Dialog>

      <SettingsDialog
        isOpen={showSettingsDialog}
        onClose={() => setShowSettingsDialog(false)}
        userId={userId}
        username={username}
        onLogout={onLogout}
      />
    </>
  );
};

export default ChatDialog;
