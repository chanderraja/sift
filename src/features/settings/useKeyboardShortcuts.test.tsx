// SPDX-License-Identifier: MIT

import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useUiStore } from '../../app/stores';

import { useKeyboardShortcuts } from './useKeyboardShortcuts';

const reset = (): void => {
  useUiStore.setState({ shortcutsOpen: false, exportOpen: false });
};

beforeEach(reset);
afterEach(reset);

const fireKey = (key: string, target: EventTarget = document): void => {
  target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
};

describe('useKeyboardShortcuts', () => {
  it('? opens the shortcuts modal', () => {
    renderHook(() => useKeyboardShortcuts());
    fireKey('?');
    expect(useUiStore.getState().shortcutsOpen).toBe(true);
  });

  it('e opens the export modal', () => {
    renderHook(() => useKeyboardShortcuts());
    fireKey('e');
    expect(useUiStore.getState().exportOpen).toBe(true);
  });

  it('does not fire when the event target is an input', () => {
    renderHook(() => useKeyboardShortcuts());
    const input = document.createElement('input');
    document.body.appendChild(input);
    fireKey('e', input);
    expect(useUiStore.getState().exportOpen).toBe(false);
    document.body.removeChild(input);
  });

  it('does not fire when the event target is a textarea', () => {
    renderHook(() => useKeyboardShortcuts());
    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    fireKey('?', textarea);
    expect(useUiStore.getState().shortcutsOpen).toBe(false);
    document.body.removeChild(textarea);
  });

  it('removes the listener on cleanup', () => {
    const { unmount } = renderHook(() => useKeyboardShortcuts());
    unmount();
    fireKey('?');
    expect(useUiStore.getState().shortcutsOpen).toBe(false);
  });
});
