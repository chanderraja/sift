// SPDX-License-Identifier: MIT

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import App from './App';
import { useAuthStore, useFiltersStore, useSelectionStore } from './app/stores';
import type { ProjectKey } from './types/sonar';

const wrap = (children: ReactNode): React.JSX.Element => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

const reset = (): void => {
  useAuthStore.getState().clear();
  useAuthStore.setState({ token: '', region: 'eu', validation: 'idle' });
  useSelectionStore.getState().reset();
  useFiltersStore.getState().reset();
};

afterEach(reset);

describe('App tab area', () => {
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

  it('shows the pick-a-project prompt when valid but no project selected', () => {
    reset();
    useAuthStore.setState({ token: 'squ_ok', validation: 'valid' });
    render(wrap(<App />));
    expect(screen.getByText('Pick a project and branch')).toBeInTheDocument();
  });

  it('renders the IssuesTab when selection is complete and tab=issues', () => {
    reset();
    useAuthStore.setState({ token: 'squ_ok', validation: 'valid' });
    useSelectionStore.setState({
      projectKey: 'acme_widget' as ProjectKey,
      branchName: 'main',
    });
    render(wrap(<App />));
    expect(screen.getByTestId('issues-tab')).toBeInTheDocument();
  });

  it('switches to HotspotsTab when filtersStore.tab is "hotspots"', () => {
    reset();
    useAuthStore.setState({ token: 'squ_ok', validation: 'valid' });
    useSelectionStore.setState({
      projectKey: 'acme_widget' as ProjectKey,
      branchName: 'main',
    });
    useFiltersStore.setState({ tab: 'hotspots' });
    render(wrap(<App />));
    expect(screen.getByTestId('hotspots-tab')).toBeInTheDocument();
    expect(screen.queryByTestId('issues-tab')).not.toBeInTheDocument();
  });

  it('switches to QualityGateTab when filtersStore.tab is "quality-gate"', () => {
    reset();
    useAuthStore.setState({ token: 'squ_ok', validation: 'valid' });
    useSelectionStore.setState({
      projectKey: 'acme_widget' as ProjectKey,
      branchName: 'main',
    });
    useFiltersStore.setState({ tab: 'quality-gate' });
    render(wrap(<App />));
    expect(screen.getByTestId('quality-gate-tab')).toBeInTheDocument();
  });

  it('renders the TabBar when selection is complete', () => {
    reset();
    useAuthStore.setState({ token: 'squ_ok', validation: 'valid' });
    useSelectionStore.setState({
      projectKey: 'acme_widget' as ProjectKey,
      branchName: 'main',
    });
    render(wrap(<App />));
    expect(screen.getByRole('tab', { name: 'Issues' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Hotspots' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Quality gate' })).toBeInTheDocument();
  });

  it('renders the header in every state', () => {
    reset();
    render(wrap(<App />));
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });
});
