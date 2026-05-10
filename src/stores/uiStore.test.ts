// SPDX-License-Identifier: MIT

import { describe, expect, it } from 'vitest';

import { createUiStore } from './uiStore';

describe('uiStore', () => {
  it('starts with both overlays closed', () => {
    const s = createUiStore().getState();
    expect(s.settingsOpen).toBe(false);
    expect(s.exportOpen).toBe(false);
  });

  it('setSettingsOpen toggles only the settings flag', () => {
    const store = createUiStore();
    store.getState().setSettingsOpen(true);
    expect(store.getState().settingsOpen).toBe(true);
    expect(store.getState().exportOpen).toBe(false);
  });

  it('setExportOpen toggles only the export flag', () => {
    const store = createUiStore();
    store.getState().setExportOpen(true);
    expect(store.getState().settingsOpen).toBe(false);
    expect(store.getState().exportOpen).toBe(true);
  });

  it('closeAll closes both', () => {
    const store = createUiStore();
    store.getState().setSettingsOpen(true);
    store.getState().setExportOpen(true);
    store.getState().closeAll();
    expect(store.getState().settingsOpen).toBe(false);
    expect(store.getState().exportOpen).toBe(false);
  });
});
