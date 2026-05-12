// SPDX-License-Identifier: MIT

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useUiStore } from '../../app/stores';

import { ShortcutsModal } from './ShortcutsModal';

const reset = (): void => {
  useUiStore.setState({ shortcutsOpen: false });
};

beforeEach(reset);
afterEach(reset);

describe('ShortcutsModal', () => {
  it('renders nothing when shortcutsOpen is false', () => {
    render(<ShortcutsModal />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders the modal when shortcutsOpen is true', () => {
    useUiStore.setState({ shortcutsOpen: true });
    render(<ShortcutsModal />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /keyboard shortcuts/i })).toBeInTheDocument();
  });

  it('lists the defined shortcuts', () => {
    useUiStore.setState({ shortcutsOpen: true });
    render(<ShortcutsModal />);
    expect(screen.getByText('?')).toBeInTheDocument();
    expect(screen.getByText('e')).toBeInTheDocument();
  });

  it('Escape closes the modal', async () => {
    useUiStore.setState({ shortcutsOpen: true });
    render(<ShortcutsModal />);
    await userEvent.keyboard('{Escape}');
    expect(useUiStore.getState().shortcutsOpen).toBe(false);
  });
});
