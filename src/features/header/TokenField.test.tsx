// SPDX-License-Identifier: MIT

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useAuthStore } from '../../app/stores';

import { TokenField } from './TokenField';

const resetAuth = (): void => {
  useAuthStore.getState().clear();
  useAuthStore.setState({ region: 'eu', validation: 'idle' });
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('TokenField', () => {
  it('renders an empty password input on cold start', () => {
    resetAuth();
    render(<TokenField />);
    const input = screen.getByLabelText('SonarCloud token');
    expect(input).toHaveAttribute('type', 'password');
    expect(input).toHaveValue('');
  });

  it('writes the cleaned token into the auth store on input', async () => {
    resetAuth();
    render(<TokenField />);
    await userEvent.type(screen.getByLabelText('SonarCloud token'), 'squ_abc');
    expect(useAuthStore.getState().token).toBe('squ_abc');
  });

  it('displays a singular live message when one invisible char is stripped', async () => {
    resetAuth();
    render(<TokenField />);
    await userEvent.click(screen.getByLabelText('SonarCloud token'));
    // Paste a token with one zero-width space embedded.
    await userEvent.paste('abc​def');
    expect(useAuthStore.getState().token).toBe('abcdef');
    expect(screen.getByText(/1 invisible character/)).toBeInTheDocument();
  });

  it('uses the plural form when multiple invisible chars are stripped', async () => {
    resetAuth();
    render(<TokenField />);
    await userEvent.click(screen.getByLabelText('SonarCloud token'));
    // NBSP + zero-width space + BOM = three.
    await userEvent.paste('a b​c﻿d');
    expect(useAuthStore.getState().token).toBe('abcd');
    expect(screen.getByText(/3 invisible characters/)).toBeInTheDocument();
  });

  it('drops the warning when a clean token is then re-entered', async () => {
    resetAuth();
    render(<TokenField />);
    await userEvent.click(screen.getByLabelText('SonarCloud token'));
    await userEvent.paste('a​b');
    expect(screen.getByText(/1 invisible character/)).toBeInTheDocument();

    // Clear and retype clean.
    await userEvent.clear(screen.getByLabelText('SonarCloud token'));
    await userEvent.type(screen.getByLabelText('SonarCloud token'), 'clean');
    expect(screen.queryByText(/invisible character/)).not.toBeInTheDocument();
  });

  it('auto-focuses the input on cold start', () => {
    resetAuth();
    render(<TokenField />);
    expect(screen.getByLabelText('SonarCloud token')).toHaveFocus();
  });

  it('does not auto-focus when a token was restored from storage', () => {
    resetAuth();
    useAuthStore.setState({ token: 'squ_existing' });
    // Anchor focus somewhere else so the test catches a stolen focus.
    document.body.focus();
    render(<TokenField />);
    expect(screen.getByLabelText('SonarCloud token')).not.toHaveFocus();
  });

  it('paste-from-clipboard button reads, sanitizes, and writes', async () => {
    resetAuth();
    vi.stubGlobal('navigator', {
      clipboard: { readText: vi.fn().mockResolvedValue('squ_clip​board') },
    });
    render(<TokenField />);
    await userEvent.click(screen.getByRole('button', { name: 'Paste token from clipboard' }));
    await waitFor(() => {
      expect(useAuthStore.getState().token).toBe('squ_clipboard');
    });
    expect(screen.getByText(/1 invisible character/)).toBeInTheDocument();
  });

  it('shows a friendly hint when clipboard read is denied', async () => {
    resetAuth();
    vi.stubGlobal('navigator', {
      clipboard: { readText: vi.fn().mockRejectedValue(new Error('denied')) },
    });
    render(<TokenField />);
    await userEvent.click(screen.getByRole('button', { name: 'Paste token from clipboard' }));
    await waitFor(() => {
      expect(screen.getByText(/Couldn't read clipboard/)).toBeInTheDocument();
    });
    expect(useAuthStore.getState().token).toBe('');
  });

  it('shows the same hint when the Clipboard API is unavailable', async () => {
    resetAuth();
    vi.stubGlobal('navigator', {});
    render(<TokenField />);
    await userEvent.click(screen.getByRole('button', { name: 'Paste token from clipboard' }));
    expect(screen.getByText(/Couldn't read clipboard/)).toBeInTheDocument();
  });
});
