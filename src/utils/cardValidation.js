/**
 * Валидация условий для открытия карточки
 * Возвращает null если можно открывать, или объект ошибки
 */
export function validateCardReveal({
  revealed,
  isAuthenticated,
  advancedMode,
  isCaptain,
  myRole,
  teams,
  myTeam,
  currentTeam,
  currentHint,
}) {
  // Проверка 1: Карточка уже открыта
  if (revealed) {
    return null; // Просто игнорируем, не ошибка
  }

  // Проверка 2: Авторизация (всегда)
  if (!isAuthenticated) {
    return {
      code: 'NOT_AUTHENTICATED',
      message: 'notifications.enterName',
      action: 'openAuth',
    };
  }

  // Вне продвинутого режима остальные проверки не нужны: карточки открывают все
  if (!advancedMode) {
    return null;
  }

  // === ПРОВЕРКИ ПРОДВИНУТОГО РЕЖИМА ===

  // Проверка 3: Капитаны не могут открывать
  if (isCaptain || myRole === 'captain') {
    return {
      code: 'CAPTAIN_CANNOT_PLAY',
      message: 'notifications.captainsCannotPlay',
      highlight: 'captain',
    };
  }

  // Проверка 4: Наличие капитанов в обеих командах
  const hasBlueCaptain = Boolean(teams?.blue?.captain);
  const hasRedCaptain = Boolean(teams?.red?.captain);

  if (!hasBlueCaptain || !hasRedCaptain) {
    return {
      code: 'CAPTAINS_REQUIRED',
      message: 'notifications.captainsRequired',
      highlight: 'menu',
    };
  }

  // Проверка 5: Играют только участники команд, остальные наблюдают
  if (myTeam !== 'blue' && myTeam !== 'red') {
    return {
      code: 'NO_TEAM',
      message: 'notifications.chooseTeam',
      highlight: 'menu',
    };
  }

  // Проверка 6: Сейчас ход команды игрока
  if (myTeam !== currentTeam) {
    return {
      code: 'NOT_YOUR_TURN',
      message: 'notifications.notYourTurn',
    };
  }

  // Проверка 7: Капитан дал шифровку
  if (!currentHint) {
    return {
      code: 'WAITING_FOR_HINT',
      message: 'notifications.waitingForHint',
      highlight: 'captain',
    };
  }

  // Все проверки пройдены
  return null;
}
