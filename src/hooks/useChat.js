import { useCallback, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'codenames-last-read-messages';
const GLOBAL_CHAT = 'GLOBAL_CHAT';

// Стабильная ссылка: пустой литерал на каждом рендере ломал бы мемоизацию
const NO_MESSAGES = [];

const chatOf = (chatKey) => (chatKey === GLOBAL_CHAT ? 'global' : 'game');

const loadLastRead = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? {};
  } catch {
    return {};
  }
};

// Непрочитанные — все чужие сообщения после последнего прочитанного
const countUnread = (messages, lastReadId, userId) => {
  const lastRead = messages.findIndex((message) => message.id === lastReadId);
  return messages.slice(lastRead + 1).filter((message) => !message.system && message.userId !== userId).length;
};

/** Сообщения игрового и глобального чатов, счётчики непрочитанных и отметка о прочтении */
export function useChat(socket, userId, gameKey) {
  const [messagesByChat, setMessagesByChat] = useState({});
  const [lastReadIds, setLastReadIds] = useState(loadLastRead);

  const addMessages = useCallback((chatKey, incoming, older = false) => {
    setMessagesByChat((prev) => {
      const known = prev[chatKey] ?? NO_MESSAGES;
      const ids = new Set(known.map((message) => message.id));
      const added = incoming.filter((message) => !ids.has(message.id));

      if (!added.length) return prev;

      // События партии приходят вперемешку с сообщениями — порядок по времени
      const merged = older ? [...added, ...known] : [...known, ...added];
      return { ...prev, [chatKey]: merged.sort((a, b) => a.created.localeCompare(b.created)) };
    });
  }, []);

  useEffect(() => {
    if (!socket) return;

    const onHistory = ({ gameKey: chatKey, messages }) => addMessages(chatKey, messages);
    const onOlder = ({ gameKey: chatKey, messages }) => addMessages(chatKey, messages, true);
    const onMessage = (message) => addMessages(message.gameKey, [message]);
    const onNotice = (notice) => addMessages(gameKey, [notice]);
    const onError = ({ message }) => alert(message);

    socket.on('CHAT_HISTORY', onHistory);
    socket.on('OLDER_MESSAGES', onOlder);
    socket.on('NEW_MESSAGE', onMessage);
    socket.on('GAME_NOTICE', onNotice);
    socket.on('CHAT_ERROR', onError);

    return () => {
      socket.off('CHAT_HISTORY', onHistory);
      socket.off('OLDER_MESSAGES', onOlder);
      socket.off('NEW_MESSAGE', onMessage);
      socket.off('GAME_NOTICE', onNotice);
      socket.off('CHAT_ERROR', onError);
    };
  }, [socket, gameKey, addMessages]);

  // Вход в чаты сразу и после переподключения: в ответ сервер присылает историю
  useEffect(() => {
    if (!socket || !userId || !gameKey) return;

    const join = () => {
      socket.emit('JOIN_CHAT', { gameKey, userId });
      socket.emit('JOIN_CHAT', { gameKey: GLOBAL_CHAT, userId });
    };

    join();
    socket.on('connect', join);

    return () => socket.off('connect', join);
  }, [socket, userId, gameKey]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lastReadIds));
  }, [lastReadIds]);

  // Догрузка истории: сервер отдаёт порцию сообщений старше указанного
  const loadOlder = useCallback((chatKey, oldestId) => {
    socket?.emit('LOAD_OLDER', { gameKey: chatKey, userId, before: oldestId });
  }, [socket, userId]);

  const markRead = useCallback((chatKey, messageId) => {
    const chat = chatOf(chatKey);
    setLastReadIds((prev) => (prev[chat] === messageId ? prev : { ...prev, [chat]: messageId }));
  }, []);

  const messages = useMemo(() => ({
    game: messagesByChat[gameKey] ?? NO_MESSAGES,
    global: messagesByChat[GLOBAL_CHAT] ?? NO_MESSAGES,
  }), [messagesByChat, gameKey]);

  const unreadCounts = useMemo(() => (userId ? {
    game: countUnread(messages.game, lastReadIds.game, userId),
    global: countUnread(messages.global, lastReadIds.global, userId),
  } : { game: 0, global: 0 }), [messages, lastReadIds, userId]);

  return { messages, unreadCounts, markRead, loadOlder };
}
