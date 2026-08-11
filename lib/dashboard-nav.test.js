import { describe, it, expect } from 'vitest';
import { resolveDashboardMenu, getDashboardMenuHref, DASHBOARD_MENU_ITEMS } from './dashboard-nav';

describe('resolveDashboardMenu', () => {
  it('returns the menu key when valid', () => {
    expect(resolveDashboardMenu('rooms')).toBe('rooms');
  });

  it('falls back to overview for unknown keys', () => {
    expect(resolveDashboardMenu('not-a-menu')).toBe('overview');
    expect(resolveDashboardMenu(undefined)).toBe('overview');
    expect(resolveDashboardMenu('')).toBe('overview');
  });

  it('falls back to overview for the history key (it has its own route)', () => {
    expect(resolveDashboardMenu('history')).toBe('overview');
  });
});

describe('getDashboardMenuHref', () => {
  it('returns the href for a known menu key', () => {
    expect(getDashboardMenuHref('facilities')).toBe('/dashboard?menu=facilities');
  });

  it('falls back to the overview href for an unknown key', () => {
    expect(getDashboardMenuHref('nope')).toBe('/dashboard?menu=overview');
  });

  it('has a matching href for every declared menu item', () => {
    DASHBOARD_MENU_ITEMS.forEach((item) => {
      expect(getDashboardMenuHref(item.key)).toBe(item.href);
    });
  });
});
