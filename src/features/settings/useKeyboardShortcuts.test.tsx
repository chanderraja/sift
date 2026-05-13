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

const makeDataRow = (): HTMLTableRowElement => {
  const tr = document.createElement('tr');
  tr.dataset.row = 'true';
  tr.tabIndex = 0;
  document.body.appendChild(tr);
  return tr;
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

describe('row navigation — j/k/Enter', () => {
  let rows: [HTMLTableRowElement, HTMLTableRowElement, HTMLTableRowElement];

  beforeEach(() => {
    rows = [makeDataRow(), makeDataRow(), makeDataRow()];
  });

  afterEach(() => {
    rows.forEach((tr) => tr.remove());
  });

  it('j focuses the first row when no row is focused', () => {
    renderHook(() => useKeyboardShortcuts());
    fireKey('j');
    expect(document.activeElement).toBe(rows[0]);
  });

  it('j advances focus to the next row', () => {
    renderHook(() => useKeyboardShortcuts());
    rows[0].focus();
    fireKey('j');
    expect(document.activeElement).toBe(rows[1]);
  });

  it('j stays on the last row when already at end', () => {
    renderHook(() => useKeyboardShortcuts());
    rows[2].focus();
    fireKey('j');
    expect(document.activeElement).toBe(rows[2]);
  });

  it('k moves focus to the previous row', () => {
    renderHook(() => useKeyboardShortcuts());
    rows[2].focus();
    fireKey('k');
    expect(document.activeElement).toBe(rows[1]);
  });

  it('k is a no-op when the first row is focused', () => {
    renderHook(() => useKeyboardShortcuts());
    rows[0].focus();
    fireKey('k');
    expect(document.activeElement).toBe(rows[0]);
  });

  it('k is a no-op when no row is focused', () => {
    renderHook(() => useKeyboardShortcuts());
    fireKey('k');
    expect(rows).not.toContain(document.activeElement);
  });

  it('Enter clicks the focused data-row element', () => {
    renderHook(() => useKeyboardShortcuts());
    let clicked = false;
    rows[1].addEventListener('click', () => {
      clicked = true;
    });
    rows[1].focus();
    fireKey('Enter');
    expect(clicked).toBe(true);
  });

  it('Enter is a no-op when no data-row is focused', () => {
    renderHook(() => useKeyboardShortcuts());
    let clicked = false;
    rows.forEach((r) =>
      r.addEventListener('click', () => {
        clicked = true;
      }),
    );
    fireKey('Enter');
    expect(clicked).toBe(false);
  });
});

describe('/ shortcut', () => {
  it('focuses the first input inside the filter sidebar', () => {
    renderHook(() => useKeyboardShortcuts());
    const sidebar = document.createElement('div');
    sidebar.dataset.testid = 'issues-filter-sidebar';
    const input = document.createElement('input');
    sidebar.appendChild(input);
    document.body.appendChild(sidebar);
    fireKey('/');
    expect(document.activeElement).toBe(input);
    sidebar.remove();
  });

  it('is a no-op when the sidebar has no inputs', () => {
    renderHook(() => useKeyboardShortcuts());
    const sidebar = document.createElement('div');
    sidebar.dataset.testid = 'issues-filter-sidebar';
    document.body.appendChild(sidebar);
    expect(() => fireKey('/')).not.toThrow();
    sidebar.remove();
  });
});
