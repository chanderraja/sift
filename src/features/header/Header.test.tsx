// SPDX-License-Identifier: MIT

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { Header } from './Header';

describe('Header — scaffold', () => {
  it('renders the app name', () => {
    render(<Header />);
    expect(screen.getByText('Sift')).toBeInTheDocument();
  });

  it.each([
    'header-region-slot',
    'header-token-slot',
    'header-org-slot',
    'header-project-slot',
    'header-branch-slot',
    'header-settings-slot',
    'header-export-slot',
  ])('exposes a slot for %s', (testid) => {
    render(<Header />);
    expect(screen.getByTestId(testid)).toBeInTheDocument();
  });

  it('uses a <header> landmark', () => {
    render(<Header />);
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });

  it('has zero axe violations', async () => {
    const { container } = render(<Header />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
