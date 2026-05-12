// SPDX-License-Identifier: MIT

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { useUiStore } from '../../app/stores';

import { HeaderActions } from './HeaderActions';

const reset = (): void => {
  useUiStore.setState({ settingsOpen: false, exportOpen: false });
};

describe('HeaderActions', () => {
  it('renders settings and export buttons', () => {
    reset();
    render(<HeaderActions />);
    expect(screen.getByRole('button', { name: 'Open settings' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open export' })).toBeInTheDocument();
  });

  it('clicking settings sets settingsOpen to true', async () => {
    reset();
    render(<HeaderActions />);
    expect(useUiStore.getState().settingsOpen).toBe(false);
    await userEvent.click(screen.getByRole('button', { name: 'Open settings' }));
    expect(useUiStore.getState().settingsOpen).toBe(true);
    // SettingsDrawer is mounted in App.tsx, not here; HeaderActions only
    // owns the button and the uiStore flag.
  });

  it('clicking export sets exportOpen to true', async () => {
    reset();
    render(<HeaderActions />);
    expect(useUiStore.getState().exportOpen).toBe(false);
    await userEvent.click(screen.getByRole('button', { name: 'Open export' }));
    expect(useUiStore.getState().exportOpen).toBe(true);
    // ExportModal is mounted in App.tsx, not here.
  });
});
