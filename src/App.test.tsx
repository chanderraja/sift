// SPDX-License-Identifier: MIT

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import App from './App';
import { useAuthStore } from './app/stores';

const wrap = (children: ReactNode): React.JSX.Element => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

const reset = (): void => {
  useAuthStore.getState().clear();
  useAuthStore.setState({ token: '', region: 'eu', validation: 'idle' });
};

afterEach(reset);

describe('App content area', () => {
  it('shows the paste-a-token empty state on cold start', () => {
    reset();
    render(wrap(<App />));
    expect(screen.getByText(/Paste a token above/)).toBeInTheDocument();
  });

  it('shows the rejected empty state when validation is invalid', () => {
    reset();
    useAuthStore.setState({ token: 'squ_bad', validation: 'invalid' });
    render(wrap(<App />));
    expect(screen.getByText('Token rejected')).toBeInTheDocument();
  });

  it('shows the connected empty state when validation is valid', () => {
    reset();
    useAuthStore.setState({ token: 'squ_ok', validation: 'valid' });
    render(wrap(<App />));
    expect(screen.getByText('Token connected')).toBeInTheDocument();
  });

  it('renders the header in every state', () => {
    reset();
    render(wrap(<App />));
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });
});
