// SPDX-License-Identifier: MIT

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  useAuthStore,
  useFiltersStore,
  usePrefsStore,
  useSelectionStore,
  useUiStore,
} from '../../app/stores';

import { SettingsDrawer } from './SettingsDrawer';

const openDrawer = (): void => {
  useUiStore.setState({ settingsOpen: true });
};

const reset = (): void => {
  useUiStore.setState({ settingsOpen: false });
  usePrefsStore.getState().reset();
};

beforeEach(reset);
afterEach(reset);

describe('SettingsDrawer', () => {
  it('renders nothing when settingsOpen is false', () => {
    render(<SettingsDrawer />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders the drawer when settingsOpen is true', () => {
    openDrawer();
    render(<SettingsDrawer />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument();
  });

  it('shows theme radio group with system/light/dark options', () => {
    openDrawer();
    render(<SettingsDrawer />);
    expect(screen.getByRole('radio', { name: /system/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /light/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /dark/i })).toBeInTheDocument();
  });

  it('reflects current prefsStore.theme as the selected radio', () => {
    usePrefsStore.getState().setTheme('light');
    openDrawer();
    render(<SettingsDrawer />);
    expect(screen.getByRole('radio', { name: /light/i })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: /dark/i })).toHaveAttribute('aria-checked', 'false');
  });

  it('clicking a theme radio updates prefsStore.theme', async () => {
    usePrefsStore.getState().setTheme('system');
    openDrawer();
    render(<SettingsDrawer />);
    await userEvent.click(screen.getByRole('radio', { name: /dark/i }));
    expect(usePrefsStore.getState().theme).toBe('dark');
  });

  it('shows storage mode options', () => {
    openDrawer();
    render(<SettingsDrawer />);
    expect(screen.getByRole('radio', { name: /local storage/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /session storage/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /memory/i })).toBeInTheDocument();
  });

  it('clicking a storage mode radio updates authStore.storageMode', async () => {
    openDrawer();
    render(<SettingsDrawer />);
    await userEvent.click(screen.getByRole('radio', { name: /session storage/i }));
    expect(useAuthStore.getState().storageMode).toBe('session');
    // restore
    useAuthStore.getState().setStorageMode('local');
  });

  it('shows a "Forget everything" button', () => {
    openDrawer();
    render(<SettingsDrawer />);
    expect(screen.getByRole('button', { name: /forget everything/i })).toBeInTheDocument();
  });

  it('Forget everything resets all stores', async () => {
    usePrefsStore.getState().setTheme('dark');
    openDrawer();
    render(<SettingsDrawer />);
    await userEvent.click(screen.getByRole('button', { name: /forget everything/i }));
    expect(usePrefsStore.getState().theme).toBe('system');
    expect(useSelectionStore.getState().projectKey).toBeNull();
    expect(useFiltersStore.getState().page).toBe(1);
  });

  it('Escape closes the drawer', async () => {
    openDrawer();
    render(<SettingsDrawer />);
    await userEvent.keyboard('{Escape}');
    expect(useUiStore.getState().settingsOpen).toBe(false);
  });
});
