// API сервис для работы с ИИ (заглушка)

/**
 * Генерация слов через ИИ по теме
 * @param {string} topic - тема для генерации слов
 * @returns {Promise<{success: boolean, key?: string, words?: string[], message?: string}>}
 */
export const generateAIWords = async (topic) => {
  try {
    console.log(`[ИИ] Запрос генерации слов для темы: "${topic}"`);
    
    const response = await fetch('/api/generate-words', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ topic }),
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log(`[ИИ] Успешно сгенерирована игра с ключом: ${result.key}`);
      return {
        success: true,
        key: result.key,
        words: result.words,
        topic: result.topic
      };
    } else {
      console.error(`[ИИ] Ошибка генерации: ${result.message}`);
      return {
        success: false,
        message: result.message
      };
    }
    
  } catch (error) {
    console.error('[ИИ] Ошибка запроса:', error);
    return {
      success: false,
      message: "Connection error"
    };
  }
};

/**
 * Получение игры по ключу из файла
 * @param {string} key - ключ игры
 * @returns {Promise<{words: string[], topic: string} | null>}
 */
export const getAIGameByKey = async (key) => {
  try {
    console.log(`[ИИ] Поиск игры для ключа ${key}...`);
    const response = await fetch('/dictionaries/ai_games.json');
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const games = await response.json();
    const game = games[key];
    
    if (game) {
      console.log(`[ИИ] Найдена игра для ключа ${key}, тема: "${game.topic}"`);
      return {
        words: game.words,
        topic: game.topic
      };
    }
    
    console.log(`[ИИ] Игра с ключом ${key} не найдена`);
    return null;
  } catch (error) {
    console.error(`[ИИ] Ошибка загрузки игры для ключа ${key}:`, error);
    return null;
  }
};