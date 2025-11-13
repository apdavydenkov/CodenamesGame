import { io } from "socket.io-client";

class GameSocket {
  constructor() {
    this.socket = null;
    this.gameKey = null;
    this.words = null;
    this.colors = null;
    this.revealed = null;
    this.currentTeam = null;
    this.remainingCards = null;
    this.gameStateCallback = null;
    this.offlineRevealed = new Set();
  }

  connect(serverUrl = import.meta.env.VITE_API_URL) {
    this.socket = io(serverUrl, {
      transports: ["websocket", "polling"],
      autoConnect: true,
    });

    this.socket.on("connect", () => {
      if (this.gameKey) {
        this.joinGame(this.gameKey, this.words, this.colors, {
          words: this.words,
          colors: this.colors,
          revealed: this.mergeRevealedStates(),
          currentTeam: this.currentTeam,
          remainingCards: this.remainingCards,
        });
      }
    });

    this.socket.on("disconnect", () => {
    });

    this.socket.on("connect_error", (error) => {
      console.error("Connection error:", error);
    });
  }

  mergeRevealedStates() {
    // Создаём базовый массив из 25 элементов
    const baseRevealed = this.revealed || Array(25).fill(false);
    const merged = [...baseRevealed];
    
    // Применяем офлайн-изменения
    this.offlineRevealed.forEach(index => {
      if (index >= 0 && index < 25) {
        merged[index] = true;
      }
    });
    return merged;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  joinGame(gameKey, words, colors, gameState = null) {
    this.gameKey = gameKey;

    if (words?.length) this.words = words;
    if (colors?.length) this.colors = colors;

    if (gameState) {
      if (gameState.words?.length) this.words = gameState.words;
      if (gameState.colors?.length) this.colors = gameState.colors;
      if (gameState.revealed) this.revealed = gameState.revealed;
      if (gameState.currentTeam) this.currentTeam = gameState.currentTeam;
      if (gameState.remainingCards) {
        this.remainingCards = gameState.remainingCards;
      }
    }

    if (this.socket?.connected) {
      this.socket.emit("JOIN_GAME", {
        gameKey,
        words: this.words,
        colors: this.colors,
        gameState: {
          words: this.words,
          colors: this.colors,
          revealed: this.mergeRevealedStates(),
          currentTeam: this.currentTeam,
          remainingCards: this.remainingCards,
        },
      });
    }
  }

  revealCard(cardIndex) {
    if (typeof cardIndex !== 'number' || cardIndex < 0 || cardIndex >= 25) {
      console.error('Invalid card index:', cardIndex);
      return;
    }

    if (this.socket?.connected) {
      const userId = localStorage.getItem('codenames-user-id');
      const username = localStorage.getItem('codenames-username') || 'Аноним';

      this.socket.emit("REVEAL_CARD", {
        gameKey: this.gameKey,
        cardIndex,
        userId,
        username,
      });
    } else if (this.gameStateCallback) {
      this.offlineRevealed.add(cardIndex);
      const newState = this.calculateNewState(cardIndex);
      
      // Обновляем основное состояние
      this.revealed = newState.revealed;
      this.currentTeam = newState.currentTeam;
      this.remainingCards = newState.remainingCards;
      
      this.gameStateCallback(newState);
    }
  }

  calculateNewState(cardIndex) {
    const revealed = this.mergeRevealedStates();
    revealed[cardIndex] = true;

    const cardColor = this.colors?.[cardIndex] || 'neutral';
    let currentTeam = this.currentTeam || 'blue';
    
    // Инициализируем remainingCards если его нет
    if (!this.remainingCards) {
      this.remainingCards = {
        blue: this.colors?.filter(c => c === 'blue').length || 0,
        red: this.colors?.filter(c => c === 'red').length || 0
      };
    }
    
    const remainingCards = { ...this.remainingCards };

    // Логика смены хода
    if (cardColor !== currentTeam || cardColor === 'neutral') {
      currentTeam = currentTeam === 'blue' ? 'red' : 'blue';
    }

    // Обновляем счётчик карт
    if (cardColor === 'blue' || cardColor === 'red') {
      if (remainingCards[cardColor] > 0) {
        remainingCards[cardColor]--;
      }
    }

    // Проверка условия победы
    const gameOver = remainingCards[cardColor] === 0 || cardColor === 'black';
    const winner = gameOver 
      ? cardColor === 'black' 
        ? 'assassin' 
        : cardColor
      : null;

    return {
      words: this.words,
      colors: this.colors,
      revealed,
      currentTeam,
      remainingCards,
      gameOver,
      winner
    };
  }

  startNewGame(gameKey, words, colors) {
    if (!words || !colors || words.length !== 25 || colors.length !== 25) {
      console.error('Invalid game setup');
      return;
    }

    this.gameKey = gameKey;
    this.words = [...words];
    this.colors = [...colors];
    this.revealed = Array(25).fill(false);
    this.currentTeam = 'blue';
    this.remainingCards = {
      blue: colors.filter(c => c === 'blue').length,
      red: colors.filter(c => c === 'red').length
    };
    this.offlineRevealed.clear();

    if (this.socket?.connected) {
      this.socket.emit("NEW_GAME", { 
        gameKey, 
        words: this.words, 
        colors: this.colors 
      });
    }
  }

  onGameState(callback) {
    this.gameStateCallback = callback;
    if (this.socket) {
      this.socket.on("GAME_STATE", (gameState) => {
        this.revealed = gameState.revealed;
        this.currentTeam = gameState.currentTeam;
        this.remainingCards = gameState.remainingCards;
        this.offlineRevealed.clear();
        callback(gameState);
      });
    }
  }

  onPlayerJoined(callback) {
    if (this.socket) {
      this.socket.on("PLAYER_JOINED", callback);
    }
  }

  removeAllListeners() {
    if (this.socket) {
      this.socket.removeAllListeners();
    }
    this.gameStateCallback = null;
  }
}

const gameSocket = new GameSocket();
export default gameSocket;
