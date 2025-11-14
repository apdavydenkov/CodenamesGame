import { useState, useEffect, useCallback, useRef } from "react";
import GameCard from "./components/GameCard";
import GameStatus from "./components/GameStatus";
import WinDialog from "./components/WinDialog";
import KeyDialog from "./components/KeyDialog";
import MenuDialog from "./components/MenuDialog";
import CaptainDialog from "./components/CaptainDialog";
import ChatDialog from "./components/ChatDialog";
import AuthDialog from "./components/AuthDialog";
import HintPopup from "./components/HintPopup";
import MetaTags from "./components/MetaTags";
import LanguageSwitcher from "./components/LanguageSwitcher";
import Notification from "./components/Notification";
import {
  generateGameFromKey,
  generateNewKey,
  getDictionaryIndexFromKey,
} from "./utils/gameGenerator";
import { isAIKey } from "./utils/aiGameGenerator";
import { generateAIWords } from "./services/aiService";
import gameSocket from "./services/socket";
import { useTranslation } from "./hooks/useTranslation";
import "./styles/game.css";

const App = () => {

  const { t, language } = useTranslation();
  const [gameState, setGameState] = useState({
    words: [],
    colors: [],
    revealed: Array(25).fill(false),
    currentTeam: "blue",
    remainingCards: { blue: 9, red: 8 },
    gameOver: false,
    winner: null,
  });

  const [isCaptain, setIsCaptain] = useState(false);
  const [isCaptainConfirmed, setIsCaptainConfirmed] = useState(false);
  const [isPendingCaptainConfirmation, setIsPendingCaptainConfirmation] = useState(false);
  const [showWinDialog, setShowWinDialog] = useState(false);
  const wasWinDialogShownRef = useRef(false);
  const isInitialRoleSetRef = useRef(false);
  const [showKeyDialog, setShowKeyDialog] = useState(false);
  const [showMenuDialog, setShowMenuDialog] = useState(false);
  const [showCaptainDialog, setShowCaptainDialog] = useState(false);
  const [showChatDialog, setShowChatDialog] = useState(false);
  const [activeChatTab, setActiveChatTab] = useState('game'); // 'game' или 'global'
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [currentKey, setCurrentKey] = useState("");
  const [isServerConnected, setIsServerConnected] = useState(false);

  // Состояние авторизации
  const [userAuth, setUserAuth] = useState({
    userId: localStorage.getItem('codenames-user-id') || null,
    username: localStorage.getItem('codenames-username') || ''
  });

  // Состояние команд
  const [teams, setTeams] = useState(null);
  const [myTeam, setMyTeam] = useState(null);
  const [myRole, setMyRole] = useState(null);
  const [ownerId, setOwnerId] = useState(null);
  const [teamsLocked, setTeamsLocked] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [canAccessGame, setCanAccessGame] = useState(true);
  const [isGameStateReceived, setIsGameStateReceived] = useState(false);
  const [gameError, setGameError] = useState(null);
  const [notificationDuration, setNotificationDuration] = useState(5000);
  const [highlightMenuIcon, setHighlightMenuIcon] = useState(false);
  const [highlightCaptainIcon, setHighlightCaptainIcon] = useState(false);

  // Состояние подсказок
  const [currentHint, setCurrentHint] = useState(null);
  const [showHintPopup, setShowHintPopup] = useState(false);

  // ID последних прочитанных сообщений (храним в localStorage)
  const [lastReadMessageIds, setLastReadMessageIds] = useState(() => {
    try {
      const saved = localStorage.getItem('codenames-last-read-messages');
      return saved ? JSON.parse(saved) : { game: null, global: null };
    } catch {
      return { game: null, global: null };
    }
  });

  // Счётчики непрочитанных сообщений (вычисляемое значение, не храним в localStorage)
  const [unreadCounts, setUnreadCounts] = useState({ game: 0, global: 0 });

  const [dictionaries, setDictionaries] = useState([]);
  const [currentDictionary, setCurrentDictionary] = useState(null);
  const [aiTopic, setAITopic] = useState("");
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  // Загрузка словарей для текущей локали с умным кешированием
  const loadAllDictionaries = async (language) => {
    try {
      const cacheKey = `codenames_dictionaries_${language}`;
      const cached = localStorage.getItem(cacheKey);
      const url = `/dictionaries/dictionaries_${language}.json`;
      
      // Используем кеш если есть (без проверки HEAD запроса для быстрой загрузки)
      if (cached) {
        try {
          const cachedData = JSON.parse(cached);

          if (cachedData.data && Array.isArray(cachedData.data)) {
            // Возвращаем кешированные данные сразу
            // (фоновая проверка обновлений отключена для предотвращения утечек памяти)
            return cachedData.data;
          }
        } catch {
          // Ignore cache errors, will fetch fresh data
        }
      }
      
      // Загружаем с сервера
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      const lastModified = response.headers.get('Last-Modified');
      
      // Сохраняем в новом формате с метаданными
      const cacheData = {
        data: data.dictionaries,
        lastModified: lastModified
      };
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
      
      return data.dictionaries;
    } catch (error) {
      console.error(`[Dictionary] Error loading dictionaries for ${language}:`, error);
      return [];
    }
  };

  const loadAIDictionary = () => {
    // Виртуальный ИИ-словарь
    return {
      id: "ai_dictionary",
      index: 99,
      title: t('dictionaries.aiDictionary'),
      words: [], // Слова будут загружаться динамически
    };
  };

  // Helper: найти команду пользователя
  const findUserTeam = (teams, userId) => {
    if (!teams || !userId) return null;

    // Проверяем синюю команду
    if (teams.blue?.captain?.userId === userId) {
      return { team: 'blue', role: 'captain', username: teams.blue.captain.username };
    }
    const bluePlayer = teams.blue?.players?.find(p => p.userId === userId);
    if (bluePlayer) {
      return { team: 'blue', role: 'player', username: bluePlayer.username };
    }

    // Проверяем красную команду
    if (teams.red?.captain?.userId === userId) {
      return { team: 'red', role: 'captain', username: teams.red.captain.username };
    }
    const redPlayer = teams.red?.players?.find(p => p.userId === userId);
    if (redPlayer) {
      return { team: 'red', role: 'player', username: redPlayer.username };
    }

    // Проверяем наблюдателей
    const spectator = teams.spectators?.find(s => s.userId === userId);
    if (spectator) {
      return { team: 'spectator', role: 'spectator', username: spectator.username };
    }

    return null;
  };

  // Handlers для команд
  const handleJoinTeam = (team, role) => {
    console.log('[App] handleJoinTeam called:', { team, role, userId: userAuth.userId, username: userAuth.username, currentKey });

    if (!userAuth.userId || !userAuth.username) {
      console.log('[App] Not authenticated, showing auth dialog');
      setShowAuthDialog(true);
      return;
    }

    console.log('[App] Emitting JOIN_TEAM to server');
    gameSocket.socket.emit('JOIN_TEAM', {
      gameKey: currentKey,
      team,
      role,
      userId: userAuth.userId,
      username: userAuth.username
    });
  };

  const handleBecomeCaptain = () => {
    if (!userAuth.userId || !myTeam) return;

    // Показываем диалог подтверждения ПЕРЕД отправкой на сервер
    setIsPendingCaptainConfirmation(true);
    setShowCaptainDialog(true);
  };

  const handleLeaveCaptain = () => {
    if (!userAuth.userId) return;

    gameSocket.socket.emit('LEAVE_CAPTAIN', {
      gameKey: currentKey,
      userId: userAuth.userId
    });

    // НЕ сбрасываем состояния локально - пусть сервер сам пришлет обновление
    // Сброс через useEffect когда myRole изменится
  };

  const handleLockTeams = () => {
    if (!userAuth.userId) return;

    gameSocket.socket.emit('LOCK_TEAMS', {
      gameKey: currentKey,
      userId: userAuth.userId,
      username: userAuth.username
    });
  };

  const handleSetPrivate = (isPrivate) => {
    if (!userAuth.userId) return;

    gameSocket.socket.emit('SET_PRIVATE', {
      gameKey: currentKey,
      userId: userAuth.userId,
      username: userAuth.username,
      isPrivate
    });
  };

  const handleEndTurn = () => {
    if (!userAuth.userId) return;

    gameSocket.socket.emit('END_TURN', {
      gameKey: currentKey,
      userId: userAuth.userId
    });

    setShowHintPopup(false);
  };

  useEffect(() => {
    gameSocket.connect();

    const handleConnect = () => setIsServerConnected(true);
    const handleDisconnect = () => setIsServerConnected(false);

    const handleGameState = (newState) => {
      setIsGameStateReceived(true);
      setGameState((prevState) => ({
        ...prevState,
        words: newState.words || prevState.words,
        colors: newState.colors || prevState.colors,
        revealed: newState.revealed,
        currentTeam: newState.currentTeam,
        remainingCards: newState.remainingCards,
        gameOver: newState.gameOver,
        winner: newState.winner,
      }));

      // Обновляем данные команд из GAME_STATE
      if (newState.teams) {
        setTeams(newState.teams);

        // Обновляем свою команду и роль
        if (userAuth.userId && userAuth.username) {
          const userTeam = findUserTeam(newState.teams, userAuth.userId);
          setMyTeam(userTeam?.team || null);
          setMyRole(userTeam?.role || null);
        }
      }

      if (newState.ownerId !== undefined) setOwnerId(newState.ownerId);
      if (newState.teamsLocked !== undefined) setTeamsLocked(newState.teamsLocked);
      if (newState.isPrivate !== undefined) setIsPrivate(newState.isPrivate);
      if (newState.canAccessGame !== undefined) {
        console.log('[Access Control] Client received canAccessGame:', {
          canAccessGame: newState.canAccessGame,
          isPrivate: newState.isPrivate,
          ownerId: newState.ownerId,
          wordsLength: newState.words?.length || 0
        });
        setCanAccessGame(newState.canAccessGame);
      }

      // Показываем диалог победы только один раз
      if (newState.gameOver && newState.winner && !wasWinDialogShownRef.current) {
        wasWinDialogShownRef.current = true;
        setShowWinDialog(true);
      }
    };

    gameSocket.socket.on("connect", handleConnect);
    gameSocket.socket.on("disconnect", handleDisconnect);
    gameSocket.onGameState(handleGameState);

    // Обработчики команд
    gameSocket.socket.on("TEAMS_UPDATE", (data) => {
      console.log("[Teams] TEAMS_UPDATE:", data);
      setTeams(data.teams);

      // Обновляем свою команду и роль
      if (userAuth.userId && data.teams) {
        const userTeam = findUserTeam(data.teams, userAuth.userId);
        const newRole = userTeam?.role || null;

        // Если роль изменилась с капитана на что-то другое - сбрасываем подтверждение
        setMyRole(prevRole => {
          if (prevRole === 'captain' && newRole !== 'captain') {
            setIsCaptainConfirmed(false);
            setIsCaptain(false);
          }
          return newRole;
        });

        setMyTeam(userTeam?.team || null);
      }
    });

    gameSocket.socket.on("JOIN_TEAM_SUCCESS", (data) => {
      console.log("[Teams] JOIN_TEAM_SUCCESS:", data);
      setMyTeam(data.team);
      setMyRole(data.role);
    });

    gameSocket.socket.on("LEAVE_CAPTAIN_SUCCESS", (data) => {
      console.log("[Teams] LEAVE_CAPTAIN_SUCCESS:", data);
      setMyTeam(data.team);
      setMyRole(data.role);
      setIsCaptainConfirmed(false);
      setIsCaptain(false);
    });

    gameSocket.socket.on("GAME_SETTINGS_UPDATE", (data) => {
      console.log("[Teams] GAME_SETTINGS_UPDATE:", data);
      if (data.teamsLocked !== undefined) setTeamsLocked(data.teamsLocked);
      if (data.isPrivate !== undefined) setIsPrivate(data.isPrivate);
    });

    gameSocket.socket.on("HINT_GIVEN", (data) => {
      console.log("[Hint] HINT_GIVEN:", data);
      setCurrentHint(data.hint);
      setShowHintPopup(true);
    });

    gameSocket.socket.on("TURN_ENDED", (data) => {
      console.log("[Hint] TURN_ENDED:", data);
      setCurrentHint(null);
      setShowHintPopup(false);
    });

    gameSocket.socket.on("GAME_ERROR", (error) => {
      console.error("[Teams] GAME_ERROR:", error);
      setGameError(error.message);
      setTimeout(() => setGameError(null), 5000);
    });

    return () => {
      gameSocket.removeAllListeners();
      gameSocket.disconnect();
    };
  }, []); // Подключаемся только один раз при монтировании

  useEffect(() => {
    const init = async () => {
      // Автоматически загружаем JSON словари для текущей локали
      const validDictionaries = await loadAllDictionaries(language);
      
      // Добавляем ИИ-словарь
      const aiDictionary = loadAIDictionary();
      const allDictionaries = [...validDictionaries, aiDictionary];
      setDictionaries(allDictionaries);
      

      const dictionary = validDictionaries[0];

      if (!dictionary) return;

      const urlParams = new URLSearchParams(window.location.search);
      const keyFromUrl = urlParams.get("key");

      if (keyFromUrl) {
        const dictionaryIndex = getDictionaryIndexFromKey(keyFromUrl);
        let keyDictionary;
        
        // Если это ИИ-ключ
        if (isAIKey(keyFromUrl)) {
          keyDictionary = aiDictionary;
        } else {
          keyDictionary = validDictionaries[dictionaryIndex];
        }

        if (keyDictionary) {
          const gameData = await generateGameFromKey(
            keyFromUrl,
            keyDictionary.words,
            dictionaryIndex
          );

          if (gameData) {
            setCurrentDictionary(keyDictionary);
            setCurrentKey(keyFromUrl);

            setGameState({
              words: gameData.words,
              colors: gameData.colors,
              revealed: Array(25).fill(false),
              currentTeam: gameData.startingTeam,
              remainingCards: {
                blue: gameData.colors.filter((c) => c === "blue").length,
                red: gameData.colors.filter((c) => c === "red").length,
              },
              gameOver: false,
              winner: null,
            });

            gameSocket.joinGame(keyFromUrl, gameData.words, gameData.colors, null, userAuth.userId);
            return;
          }
        }
      }

      // Если ключ невалидный или его нет - создаем новую игру
      const dictionaryIndex = 0; // Первый словарь
      const newKey = generateNewKey(dictionaryIndex);
      const gameData = await generateGameFromKey(
        newKey,
        dictionary.words,
        dictionaryIndex
      );

      if (gameData) {
        setCurrentDictionary(dictionary);
        setCurrentKey(newKey);

        const url = new URL(window.location);
        url.searchParams.set("key", newKey);
        window.history.pushState({}, "", url.toString());

        setGameState({
          words: gameData.words,
          colors: gameData.colors,
          revealed: Array(25).fill(false),
          currentTeam: gameData.startingTeam,
          remainingCards: {
            blue: gameData.colors.filter((c) => c === "blue").length,
            red: gameData.colors.filter((c) => c === "red").length,
          },
          gameOver: false,
          winner: null,
        });

        // Автозагрузка без ключа - НЕ делаем владельцем
        console.log('[Init] Auto-creating game:', {
          userId: userAuth.userId,
          username: userAuth.username,
          hasUserId: !!userAuth.userId,
          fromLocalStorage: localStorage.getItem('codenames-user-id')
        });
        gameSocket.startNewGame(newKey, gameData.words, gameData.colors, gameData.startingTeam, userAuth.userId, false);
      }
      
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount - intentionally empty deps

  // Автоматическое присоединение к наблюдателям при загрузке с ключом
  useEffect(() => {
    // Условия для автоматического присоединения:
    // 1. Пользователь авторизован
    // 2. Есть ключ игры (загрузили игру по ссылке)
    // 3. Еще не в команде
    // 4. Команды загружены (teams !== null)
    // 5. Socket подключен
    // 6. Игра НЕ приватная (для приватной владелец добавляет участников вручную)
    if (userAuth.userId && userAuth.username && currentKey && myTeam === null && teams !== null && gameSocket.socket?.connected && !isPrivate) {
      gameSocket.socket.emit('JOIN_TEAM', {
        gameKey: currentKey,
        team: 'spectator',
        role: 'spectator',
        userId: userAuth.userId,
        username: userAuth.username
      });
    }
  }, [userAuth.userId, userAuth.username, currentKey, myTeam, teams, isPrivate]);

  // Отдельный useEffect для смены языка - создает новую игру
  useEffect(() => {
    const changeLanguage = async () => {
      const validDictionaries = await loadAllDictionaries(language);
      
      if (validDictionaries.length === 0) return;
      
      // Создаем новую игру с первым словарем новой локали
      const dictionary = validDictionaries[0];
      const aiDictionary = loadAIDictionary();
      const allDictionaries = [...validDictionaries, aiDictionary];
      setDictionaries(allDictionaries);
      
      const dictionaryIndex = 0;
      const newKey = generateNewKey(dictionaryIndex);
      const gameData = await generateGameFromKey(newKey, dictionary.words, dictionaryIndex);
      
      if (gameData) {
        setCurrentDictionary(dictionary);
        setCurrentKey(newKey);
        
        const url = new URL(window.location);
        url.searchParams.set("key", newKey);
        window.history.pushState({}, "", url.toString());
        
        setGameState({
          words: gameData.words,
          colors: gameData.colors,
          revealed: Array(25).fill(false),
          currentTeam: gameData.startingTeam,
          remainingCards: {
            blue: gameData.colors.filter((c) => c === "blue").length,
            red: gameData.colors.filter((c) => c === "red").length,
          },
          gameOver: false,
          winner: null,
        });

        // Автозагрузка без ключа - НЕ делаем владельцем
        console.log('[Init] Auto-creating game:', {
          userId: userAuth.userId,
          username: userAuth.username,
          hasUserId: !!userAuth.userId,
          fromLocalStorage: localStorage.getItem('codenames-user-id')
        });
        gameSocket.startNewGame(newKey, gameData.words, gameData.colors, gameData.startingTeam, userAuth.userId, false);
      }
    };
    
    // Запускаем только если это не первая загрузка (словари уже инициализированы)
    if (dictionaries.length > 0) {
      changeLanguage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]); // dictionaries.length is guard, not dependency

  // Автоматическое присоединение к чатам при авторизации
  useEffect(() => {
    if (!userAuth.userId || !currentKey) return;

    // Присоединяемся к чатам
    gameSocket.socket.emit("JOIN_CHAT", { gameKey: currentKey, userId: userAuth.userId });
    gameSocket.socket.emit("JOIN_CHAT", { gameKey: "GLOBAL_CHAT", userId: userAuth.userId });

    // Переподключаемся при восстановлении соединения (для мобильных)
    const handleReconnect = () => {
      if (userAuth.userId && currentKey) {
        gameSocket.socket.emit("JOIN_CHAT", { gameKey: currentKey, userId: userAuth.userId });
        gameSocket.socket.emit("JOIN_CHAT", { gameKey: "GLOBAL_CHAT", userId: userAuth.userId });
      }
    };

    gameSocket.socket.on('connect', handleReconnect);

    return () => {
      gameSocket.socket.off('connect', handleReconnect);
    };
  }, [userAuth.userId, currentKey]);

  // Refs для отслеживания текущего состояния без пересоздания listeners
  const showChatDialogRef = useRef(showChatDialog);
  const activeChatTabRef = useRef(activeChatTab);

  useEffect(() => {
    showChatDialogRef.current = showChatDialog;
    activeChatTabRef.current = activeChatTab;
  }, [showChatDialog, activeChatTab]);

  // Отслеживание новых сообщений для счётчиков непрочитанных
  const handleNewMessage = useCallback((message) => {
    const chatKey = message.gameKey === 'GLOBAL_CHAT' ? 'global' : 'game';

    // Игнорируем свои сообщения
    if (message.userId === userAuth.userId) {
      return;
    }

    // Не увеличиваем счётчик если чат открыт И это активная вкладка
    if (showChatDialogRef.current && activeChatTabRef.current === chatKey) {
      return;
    }

    // Увеличиваем счётчик
    setUnreadCounts(prev => {
      const newCounts = { ...prev, [chatKey]: prev[chatKey] + 1 };
      return newCounts;
    });
  }, [userAuth.userId]);

  useEffect(() => {
    if (!gameSocket.socket) return;

    gameSocket.socket.on('NEW_MESSAGE', handleNewMessage);

    return () => {
      gameSocket.socket.off('NEW_MESSAGE', handleNewMessage);
    };
  }, [handleNewMessage]);

  const handleDictionaryChange = (dictionary) => {
    setCurrentDictionary(dictionary);

    // Очищаем тему при смене словаря
    if (dictionary.id !== "ai_dictionary") {
      setAITopic("");
    }
  };

  // Сохранение lastReadMessageIds в localStorage при изменении
  useEffect(() => {
    localStorage.setItem('codenames-last-read-messages', JSON.stringify(lastReadMessageIds));
  }, [lastReadMessageIds]);

  // Синхронизация состояния с ролью от сервера
  useEffect(() => {
    // При первой установке роли (загрузка страницы)
    if (myRole !== null && !isInitialRoleSetRef.current) {
      isInitialRoleSetRef.current = true;

      // Если при загрузке уже капитан - автоматически подтверждаем (перезагрузка страницы)
      if (myRole === 'captain') {
        setIsCaptainConfirmed(true);
      }
    }
  }, [myRole]);

  // Обновление lastReadMessageId при открытии чата (вызывается из ChatDialog)
  const handleMarkAsRead = useCallback((chatKey, lastMessageId) => {
    if (!lastMessageId) return;

    setLastReadMessageIds(prev => ({
      ...prev,
      [chatKey]: lastMessageId
    }));

    // Сразу обнуляем счётчик для этого чата
    setUnreadCounts(prev => ({
      ...prev,
      [chatKey]: 0
    }));
  }, []);

  const startNewGame = async (key = null) => {
    if (!currentDictionary) return;

    let gameKey = key;
    let newGameData;
    let gameDictionary = currentDictionary;

    if (key) {
      // Обработка переданного ключа (из KeyDialog)
      const dictionaryIndex = getDictionaryIndexFromKey(key);
      let keyDictionary;
      
      // Если это ИИ-ключ
      if (isAIKey(key)) {
        keyDictionary = dictionaries.find(d => d.id === "ai_dictionary");
      } else {
        // Берем обычные словари (без ИИ) по индексу
        const regularDictionaries = dictionaries.filter(d => d.id !== "ai_dictionary");
        keyDictionary = regularDictionaries[dictionaryIndex];
      }

      if (keyDictionary) {
        newGameData = await generateGameFromKey(
          key,
          keyDictionary.words,
          dictionaryIndex
        );
        if (newGameData) {
          gameDictionary = keyDictionary;
        } else if (isAIKey(key)) {
          // Если ИИ-игра не найдена, бросаем ошибку для KeyDialog
          throw new Error(t('keyDialog.aiGameNotFound'));
        }
      }
    } else {
      // Создание новой игры через MenuDialog
      if (gameDictionary.id === "ai_dictionary") {
        // ИИ-игра: проверяем тему и генерируем слова
        if (!aiTopic.trim()) {
          alert(t('errors.enterTopic'));
          return;
        }
        
        try {
          setIsGeneratingAI(true);
          
          // Генерируем слова через ИИ и получаем ключ
          const result = await generateAIWords(aiTopic);
          if (!result.success) {
            alert(result.message);
            return;
          }
          
          // Используем полученный ключ и перезагружаем страницу
          gameKey = result.key;
          const url = new URL(window.location);
          url.searchParams.set("key", gameKey);
          window.location.href = url.toString();
          return;
        } catch {
          alert(t('errors.aiGenerationError'));
        } finally {
          setIsGeneratingAI(false);
        }
      } else {
        // Обычная игра
        const dictionaryIndex = dictionaries.findIndex(d => d.id === gameDictionary.id);
        gameKey = generateNewKey(dictionaryIndex);
        newGameData = await generateGameFromKey(
          gameKey,
          gameDictionary.words,
          dictionaryIndex
        );
      }
    }

    if (newGameData) {
      // ИСПРАВЛЕНИЕ: Используем полную перезагрузку страницы при создании игры по ключу
      if (key && key !== currentKey) {
        const url = new URL(window.location);
        url.searchParams.set("key", gameKey);
        window.location.href = url.toString(); // Принудительная перезагрузка
        return; // Выходим из функции, так как будет перезагрузка
      }

      // Для обычной новой игры (без ключа) - обновляем состояние локально
      setCurrentDictionary(gameDictionary);
      setCurrentKey(gameKey);
      wasWinDialogShownRef.current = false;
      setIsCaptain(false);
      setIsCaptainConfirmed(false);

      const url = new URL(window.location);
      url.searchParams.set("key", gameKey);
      window.history.pushState({}, "", url.toString());

      setGameState({
        words: newGameData.words,
        colors: newGameData.colors,
        revealed: Array(25).fill(false),
        currentTeam: newGameData.startingTeam,
        remainingCards: {
          blue: newGameData.colors.filter((c) => c === "blue").length,
          red: newGameData.colors.filter((c) => c === "red").length,
        },
        gameOver: false,
        winner: null,
      });

      if (key) {
        gameSocket.joinGame(gameKey, null, null, null, userAuth.userId);
      } else {
        // Явное нажатие "Новая игра" - делаем владельцем
        gameSocket.startNewGame(gameKey, newGameData.words, newGameData.colors, newGameData.startingTeam, userAuth.userId, true);
      }
    }

    setShowWinDialog(false);
    setShowMenuDialog(false);
    setShowKeyDialog(false);
  };

  const handleCaptainRequest = (value) => {
    if (value) {
      if (!isCaptainConfirmed) {
        setShowCaptainDialog(true);
      } else {
        setIsCaptain(true);
      }
    } else {
      setIsCaptain(false);
    }
  };

  const handleCaptainConfirm = () => {
    // Если это подтверждение для назначения капитаном - отправляем на сервер
    if (isPendingCaptainConfirmation) {
      gameSocket.socket.emit('JOIN_TEAM', {
        gameKey: currentKey,
        team: myTeam,
        role: 'captain',
        userId: userAuth.userId,
        username: userAuth.username
      });
      setIsPendingCaptainConfirmation(false);
    }

    setIsCaptainConfirmed(true);
    setIsCaptain(true);
    // НЕ закрываем диалог, чтобы показать форму подсказки
    // setShowCaptainDialog(false);
  };

  const handleCaptainModeToggle = useCallback(() => {
    if (isCaptainConfirmed) {
      setIsCaptain(!isCaptain);
    }
  }, [isCaptainConfirmed, isCaptain]);

  const handleCaptainHelperClick = useCallback(() => {
    setShowCaptainDialog(true);
  }, []);

  const handleMenuClick = useCallback(() => {
    setShowMenuDialog(true);
  }, []);

  const handleChatClick = useCallback(() => {
    if (!userAuth.username || !userAuth.userId) {
      setShowAuthDialog(true);
    } else {
      setShowChatDialog(true);
    }
  }, [userAuth.username, userAuth.userId]);

  const handleHighlightIcon = useCallback((iconType) => {
    if (iconType === 'menu') {
      setHighlightMenuIcon(true);
      setTimeout(() => setHighlightMenuIcon(false), 3000);
    } else if (iconType === 'captain') {
      setHighlightCaptainIcon(true);
      setTimeout(() => setHighlightCaptainIcon(false), 3000);
    }
  }, []);

  const handleShowNotification = useCallback((message, duration = 5000) => {
    setGameError(message);
    setNotificationDuration(duration);
  }, []);

  const handleCardClick = useCallback((index) => {
    if (gameState.revealed[index] || isCaptain) return;

    // Запрещаем открывать карточки пока не выбраны капитаны в обеих командах
    const hasBlueCaptain = teams?.blue?.captain !== null;
    const hasRedCaptain = teams?.red?.captain !== null;

    if (!hasBlueCaptain || !hasRedCaptain) {
      return;
    }

    gameSocket.revealCard(index);
  }, [gameState.revealed, isCaptain, teams]);

  return (
    <div className="container">
      <MetaTags />
      <LanguageSwitcher />
      {!isGameStateReceived ? (
        <div className="game-grid"></div>
      ) : canAccessGame ? (
        <div className="game-grid">
          {gameState.words.map((word, index) => (
            <GameCard
              key={`${currentKey}-${index}`}
              word={word}
              color={gameState.colors[index]}
              revealed={gameState.revealed[index]}
              onConfirm={handleCardClick}
              isCaptain={isCaptain}
              gameKey={currentKey}
              position={index}
              myTeam={myTeam}
              myRole={myRole}
              isAuthenticated={!!userAuth.userId}
              onAuthRequired={handleChatClick}
              currentTeam={gameState.currentTeam}
              teams={teams}
              onHighlightIcon={handleHighlightIcon}
            />
          ))}
        </div>
      ) : (
        <div className="private-game-message">
          <div className="private-game-icon">🔒</div>
          <h2>{t('notifications.privateGameTitle')}</h2>
          <p>{t('notifications.privateGameMessage')}</p>
        </div>
      )}

      <GameStatus
        remainingCards={gameState.remainingCards}
        onMenuClick={handleMenuClick}
        onChatClick={handleChatClick}
        isCaptain={isCaptain}
        isCaptainConfirmed={isCaptainConfirmed}
        onCaptainModeToggle={handleCaptainModeToggle}
        onCaptainHelperClick={handleCaptainHelperClick}
        unreadCount={unreadCounts.game + unreadCounts.global}
        isUserAuthorized={!!(userAuth.userId && userAuth.username)}
        currentTeam={gameState.currentTeam}
        highlightMenuIcon={highlightMenuIcon}
        highlightCaptainIcon={highlightCaptainIcon}
        onShowNotification={handleShowNotification}
        currentHint={currentHint}
        hintTeam={gameState.currentTeam}
        onHintClick={() => setShowHintPopup(true)}
        teams={teams}
      />

      <WinDialog
        isOpen={showWinDialog}
        winner={gameState.winner}
        onClose={() => startNewGame()}
        onReturn={() => setShowWinDialog(false)}
      />

      <KeyDialog
        isOpen={showKeyDialog}
        onClose={() => setShowKeyDialog(false)}
        onKeySubmit={startNewGame}
        currentKey={currentKey}
        onBack={() => {
          setShowKeyDialog(false);
          setShowMenuDialog(true);
        }}
        currentDictionary={currentDictionary}
        dictionaries={dictionaries}
      />

      <MenuDialog
        isOpen={showMenuDialog}
        onClose={() => setShowMenuDialog(false)}
        isCaptain={isCaptain}
        onCaptainChange={handleCaptainRequest}
        onNewGame={() => startNewGame()}
        onShowKey={() => {
          setShowMenuDialog(false);
          setShowKeyDialog(true);
        }}
        dictionaries={dictionaries}
        currentDictionary={currentDictionary}
        onDictionaryChange={handleDictionaryChange}
        serverStatus={isServerConnected}
        aiTopic={aiTopic}
        onAITopicChange={setAITopic}
        isGeneratingAI={isGeneratingAI}
        myTeam={myTeam}
        myRole={myRole}
        isAuthenticated={!!userAuth.userId}
        teams={teams}
        ownerId={ownerId}
        userId={userAuth.userId}
        teamsLocked={teamsLocked}
        isPrivate={isPrivate}
        canAccessGame={canAccessGame}
        onJoinTeam={handleJoinTeam}
        onBecomeCaptain={handleBecomeCaptain}
        onLeaveCaptain={handleLeaveCaptain}
        onLockTeams={handleLockTeams}
        onSetPrivate={handleSetPrivate}
      />

      <CaptainDialog
        isOpen={showCaptainDialog}
        onClose={() => {
          setShowCaptainDialog(false);
          setIsPendingCaptainConfirmation(false);
        }}
        onConfirm={handleCaptainConfirm}
        isCaptain={isCaptain}
        isCaptainConfirmed={isCaptainConfirmed}
        gameState={gameState}
        myTeam={myTeam}
        gameKey={currentKey}
        userId={userAuth.userId}
        username={userAuth.username}
      />

      <ChatDialog
        isOpen={showChatDialog}
        onClose={() => setShowChatDialog(false)}
        gameKey={currentKey}
        socket={gameSocket.socket}
        userId={userAuth.userId}
        username={userAuth.username}
        unreadCounts={unreadCounts}
        lastReadMessageIds={lastReadMessageIds}
        onMarkAsRead={handleMarkAsRead}
        onUpdateUnreadCount={setUnreadCounts}
        activeTab={activeChatTab}
        onTabChange={setActiveChatTab}
        canAccessGame={canAccessGame}
        onLogout={() => {
          // Очищаем все данные авторизации
          localStorage.removeItem('codenames-user-id');
          localStorage.removeItem('codenames-username');
          localStorage.removeItem('codenames-pin');

          // НЕ удаляем lastReadMessageIds - они нужны для подсчёта при следующем входе!
          // localStorage.removeItem('codenames-last-read-messages'); ← НЕ ТРОГАЕМ

          // Обнуляем только state счётчиков (при следующем входе пересчитаются)
          setUnreadCounts({ game: 0, global: 0 });

          // Обнуляем состояние авторизации
          setUserAuth({ userId: null, username: '' });
          setShowChatDialog(false);
        }}
      />

      <AuthDialog
        isOpen={showAuthDialog}
        onClose={() => setShowAuthDialog(false)}
        onSuccess={(authData) => {
          setUserAuth(authData);
          setShowAuthDialog(false);
          setShowChatDialog(true);
        }}
      />

      <HintPopup
        isOpen={showHintPopup}
        onClose={() => setShowHintPopup(false)}
        hint={currentHint}
        team={gameState.currentTeam}
        remainingCards={gameState.remainingCards}
        onEndTurn={handleEndTurn}
        canEndTurn={myTeam === gameState.currentTeam && !isCaptain && myTeam !== null}
      />

      {/* Уведомление об ошибках */}
      {gameError && (
        <Notification
          message={gameError}
          isVisible={true}
          duration={notificationDuration}
          onClose={() => setGameError(null)}
        />
      )}

    </div>
  );
};

export default App;