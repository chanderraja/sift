// SPDX-License-Identifier: MIT

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { Header } from './Header';

// Header now mounts the org picker (Phase 7), which in turn needs a
// QueryClient. Each test gets a fresh client so cache state doesn't
// bleed across.
const wrap = (children: ReactNode): React.JSX.Element => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

describe('Header — scaffold', () => {
  it('renders the app name', () => {
    render(wrap(<Header />));
    expect(screen.getByText('Sift')).toBeInTheDocument();
  });

  it.each([
    'header-region-slot',
    'header-token-slot',
    'header-org-slot',
    'header-project-slot',
    'header-branch-slot',
    'header-actions-slot',
  ])('exposes a slot for %s', (testid) => {
    render(wrap(<Header />));
    expect(screen.getByTestId(testid)).toBeInTheDocument();
  });

  it('uses a <header> landmark', () => {
    render(wrap(<Header />));
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });

  it('has zero axe violations', async () => {
    const { container } = render(wrap(<Header />));
    expect(await axe(container)).toHaveNoViolations();
  });
});
