// SPDX-License-Identifier: MIT

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { usePrefsStore } from '../../app/stores';

import { useTheme } from './useTheme';

const resetPrefs = (): void => {
  usePrefsStore.getState().reset();
};

beforeEach(resetPrefs);
afterEach(() => {
  resetPrefs();
  document.documentElement.removeAttribute('data-theme');
  vi.restoreAllMocks();
});

const mockMatchMedia = (prefersDark: boolean): void => {
  vi.spyOn(window, 'matchMedia').mockReturnValue({
    matches: prefersDark,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  } as unknown as MediaQueryList);
};

describe('useTheme', () => {
  it('applies data-theme="dark" when prefs.theme is dark', () => {
    usePrefsStore.getState().setTheme('dark');
    renderHook(() => useTheme());
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('applies data-theme="light" when prefs.theme is light', () => {
    usePrefsStore.getState().setTheme('light');
    renderHook(() => useTheme());
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('applies dark when system preference is dark and theme is system', () => {
    mockMatchMedia(true);
    usePrefsStore.getState().setTheme('system');
    renderHook(() => useTheme());
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('applies light when system preference is light and theme is system', () => {
    mockMatchMedia(false);
    usePrefsStore.getState().setTheme('system');
    renderHook(() => useTheme());
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('reacts to prefsStore.theme changes without remounting', () => {
    usePrefsStore.getState().setTheme('dark');
    renderHook(() => useTheme());
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    act(() => {
      usePrefsStore.getState().setTheme('light');
    });
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('registers a matchMedia listener when theme is system and removes it on cleanup', () => {
    const addListener = vi.fn();
    const removeListener = vi.fn();
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: false,
      addEventListener: addListener,
      removeEventListener: removeListener,
    } as unknown as MediaQueryList);
    usePrefsStore.getState().setTheme('system');
    const { unmount } = renderHook(() => useTheme());
    expect(addListener).toHaveBeenCalledWith('change', expect.any(Function));
    unmount();
    expect(removeListener).toHaveBeenCalledWith('change', expect.any(Function));
  });
});
