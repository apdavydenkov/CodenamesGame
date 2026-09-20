// Сколько рубашек лежит в public/images для каждого цвета
const BACKS = { blue: 40, red: 40, neutral: 40, black: 12 };

const hash = (seed) => {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  }
  // Финальное перемешивание: без него у соседних позиций номера идут подряд
  h ^= h >>> 16;
  h = Math.imul(h, 2246822507);
  h ^= h >>> 13;
  h = Math.imul(h, 3266489909);
  return (h ^ (h >>> 16)) >>> 0;
};

// Своя тасовка номеров на каждый ключ игры, чтобы на доске не было повторов
const decks = new Map();
const deck = (gameKey, color) => {
  const id = `${gameKey}:${color}`;
  if (!decks.has(id)) {
    const order = Array.from({ length: BACKS[color] }, (_, i) => i + 1);
    for (let i = order.length - 1; i > 0; i--) {
      const j = hash(`${id}:${i}`) % (i + 1);
      [order[i], order[j]] = [order[j], order[i]];
    }
    decks.set(id, order);
  }
  return decks.get(id);
};

/**
 * Картинка рубашки для карточки: номер и зеркальность.
 * Считается детерминированно из ключа игры и позиции — ключ у всех игроков
 * один, значит и рубашки совпадают.
 * @param {string} gameKey - ключ игры
 * @param {number} position - позиция карточки на поле (0-24)
 * @param {string} color - цвет карточки ('blue', 'red', 'neutral', 'black')
 * @returns {{number: number, mirrored: boolean}}
 */
export function getCardBack(gameKey, position, color) {
  const order = deck(gameKey, color);
  return {
    number: order[position % order.length],
    mirrored: (hash(`${gameKey}:${position}:${color}`) & 1) === 1,
  };
}
