// SPDX-License-Identifier: MIT

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { useAuthStore } from '../../app/stores';

import { TokenField } from './TokenField';

const resetAuth = (): void => {
  useAuthStore.getState().clear();
  // Reset region too in case a prior test mutated it.
  useAuthStore.setState({ region: 'eu', validation: 'idle' });
};

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
    await userEvent.paste('a b​c﻿d');
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
});
