// SPDX-License-Identifier: MIT

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import KitchenSink from './KitchenSink';

describe('KitchenSink (dev-only spot-check page)', () => {
  it('renders without throwing and shows representative primitives', () => {
    render(<KitchenSink />);
    expect(screen.getByText('Sift kitchen sink')).toBeInTheDocument();
    // BLOCKER appears in both the severity-badge gallery and the table
    // row demo; getAllByText keeps the assertion honest.
    expect(screen.getAllByText('BLOCKER').length).toBeGreaterThan(0);
    expect(screen.getByText('Passing')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open modal' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open drawer' })).toBeInTheDocument();
  });
});
