import { getAIGameByKey } from '../services/aiService';

// Функция для создания детерминированного рандома на основе сида
function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    var t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Функция для перемешивания массива с использованием переданного генератора случайных чисел
function shuffleArray(array, random) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/**
 * Проверка является ли ключ ИИ-ключом
 * @param {string} key - ключ для проверки
 * @returns {boolean}
 */
export function isAIKey(key) {
  return key && key.length === 7 && key[6] === 'Н';
}

/**
 * Генерация игры на основе ИИ-ключа
 * @param {string} key - ИИ-ключ
 * @returns {Promise<{words: string[], colors: string[], startingTeam: string} | null>}
 */
export async function generateAIGameFromKey(key) {
  if (!isAIKey(key)) {
    return null;
  }

  // Загружаем слова из файла
  const aiGame = await getAIGameByKey(key);
  if (!aiGame) {
    return null;
  }

  if (!aiGame.words || aiGame.words.length < 25) {
    return null;
  }

  // Берем первые 25 слов
  const gameWords = aiGame.words.slice(0, 25);

  // Создаем сид на основе первых 6 букв ключа (как в обычных играх)
  const seed = key
    .slice(0, 6)
    .split("")
    .reduce((acc, char, index) => {
      return acc * 31 + char.charCodeAt(0) * (index + 1);
    }, 0);

  const random = mulberry32(seed);

  // Определяем начинающую команду на основе первой буквы
  const firstTeamBlue = key.charCodeAt(0) % 2 === 0;

  // Создаем базовый набор цветов
  const colors = [
    ...Array(9).fill(firstTeamBlue ? "blue" : "red"),
    ...Array(8).fill(firstTeamBlue ? "red" : "blue"),
    ...Array(7).fill("neutral"),
    "black",
  ];

  // Перемешиваем цвета с тем же генератором
  shuffleArray(colors, random);

  return {
    words: gameWords,
    colors: colors,
    startingTeam: firstTeamBlue ? "blue" : "red",
    topic: aiGame.topic
  };
}