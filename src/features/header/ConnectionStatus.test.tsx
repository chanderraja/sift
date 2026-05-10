// SPDX-License-Identifier: MIT

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useAuthStore } from '../../app/stores';
import type { ValidationState } from '../../stores/authStore';

import { ConnectionStatus } from './ConnectionStatus';

const TRANSITIONS: readonly (readonly [ValidationState, string])[] = [
  ['idle', 'Awaiting token'],
  ['pending', 'Validating'],
  ['valid', 'Connected'],
  ['invalid', 'Invalid token'],
];

describe('ConnectionStatus', () => {
  it.each(TRANSITIONS)('renders %s state with the right label', (state, expected) => {
    useAuthStore.setState({ validation: state });
    render(<ConnectionStatus />);
    expect(screen.getByRole('status')).toHaveTextContent(expected);
  });

  it('exposes the state via data-state for styling/tests', () => {
    useAuthStore.setState({ validation: 'valid' });
    render(<ConnectionStatus />);
    expect(screen.getByRole('status')).toHaveAttribute('data-state', 'valid');
  });

  it('uses aria-live="polite" so transitions are announced', () => {
    useAuthStore.setState({ validation: 'valid' });
    render(<ConnectionStatus />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
  });
});
