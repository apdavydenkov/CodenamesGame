/**
 * Что человек видит в меню игры.
 *
 * Место в команде выбирают все: гостю клик по кнопке откроет вход.
 * Настройки партии (простой режим, набор, приватность) видит только её владелец —
 * им становится создатель партии, а партию гостя забирает первый вошедший участник.
 */
export function menuAccess({ isAuthenticated, userId, ownerId, teamsLocked, myTeam, canAccessGame }) {
  const isOwner = Boolean(isAuthenticated && ownerId && ownerId === userId);
  const inTeam = myTeam === 'blue' || myTeam === 'red';

  return {
    isOwner,
    // Когда набор закрыт, места остаются владельцу и тем, кто уже в команде
    showSeats: Boolean(canAccessGame && (!teamsLocked || isOwner || inTeam)),
  };
}
