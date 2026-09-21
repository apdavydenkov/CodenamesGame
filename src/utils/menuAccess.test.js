import { describe, it, expect } from 'vitest';
import { menuAccess } from './menuAccess';

const guest = { isAuthenticated: false, userId: null, ownerId: null, canAccessGame: true };
const player = { isAuthenticated: true, userId: 'u1', ownerId: 'u2', canAccessGame: true };
const owner = { isAuthenticated: true, userId: 'u1', ownerId: 'u1', canAccessGame: true };

describe('menuAccess', () => {
  it('гость видит выбор места, но не настройки партии', () => {
    expect(menuAccess(guest)).toEqual({ isOwner: false, showSeats: true });
  });

  it('в бесхозной партии гость не владелец, хотя владельца нет', () => {
    expect(menuAccess({ ...guest, isAuthenticated: true, userId: 'u1' }).isOwner).toBe(false);
  });

  it('настройки партии видит только владелец', () => {
    expect(menuAccess(player).isOwner).toBe(false);
    expect(menuAccess(owner).isOwner).toBe(true);
  });

  it('при закрытом наборе места остаются владельцу и участникам команд', () => {
    expect(menuAccess({ ...owner, teamsLocked: true }).showSeats).toBe(true);
    expect(menuAccess({ ...player, teamsLocked: true, myTeam: 'red' }).showSeats).toBe(true);
    expect(menuAccess({ ...player, teamsLocked: true, myTeam: 'spectator' }).showSeats).toBe(false);
    expect(menuAccess({ ...guest, teamsLocked: true }).showSeats).toBe(false);
  });

  it('в закрытой приватной партии меню мест нет ни у кого, кроме владельца', () => {
    expect(menuAccess({ ...player, canAccessGame: false }).showSeats).toBe(false);
    expect(menuAccess({ ...owner, canAccessGame: false }).showSeats).toBe(false);
  });
});
