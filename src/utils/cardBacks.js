// Массивы букв из gameGenerator
const CONSONANTS = ["Б", "В", "Г", "Д", "З", "К", "Л", "М", "Н", "П", "Р", "С", "Т", "Х"];
const VOWELS = ["А", "И", "О", "У", "Е", "Я"];

/**
 * Получает номер рубашки для карточки на основе ключа игры и позиции
 * @param {string} gameKey - ключ игры
 * @param {number} position - позиция карточки на поле (0-24)
 * @param {string} color - цвет карточки ('blue', 'red', 'neutral', 'black')
 * @returns {number} номер рубашки (1-20 для обычных цветов, 1-10 для черного)
 */
export function getBackNumber(gameKey, position, color) {
  // Получаем индексы первых двух букв ключа (добавляем 1, чтобы начинать с 1)
  const firstLetterIndex = CONSONANTS.indexOf(gameKey[0]) !== -1 ? 
    CONSONANTS.indexOf(gameKey[0]) + 1 : VOWELS.indexOf(gameKey[0]) + 1;
  const secondLetterIndex = VOWELS.indexOf(gameKey[1]) !== -1 ? 
    VOWELS.indexOf(gameKey[1]) + 1 : CONSONANTS.indexOf(gameKey[1]) + 1;
  
  // Складываем индексы букв + позицию + 1
  let backNumber = firstLetterIndex + secondLetterIndex + (position + 1);
  
  // Определяем максимальное количество рубашек для цвета
  const maxBack = color === 'black' ? 10 : 20;
  
  // Если число больше максимального, вычитаем максимальное значение
  while (backNumber > maxBack) {
    backNumber -= maxBack;
  }
  
  return backNumber;
}