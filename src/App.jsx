import { useState, useEffect, useCallback, useRef } from "react";
import GameCard from "./components/GameCard";
import GameStatus from "./components/GameStatus";
import WinDialog from "./components/WinDialog";
import KeyDialog from "./components/KeyDialog";
import MenuDialog from "./components/MenuDialog";
import CaptainDialog from "./components/CaptainDialog";
import ChatDialog from "./components/ChatDialog";
import AuthDialog from "./components/AuthDialog";
import MetaTags from "./components/MetaTags";
import LanguageSwitcher from "./components/LanguageSwitcher";
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
  const [showWinDialog, setShowWinDialog] = useState(false);
  const wasWinDialogShownRef = useRef(false);
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
            // Асинхронно проверяем обновления в фоне (не блокируем загрузку)
            setTimeout(async () => {
              try {
                const response = await fetch(url);
                const serverLastModified = response.headers.get('Last-Modified');

                if (serverLastModified !== cachedData.lastModified) {
                  const data = await response.json();
                  localStorage.setItem(cacheKey, JSON.stringify({
                    data: data.dictionaries,
                    lastModified: serverLastModified
                  }));
                }
              } catch (e) {
                // Игнорируем ошибки фоновой проверки
              }
            }, 1000);

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

  useEffect(() => {
    gameSocket.connect();

    const handleConnect = () => setIsServerConnected(true);
    const handleDisconnect = () => setIsServerConnected(false);

    const handleGameState = (newState) => {
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

      // Показываем диалог победы только один раз
      if (newState.gameOver && newState.winner && !wasWinDialogShownRef.current) {
        wasWinDialogShownRef.current = true;
        setShowWinDialog(true);
      }
    };

    gameSocket.socket.on("connect", handleConnect);
    gameSocket.socket.on("disconnect", handleDisconnect);
    gameSocket.onGameState(handleGameState);

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

            gameSocket.joinGame(keyFromUrl, gameData.words, gameData.colors);
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

        gameSocket.startNewGame(newKey, gameData.words, gameData.colors);
      }
      
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount - intentionally empty deps

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
        
        gameSocket.startNewGame(newKey, gameData.words, gameData.colors);
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
    if (!gameSocket.socket || !userAuth.userId || !currentKey) return;

    const joinChats = () => {

      // Присоединяемся к игровому чату
      gameSocket.socket.emit("JOIN_CHAT", { gameKey: currentKey });

      // Присоединяемся к глобальному чату
      gameSocket.socket.emit("JOIN_CHAT", { gameKey: "GLOBAL_CHAT" });
    };

    // Присоединяемся сразу при монтировании
    joinChats();

    // Переподключаемся при восстановлении соединения (для мобильных)
    gameSocket.socket.on('connect', joinChats);

    return () => {
      gameSocket.socket.off('connect', joinChats);
    };
  }, [userAuth.userId, currentKey]);

  // Отслеживание новых сообщений для счётчиков непрочитанных
  useEffect(() => {
    if (!gameSocket.socket) return;


    const handleNewMessage = (message) => {
      const chatKey = message.gameKey === 'GLOBAL_CHAT' ? 'global' : 'game';


      // Игнорируем свои сообщения
      if (message.userId === userAuth.userId) {
        return;
      }

      // Не увеличиваем счётчик если чат открыт И это активная вкладка
      if (showChatDialog && activeChatTab === chatKey) {
        return;
      }

      // Увеличиваем счётчик
      setUnreadCounts(prev => {
        const newCounts = { ...prev, [chatKey]: prev[chatKey] + 1 };
        return newCounts;
      });
    };

    gameSocket.socket.on('NEW_MESSAGE', handleNewMessage);

    return () => {
      gameSocket.socket.off('NEW_MESSAGE', handleNewMessage);
    };
  }, [userAuth.userId, showChatDialog, activeChatTab]);

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
        gameSocket.joinGame(gameKey);
      } else {
        gameSocket.startNewGame(gameKey, newGameData.words, newGameData.colors);
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
    setIsCaptainConfirmed(true);
    setIsCaptain(true);
    setShowCaptainDialog(false);
  };

  const handleCaptainModeToggle = () => {
    if (isCaptainConfirmed) {
      setIsCaptain(!isCaptain);
    }
  };

  const handleCaptainHelperClick = () => {
    setShowCaptainDialog(true);
  };

  const handleCardClick = (index) => {
    if (gameState.revealed[index] || isCaptain) return;
    gameSocket.revealCard(index);
  };

  return (
    <div className="container">
      <MetaTags />
      <LanguageSwitcher />
      <div className="game-grid">
        {gameState.words.map((word, index) => (
          <GameCard
            key={`${currentKey}-${index}`}
            word={word}
            color={gameState.colors[index]}
            revealed={gameState.revealed[index]}
            onConfirm={() => handleCardClick(index)}
            isCaptain={isCaptain}
            gameKey={currentKey}
            position={index}
          />
        ))}
      </div>

      <GameStatus
        remainingCards={gameState.remainingCards}
        onMenuClick={() => setShowMenuDialog(true)}
        onChatClick={() => {

          // Если не авторизован - показываем диалог авторизации
          if (!userAuth.username || !userAuth.userId) {
            setShowAuthDialog(true);
          } else {
            setShowChatDialog(true);
          }
        }}
        isCaptain={isCaptain}
        isCaptainConfirmed={isCaptainConfirmed}
        onCaptainModeToggle={handleCaptainModeToggle}
        onCaptainHelperClick={handleCaptainHelperClick}
        unreadCount={unreadCounts.game + unreadCounts.global}
        isUserAuthorized={!!(userAuth.userId && userAuth.username)}
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
      />

      <CaptainDialog
        isOpen={showCaptainDialog}
        onClose={() => setShowCaptainDialog(false)}
        onConfirm={handleCaptainConfirm}
        isCaptain={isCaptain}
        isCaptainConfirmed={isCaptainConfirmed}
        gameState={gameState}
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

    </div>
  );
};

export default App;