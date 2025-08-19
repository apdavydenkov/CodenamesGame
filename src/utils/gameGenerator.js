import { isAIKey, generateAIGameFromKey } from './aiGameGenerator';

// Определяем допустимые буквы для ключа (добавлена Н для ИИ)
const CONSONANTS = [
  "Б",
  "В",
  "Г",
  "Д",
  "З",
  "К",
  "Л",
  "М",
  "Н", // ИИ-словарь
  "П",
  "Р",
  "С",
  "Т",
  "Х",
];
const VOWELS = ["А", "И", "О", "У", "Е", "Я"];

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

// Проверка валидности буквы
function isValidLetter(letter, isVowel) {
  return isVowel ? VOWELS.includes(letter) : CONSONANTS.includes(letter);
}

// Проверка формата ключа с учётом словарей и ИИ
export function isValidKeyFormat(key) {
  if (!key || key.length !== 7) return false;

  // Проверяем первые 6 букв на паттерн СГСГСГ
  for (let i = 0; i < 6; i++) {
    const isVowel = i % 2 === 1;
    if (!isValidLetter(key[i], isVowel)) return false;
  }

  // Проверяем, что последняя буква - согласная из списка доступных словарей
  const lastLetter = key[6];
  
  // Для ИИ-ключей (буква Н)
  if (lastLetter === 'Н') return true;
  
  // Для обычных словарей - проверяем есть ли буква среди первых N букв массива CONSONANTS
  const maxDictionaryIndex = 2; // Так как у нас 3 обычных словаря (индексы 0, 1, 2)
  return CONSONANTS.slice(0, maxDictionaryIndex + 1).includes(lastLetter);
}

// Генерация случайного ключа с учетом выбранного словаря
export function generateNewKey(dictionaryIndex) {
  if (dictionaryIndex < 0 || dictionaryIndex >= CONSONANTS.length) {
    throw new Error("Invalid dictionary index");
  }

  const key = [];

  // Генерируем СГСГСГ паттерн
  for (let i = 0; i < 6; i++) {
    const isVowel = i % 2 === 1;
    const letters = isVowel ? VOWELS : CONSONANTS;
    key.push(letters[Math.floor(Math.random() * letters.length)]);
  }

  // Добавляем букву словаря (каждому словарю соответствует своя буква по порядку из массива CONSONANTS)
  key.push(CONSONANTS[dictionaryIndex]);

  return key.join("");
}

// Генерация игры на основе ключа
export async function generateGameFromKey(key, availableWords, dictionaryIndex) {
  if (!isValidKeyFormat(key)) return null;

  // Если это ИИ-ключ, делегируем в aiGameGenerator
  if (isAIKey(key)) {
    return await generateAIGameFromKey(key);
  }

  // Строго проверяем, что последняя буква соответствует индексу словаря
  if (key[6] !== CONSONANTS[dictionaryIndex]) return null;

  // Создаем сид на основе первых 6 букв ключа
  const seed = key
    .slice(0, 6)
    .split("")
    .reduce((acc, char, index) => {
      return acc * 31 + char.charCodeAt(0) * (index + 1);
    }, 0);

  const random = mulberry32(seed);

  // Сортируем слова по алфавиту перед перемешиванием
  const sortedWords = [...availableWords].sort((a, b) => a.localeCompare(b));
  const shuffledWords = shuffleArray([...sortedWords], random);
  const gameWords = shuffledWords.slice(0, 25);

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
  };
}

// Получение индекса словаря из ключа
export function getDictionaryIndexFromKey(key) {
  if (!isValidKeyFormat(key)) return -1;

  // Если это ИИ-ключ, возвращаем специальный индекс
  if (isAIKey(key)) return 3; // ИИ-словарь имеет индекс 3

  // Находим индекс последней буквы в массиве согласных
  // Этот индекс и есть индекс словаря
  return CONSONANTS.indexOf(key[6]);
}

// Экспортируем константы для использования в других модулях
export const VALID_KEY_CONSONANTS = CONSONANTS;
export const VALID_KEY_VOWELS = VOWELS;