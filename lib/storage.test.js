import { describe, it, expect, beforeEach } from 'vitest';
import { isAdminRole, saveSession, clearSession, getToken, getStoredUser } from './storage';

describe('isAdminRole', () => {
  it('returns true for admin and superadmin roles', () => {
    expect(isAdminRole('admin')).toBe(true);
    expect(isAdminRole('superadmin')).toBe(true);
  });

  it('returns false for non-admin roles', () => {
    expect(isAdminRole('booking')).toBe(false);
    expect(isAdminRole('user')).toBe(false);
    expect(isAdminRole(undefined)).toBe(false);
    expect(isAdminRole('')).toBe(false);
  });
});

describe('session storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('saves and retrieves a session', () => {
    saveSession('token-abc', { id: '1', role: 'admin' });

    expect(getToken()).toBe('token-abc');
    expect(getStoredUser()).toEqual({ id: '1', role: 'admin' });
  });

  it('clears a session', () => {
    saveSession('token-abc', { id: '1', role: 'admin' });
    clearSession();

    expect(getToken()).toBeNull();
    expect(getStoredUser()).toBeNull();
  });

  it('returns null for stored user when nothing saved', () => {
    expect(getStoredUser()).toBeNull();
  });

  it('returns null for malformed stored user JSON', () => {
    localStorage.setItem('bookify_admin_user', 'not-json');
    expect(getStoredUser()).toBeNull();
  });
});
