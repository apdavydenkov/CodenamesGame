import { useState, useEffect, useEffectEvent, useCallback, useRef } from "react";
import GameCard from "./components/GameCard";
import GameStatus from "./components/GameStatus";
import WinDialog from "./components/dialogs/WinDialog";
import MenuDialog from "./components/dialogs/MenuDialog";
import CaptainDialog from "./components/dialogs/CaptainDialog";
import ChatDialog from "./components/dialogs/ChatDialog";
import AuthDialog from "./components/dialogs/AuthDialog";
import HintDialog from "./components/dialogs/HintDialog";
import MetaTags from "./components/MetaTags";
import { validateCardReveal } from "./utils/cardValidation";
import { getBackground } from "./utils/cardBacks";
import {
  generateGameFromKey,
  generateNewKey,
  getDictionaryIndexFromKey,
} from "./utils/gameGenerator";
import { isAIKey } from "./utils/aiGameGenerator";
import { api } from "./services/api";
import gameSocket from "./services/socket";
import { useTranslation } from "./hooks/useTranslation";
import { useNotify } from "./contexts/NotificationContext";
import { useChat } from "./hooks/useChat";

const App = () => {

  const { t, language } = useTranslation();
  const notify = useNotify();
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
  const [showWinDialog, setShowWinDialog] = useState(false);
  const wasWinDialogShownRef = useRef(false);
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
  const [highlightMenuIcon, setHighlightMenuIcon] = useState(false);
  const [highlightCaptainIcon, setHighlightCaptainIcon] = useState(false);

  // Состояние подсказок
  const [currentHint, setCurrentHint] = useState(null);
  const [showHintPopup, setShowHintPopup] = useState(false);

  // Простой режим (включен по умолчанию)
  const [advancedMode, setAdvancedMode] = useState(false);

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

    // Проверяем зрителей
    const spectator = teams.spectators?.find(s => s.userId === userId);
    if (spectator) {
      return { team: 'spectator', role: 'spectator', username: spectator.username };
    }

    return null;
  };

  // Handlers для команд
  const handleJoinTeam = (team, role) => {
    if (!userAuth.userId || !userAuth.username) {
      setShowAuthDialog(true);
      return;
    }

    gameSocket.socket.emit('JOIN_TEAM', {
      gameKey: currentKey,
      team,
      role,
      userId: userAuth.userId,
      username: userAuth.username
    });
  };

  const handleLockTeams = () => {
    gameSocket.socket.emit('LOCK_TEAMS', {
      gameKey: currentKey,
      userId: userAuth.userId,
      username: userAuth.username
    });
  };

  const handleSetPrivate = (isPrivate) => {
    gameSocket.socket.emit('SET_PRIVATE', {
      gameKey: currentKey,
      userId: userAuth.userId,
      username: userAuth.username,
      isPrivate
    });
  };

  const handleToggleAdvancedMode = () => {
    gameSocket.socket.emit('TOGGLE_ADVANCED_MODE', {
      gameKey: currentKey,
      userId: userAuth.userId,
      enabled: !advancedMode
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

  const showError = useEffectEvent((message) => notify(message));

  const handleTeamsUpdate = useEffectEvent((data) => {
    setTeams(data.teams);
    setOwnerId(data.ownerId ?? null);

    // Обновляем свою команду и роль
    if (userAuth.userId && data.teams) {
      const userTeam = findUserTeam(data.teams, userAuth.userId);
      const newRole = userTeam?.role || null;

      // Если роль изменилась - сбрасываем режим капитана при смене роли
      if (newRole !== 'captain') {
        setIsCaptain(false);
      }

      setMyRole(newRole);
      setMyTeam(userTeam?.team || null);
    }
  });

  const handleGameState = useEffectEvent((newState) => {
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

      // Синхронизируем currentHint с сервером
      if (newState.currentHint) {
        setCurrentHint(newState.currentHint);
      } else {
        setCurrentHint(null);
      }

      // Обновляем данные команд из GAME_STATE
      if (newState.teams) {
        setTeams(newState.teams);

        // Обновляем свою команду и роль
        if (userAuth.userId && userAuth.username) {
          const userTeam = findUserTeam(newState.teams, userAuth.userId);
          const newTeam = userTeam?.team || null;
          const newRole = userTeam?.role || null;

          setMyTeam(newTeam);
          setMyRole(newRole);

          // Если роль изменилась на НЕ-капитана - сбрасываем режим капитана
          if (newRole !== 'captain') {
            setIsCaptain(false);
          }
        }
      }

      if (newState.ownerId !== undefined) setOwnerId(newState.ownerId);
      if (newState.teamsLocked !== undefined) setTeamsLocked(newState.teamsLocked);
      if (newState.isPrivate !== undefined) setIsPrivate(newState.isPrivate);
      if (newState.canAccessGame !== undefined) {
        setCanAccessGame(newState.canAccessGame);
      }

      // Обновляем простой режим
      if (newState.advancedMode !== undefined) {
        setAdvancedMode(newState.advancedMode);
      }

      // Показываем диалог победы только один раз
      if (newState.gameOver && newState.winner && !wasWinDialogShownRef.current) {
        wasWinDialogShownRef.current = true;
        setShowWinDialog(true);
      }
  });

  useEffect(() => {
    gameSocket.connect();

    const handleConnect = () => setIsServerConnected(true);
    const handleDisconnect = () => setIsServerConnected(false);


    gameSocket.socket.on("connect", handleConnect);
    gameSocket.socket.on("disconnect", handleDisconnect);
    gameSocket.onGameState(state => handleGameState(state));

    // Обработчики команд
    gameSocket.socket.on("TEAMS_UPDATE", data => handleTeamsUpdate(data));

    gameSocket.socket.on("JOIN_TEAM_SUCCESS", (data) => {
      setMyTeam(data.team);
      setMyRole(data.role);
    });

    gameSocket.socket.on("GAME_SETTINGS_UPDATE", (data) => {
      if (data.advancedMode !== undefined) {
        setAdvancedMode(data.advancedMode);
      }
      if (data.teamsLocked !== undefined) setTeamsLocked(data.teamsLocked);
      if (data.isPrivate !== undefined) setIsPrivate(data.isPrivate);
      if (data.currentHint !== undefined) setCurrentHint(data.currentHint);
    });

    gameSocket.socket.on("HINT_GIVEN", (data) => {
      setCurrentHint(data.hint);
      setShowHintPopup(true);
    });

    gameSocket.socket.on("TURN_ENDED", (data) => {
      // КРИТИЧНО: Обновляем currentTeam в gameState
      setGameState(prev => {
        return {
          ...prev,
          currentTeam: data.currentTeam
        };
      });

      setCurrentHint(null);
      setShowHintPopup(false);
    });

    gameSocket.socket.on("GAME_ERROR", (error) => {
      console.error("[Teams] GAME_ERROR:", error);
      showError(error.message);
    });

    return () => {
      gameSocket.removeAllListeners();
      gameSocket.disconnect();
    };
  }, []); // Подключаемся только один раз при монтировании

  // Ставит партию в состояние и в URL — общий путь для запуска, смены языка и новой игры
  const applyGame = (key, dictionary, gameData) => {
    setCurrentDictionary(dictionary);
    setCurrentKey(key);

    const url = new URL(window.location);
    if (url.searchParams.get("key") !== key) {
      url.searchParams.set("key", key);
      window.history.pushState({}, "", url.toString());
    }

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
  };

  // Словари локали, последним — виртуальный ИИ-словарь
  const loadDictionaryList = async () => {
    const regular = await loadAllDictionaries(language);
    setDictionaries([...regular, loadAIDictionary()]);
    return regular;
  };

  // Свежая партия на первом словаре локали: автозапуск и смена языка
  const startFreshGame = async (dictionary) => {
    const key = generateNewKey(0);
    const gameData = await generateGameFromKey(key, dictionary.words, 0);

    if (!gameData) return;

    applyGame(key, dictionary, gameData);
    gameSocket.startNewGame(key, gameData.words, gameData.colors, gameData.startingTeam, userAuth.userId);
  };

  const init = useEffectEvent(async () => {
    const regular = await loadDictionaryList();

    if (!regular.length) return;

    // Игра из ссылки, если ключ открывается; иначе просто раздаём новую
    const key = new URLSearchParams(window.location.search).get("key");
    const index = key ? getDictionaryIndexFromKey(key) : -1;
    const dictionary = key && (isAIKey(key) ? loadAIDictionary() : regular[index]);
    const gameData = dictionary && await generateGameFromKey(key, dictionary.words, index);

    if (!gameData) return startFreshGame(regular[0]);

    applyGame(key, dictionary, gameData);
    gameSocket.joinGame(key, gameData.words, gameData.colors, null, userAuth.userId);
  });

  // Инициализация при монтировании
  useEffect(() => {
    init();
  }, []);

  useEffect(() => {
    if (currentKey) document.body.style.backgroundImage = `url('${getBackground(currentKey)}')`;
  }, [currentKey]);

  // Автоматическое присоединение к зрителям при загрузке с ключом
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

  // Смена языка — новая партия на словаре новой локали
  const changeLanguage = useEffectEvent(async () => {
    // На первой загрузке словари ставит init, повторять не нужно
    if (dictionaries.length === 0) return;

    const regular = await loadDictionaryList();

    if (regular.length) startFreshGame(regular[0]);
  });

  // Перезагрузка словарей при смене языка
  useEffect(() => {
    changeLanguage();
  }, [language]);

  const chat = useChat(gameSocket.socket, userAuth.userId, currentKey);

  const handleDictionaryChange = (dictionary) => {
    setCurrentDictionary(dictionary);

    // Очищаем тему при смене словаря
    if (dictionary.id !== "ai_dictionary") {
      setAITopic("");
    }
  };


  const startNewGame = async (key = null) => {
    if (!currentDictionary) return;

    let gameKey = key;
    let newGameData;
    let gameDictionary = currentDictionary;

    if (key) {
      // Вход по чужому ключу: словарь зашит в сам ключ
      const dictionaryIndex = getDictionaryIndexFromKey(key);
      const keyDictionary = isAIKey(key)
        ? dictionaries.find((d) => d.id === "ai_dictionary")
        : dictionaries.filter((d) => d.id !== "ai_dictionary")[dictionaryIndex];

      newGameData = keyDictionary && await generateGameFromKey(key, keyDictionary.words, dictionaryIndex);

      if (!newGameData) throw new Error(t(isAIKey(key) ? 'keyDialog.aiGameNotFound' : 'keyDialog.invalidKey'));

      gameDictionary = keyDictionary;
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
          const generated = await api.generateWords(aiTopic);

          // Используем полученный ключ и перезагружаем страницу
          gameKey = generated.id;
          const url = new URL(window.location);
          url.searchParams.set("key", gameKey);
          window.location.href = url.toString();
          return;
        } catch (error) {
          alert(error.message || t('errors.aiGenerationError'));
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

      wasWinDialogShownRef.current = false;
      setIsCaptain(false);
      applyGame(gameKey, gameDictionary, newGameData);

      if (key) {
        gameSocket.joinGame(gameKey, null, null, null, userAuth.userId);
      } else {
        gameSocket.startNewGame(gameKey, newGameData.words, newGameData.colors, newGameData.startingTeam, userAuth.userId);
      }
    }

    setShowWinDialog(false);
    setShowMenuDialog(false);
  };

  const handleCaptainConfirm = () => {
    setIsCaptain(true);
    // НЕ закрываем диалог, чтобы показать форму подсказки
    // setShowCaptainDialog(false);
  };

  const handleCaptainModeToggle = useCallback(() => {
    setIsCaptain(!isCaptain);
  }, [isCaptain]);

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

  const handleCardClick = useCallback((index) => {
    // Валидация через единую функцию
    const error = validateCardReveal({
      revealed: gameState.revealed[index],
      isAuthenticated: !!userAuth.userId,
      advancedMode,
      isCaptain,
      myRole,
      teams,
      myTeam,
      currentTeam: gameState.currentTeam,
      currentHint,
    });

    // Если есть ошибка - блокируем
    if (error) {
      return;
    }

    // Отправляем на сервер
    gameSocket.revealCard(index);
  }, [gameState.revealed, gameState.currentTeam, userAuth.userId, advancedMode, isCaptain, myRole, teams, myTeam, currentHint]);

  return (
    <div className="h-dvh flex flex-col p-1.5 w-full max-w-full ml-0 mr-0">
      <MetaTags />
      {!isGameStateReceived ? (
        <div className="grid grid-cols-5 grid-rows-5 gap-1 mb-1.5 w-full h-[calc(100vh-3.5rem)] min-h-0 select-none [-webkit-touch-callout:none] [-webkit-user-select:none] [-moz-user-select:none] portrait:h-auto portrait:aspect-[0.8] portrait:my-auto"></div>
      ) : canAccessGame ? (
        <div className="grid grid-cols-5 grid-rows-5 gap-1 mb-1.5 w-full h-[calc(100vh-3.5rem)] min-h-0 select-none [-webkit-touch-callout:none] [-webkit-user-select:none] [-moz-user-select:none] portrait:h-auto portrait:aspect-[0.8] portrait:my-auto">
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
              currentHint={currentHint}
              onHighlightIcon={handleHighlightIcon}
              gameSettings={{ advancedMode }}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-[calc(100vh-3.5rem)] text-center p-8 text-gray-500 [animation:fadeInUp_0.5s_ease-out] portrait:h-auto portrait:my-auto">
          <div className="text-6xl mb-4 [animation:fadeInUp_0.6s_ease-out]">🔒</div>
          <h2 className="text-2xl font-semibold text-gray-700 m-0 mb-4 [animation:fadeInUp_0.7s_ease-out]">{t('notifications.privateGameTitle')}</h2>
          <p className="text-base text-gray-500 m-0 max-w-md [animation:fadeInUp_0.8s_ease-out]">{t('notifications.privateGameMessage')}</p>
        </div>
      )}

      <GameStatus
        remainingCards={gameState.remainingCards}
        onMenuClick={handleMenuClick}
        onChatClick={handleChatClick}
        isCaptain={isCaptain}
        myRole={myRole}
        onCaptainModeToggle={handleCaptainModeToggle}
        onCaptainHelperClick={handleCaptainHelperClick}
        unreadCount={chat.unreadCounts.game + chat.unreadCounts.global}
        isUserAuthorized={!!(userAuth.userId && userAuth.username)}
        currentTeam={gameState.currentTeam}
        myTeam={myTeam}
        highlightMenuIcon={highlightMenuIcon}
        highlightCaptainIcon={highlightCaptainIcon}
        currentHint={currentHint}
        hintTeam={gameState.currentTeam}
        onHintClick={() => setShowHintPopup(true)}
        teams={teams}
        gameSettings={{ advancedMode }}
      />

      <WinDialog
        isOpen={showWinDialog}
        winner={gameState.winner}
        onClose={() => startNewGame()}
        onReturn={() => setShowWinDialog(false)}
      />

      <MenuDialog
        isOpen={showMenuDialog}
        onClose={() => setShowMenuDialog(false)}
        onNewGame={() => startNewGame()}
        onOpenKey={startNewGame}
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
        ownerId={ownerId}
        userId={userAuth.userId}
        teamsLocked={teamsLocked}
        isPrivate={isPrivate}
        canAccessGame={canAccessGame}
        onJoinTeam={handleJoinTeam}
        onLockTeams={handleLockTeams}
        onSetPrivate={handleSetPrivate}
        gameSettings={{ advancedMode }}
        onToggleAdvancedMode={handleToggleAdvancedMode}
      />

      <CaptainDialog
        isOpen={showCaptainDialog}
        onClose={() => {
          setShowCaptainDialog(false);
        }}
        onConfirm={handleCaptainConfirm}
        isCaptain={isCaptain}
        gameState={gameState}
        myTeam={myTeam}
        gameKey={currentKey}
        userId={userAuth.userId}
        username={userAuth.username}
        gameSettings={{ advancedMode }}
      />

      <ChatDialog
        isOpen={showChatDialog}
        onClose={() => setShowChatDialog(false)}
        gameKey={currentKey}
        socket={gameSocket.socket}
        userId={userAuth.userId}
        username={userAuth.username}
        messages={chat.messages}
        unreadCounts={chat.unreadCounts}
        onMarkRead={chat.markRead}
        onLoadOlder={chat.loadOlder}
        activeTab={activeChatTab}
        onTabChange={setActiveChatTab}
        canAccessGame={canAccessGame}
        onLogout={() => {
          // Очищаем все данные авторизации
          localStorage.removeItem('codenames-user-id');
          localStorage.removeItem('codenames-username');
          localStorage.removeItem('codenames-pin');

          // Отметки о прочтении не трогаем: они нужны для подсчёта при следующем входе

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

      <HintDialog
        isOpen={showHintPopup}
        onClose={() => {
          setShowHintPopup(false);
        }}
        hint={currentHint}
        team={gameState.currentTeam}
        remainingCards={gameState.remainingCards}
        onEndTurn={handleEndTurn}
        canEndTurn={myTeam === gameState.currentTeam && !isCaptain && myTeam !== null}
      />
    </div>
  );
};

export default App;