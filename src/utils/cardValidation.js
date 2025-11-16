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
    console.log('[CardValidation] Already revealed', logData);
    return null; // Просто игнорируем, не ошибка
  }

  // Проверка 2: Авторизация (всегда)
  if (!isAuthenticated) {
    console.log('[CardValidation] Not authenticated', logData);
    return {
      code: 'NOT_AUTHENTICATED',
      message: 'notifications.enterName',
      action: 'openAuth',
    };
  }

  // В простом режиме - все остальные проверки пропускаем
  if (simpleMode) {
    console.log('[CardValidation] Simple mode - ALLOWED', logData);
    return null; // Можно открывать
  }

  // === ПРОВЕРКИ ДЛЯ ОБЫЧНОГО РЕЖИМА ===

  // Проверка 3: Капитаны не могут открывать
  if (isCaptain || myRole === 'captain') {
    console.log('[CardValidation] Captain cannot play', logData);
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
    console.log('[CardValidation] Captains required', { ...logData, hasBlueCaptain, hasRedCaptain });
    return {
      code: 'CAPTAINS_REQUIRED',
      message: 'notifications.captainsRequired',
      highlight: 'menu',
    };
  }

  // Проверка 5: Выбрана команда
  if (!myTeam) {
    console.log('[CardValidation] No team selected', logData);
    return {
      code: 'NO_TEAM',
      message: 'notifications.chooseTeam',
      highlight: 'menu',
    };
  }

  // Проверка 6: Зрители не могут играть
  if (myTeam === 'spectator') {
    console.log('[CardValidation] Spectator cannot play', logData);
    return {
      code: 'SPECTATOR_CANNOT_PLAY',
      message: 'notifications.spectatorsCannotPlay',
      highlight: 'menu',
    };
  }

  // Проверка 7: Сейчас ход команды игрока
  if (myTeam !== currentTeam) {
    console.log('[CardValidation] Not your turn', logData);
    return {
      code: 'NOT_YOUR_TURN',
      message: 'notifications.notYourTurn',
    };
  }

  // Проверка 8: Капитан дал шифровку
  if (!currentHint) {
    console.log('[CardValidation] Waiting for hint', logData);
    return {
      code: 'WAITING_FOR_HINT',
      message: 'notifications.waitingForHint',
      highlight: 'captain',
    };
  }

  // Все проверки пройдены
  console.log('[CardValidation] All checks passed - ALLOWED', logData);
  return null;
}
