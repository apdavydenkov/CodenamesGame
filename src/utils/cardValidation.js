/**
 * Валидация условий для открытия карточки
 * Возвращает null если можно открывать, или объект ошибки
 */
export function validateCardReveal({
  revealed,
  isAuthenticated,
  simpleMode,
  isCaptain,
  myRole,
  teams,
  myTeam,
  currentTeam,
  currentHint,
}) {
  const logData = {
    timestamp: new Date().toISOString(),
    revealed,
    isAuthenticated,
    simpleMode,
    isCaptain,
    myRole,
    myTeam,
    currentTeam,
    teams: teams ? {
      blueCaptain: teams?.blue?.captain,
      redCaptain: teams?.red?.captain,
    } : null,
    currentHint: currentHint ? 'exists' : null,
  };

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

  // В простом режиме - все остальные проверки пропускаем
  if (simpleMode) {
    return null; // Можно открывать
  }

  // === ПРОВЕРКИ ДЛЯ ОБЫЧНОГО РЕЖИМА ===

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

  // Проверка 5: Выбрана команда
  if (!myTeam) {
    return {
      code: 'NO_TEAM',
      message: 'notifications.chooseTeam',
      highlight: 'menu',
    };
  }

  // Проверка 6: Зрители не могут играть
  if (myTeam === 'spectator') {
    return {
      code: 'SPECTATOR_CANNOT_PLAY',
      message: 'notifications.spectatorsCannotPlay',
      highlight: 'menu',
    };
  }

  // Проверка 7: Сейчас ход команды игрока
  if (myTeam !== currentTeam) {
    return {
      code: 'NOT_YOUR_TURN',
      message: 'notifications.notYourTurn',
    };
  }

  // Проверка 8: Капитан дал шифровку
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
