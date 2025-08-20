import React, { useState, useEffect } from "react";
import GameCard from "./components/GameCard";
import GameStatus from "./components/GameStatus";
import WinDialog from "./components/WinDialog";
import KeyDialog from "./components/KeyDialog";
import MenuDialog from "./components/MenuDialog";
import CaptainDialog from "./components/CaptainDialog";
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
  const { t } = useTranslation();
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
  const [wasWinDialogShown, setWasWinDialogShown] = useState(false);
  const [showKeyDialog, setShowKeyDialog] = useState(false);
  const [showMenuDialog, setShowMenuDialog] = useState(false);
  const [showCaptainDialog, setShowCaptainDialog] = useState(false);
  const [currentKey, setCurrentKey] = useState("");
  const [isServerConnected, setIsServerConnected] = useState(false);

  const [availableWords, setAvailableWords] = useState([]);
  const [dictionaries, setDictionaries] = useState([]);
  const [currentDictionary, setCurrentDictionary] = useState(null);
  const [aiTopic, setAITopic] = useState("");
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  // Загрузка всех словарей из объединенного файла с кешированием
  const loadAllDictionaries = async () => {
    try {
      const cacheKey = 'codenames_dictionaries';
      const cached = localStorage.getItem(cacheKey);
      
      if (cached) {
        return JSON.parse(cached);
      }
      
      const response = await fetch('/dictionaries/dictionaries.json');
      const data = await response.json();
      
      localStorage.setItem(cacheKey, JSON.stringify(data.dictionaries));
      return data.dictionaries;
    } catch (error) {
      console.error('Ошибка загрузки словарей:', error);
      return [];
    }
  };

  const loadAIDictionary = () => {
    // Виртуальный ИИ-словарь
    return {
      id: "ai_dictionary", 
      index: 3,
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

      if (newState.gameOver && newState.winner && !wasWinDialogShown) {
        setShowWinDialog(true);
        setWasWinDialogShown(true);
      }
    };

    gameSocket.socket.on("connect", handleConnect);
    gameSocket.socket.on("disconnect", handleDisconnect);
    gameSocket.onGameState(handleGameState);

    return () => {
      gameSocket.removeAllListeners();
      gameSocket.disconnect();
    };
  }, [wasWinDialogShown]);

  useEffect(() => {
    const init = async () => {
      // Автоматически загружаем все JSON словари
      const validDictionaries = await loadAllDictionaries();
      
      // Добавляем ИИ-словарь
      const aiDictionary = loadAIDictionary();
      const allDictionaries = [...validDictionaries, aiDictionary];
      setDictionaries(allDictionaries);

      const urlParams = new URLSearchParams(window.location.search);
      const keyFromUrl = urlParams.get("key");
      const dictionary = validDictionaries[0];

      if (!dictionary) return;

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
            setAvailableWords(keyDictionary.words);
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
        setAvailableWords(dictionary.words);
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
  }, []);

  const handleDictionaryChange = (dictionary) => {
    setCurrentDictionary(dictionary);
    setAvailableWords(dictionary.words);
    
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
          console.log(`[ИИ] Начало генерации для темы: "${aiTopic}"`);
          
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
        } catch (error) {
          console.error('[ИИ] Ошибка генерации:', error);
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
      setAvailableWords(gameDictionary.words);
      setCurrentKey(gameKey);
      setWasWinDialogShown(false);
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
        isCaptain={isCaptain}
        isCaptainConfirmed={isCaptainConfirmed}
        onCaptainModeToggle={handleCaptainModeToggle}
        onCaptainHelperClick={handleCaptainHelperClick}
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
    </div>
  );
};

export default App;