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

  it('clicking settings opens the drawer', async () => {
    reset();
    render(<HeaderActions />);
    expect(useUiStore.getState().settingsOpen).toBe(false);
    await userEvent.click(screen.getByRole('button', { name: 'Open settings' }));
    expect(useUiStore.getState().settingsOpen).toBe(true);
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument();
  });

  it('clicking export opens the modal', async () => {
    reset();
    render(<HeaderActions />);
    expect(useUiStore.getState().exportOpen).toBe(false);
    await userEvent.click(screen.getByRole('button', { name: 'Open export' }));
    expect(useUiStore.getState().exportOpen).toBe(true);
    expect(screen.getByRole('heading', { name: 'Export findings' })).toBeInTheDocument();
  });

  it('Escape closes the open drawer', async () => {
    reset();
    useUiStore.setState({ settingsOpen: true });
    render(<HeaderActions />);
    await userEvent.keyboard('{Escape}');
    expect(useUiStore.getState().settingsOpen).toBe(false);
  });
});
