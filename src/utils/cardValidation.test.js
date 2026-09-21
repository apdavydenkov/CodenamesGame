import { describe, it, expect } from 'vitest';
import { validateCardReveal } from './cardValidation.js';

// Ситуация, когда карточку открыть можно; каждый тест отклоняется от неё в одном
const allowed = {
  revealed: false,
  isAuthenticated: true,
  advancedMode: true,
  isCaptain: false,
  myRole: 'player',
  teams: { blue: { captain: 'u1' }, red: { captain: 'u2' } },
  myTeam: 'blue',
  currentTeam: 'blue',
  currentHint: { word: 'море', count: 2 },
};

const check = overrides => validateCardReveal({ ...allowed, ...overrides });

describe('validateCardReveal', () => {
  it('разрешает открыть карточку, когда все условия выполнены', () => {
    expect(check({})).toBeNull();
  });

  it('игнорирует уже открытую карточку без ошибки', () => {
    expect(check({ revealed: true })).toBeNull();
  });

  it.each([
    ['без авторизации', { isAuthenticated: false }, 'NOT_AUTHENTICATED'],
    ['капитану', { isCaptain: true }, 'CAPTAIN_CANNOT_PLAY'],
    ['игроку с ролью капитана', { myRole: 'captain' }, 'CAPTAIN_CANNOT_PLAY'],
    ['пока в команде нет капитана', { teams: { blue: {}, red: { captain: 'u2' } } }, 'CAPTAINS_REQUIRED'],
    ['без выбранной команды', { myTeam: null }, 'NO_TEAM'],
    ['наблюдателю', { myTeam: 'spectator' }, 'NO_TEAM'],
    ['в чужой ход', { currentTeam: 'red' }, 'NOT_YOUR_TURN'],
    ['до шифровки капитана', { currentHint: null }, 'WAITING_FOR_HINT'],
  ])('запрещает %s', (_, overrides, code) => {
    expect(check(overrides).code).toBe(code);
  });

  it('без продвинутого режима пропускает проверки обычного режима', () => {
    expect(check({ advancedMode: false, myTeam: null, currentHint: null })).toBeNull();
  });

  it('без продвинутого режима всё равно требует авторизацию', () => {
    expect(check({ advancedMode: false, isAuthenticated: false }).code).toBe('NOT_AUTHENTICATED');
  });
});
