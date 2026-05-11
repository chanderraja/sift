// SPDX-License-Identifier: MIT

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { server } from '../../../tests/msw';
import { useAuthStore, useFiltersStore, useSelectionStore } from '../../app/stores';
import type { ProjectKey } from '../../types/sonar';

import { HotspotsTab } from './HotspotsTab';

const wrap = (children: ReactNode): React.JSX.Element => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

const HOTSPOT = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  key: 'AYz1',
  component: 'acme_widget-service:src/auth.ts',
  project: 'acme_widget-service',
  securityCategory: 'auth',
  vulnerabilityProbability: 'HIGH',
  status: 'TO_REVIEW',
  line: 42,
  message: 'Hardcoded credentials detected.',
  creationDate: new Date(Date.now() - 5 * 86_400_000).toISOString(),
  updateDate: new Date().toISOString(),
  ruleKey: 'javasecurity:S2068',
  ...overrides,
});

const seedSession = (): void => {
  useAuthStore.setState({ token: 'squ_ok', validation: 'valid', region: 'eu' });
  useSelectionStore.setState({
    organizationKey: null,
    projectKey: 'acme_widget-service' as ProjectKey,
    branchName: 'main',
  });
  useFiltersStore.getState().reset();
};

const reset = (): void => {
  useAuthStore.getState().clear();
  useSelectionStore.getState().reset();
  useFiltersStore.getState().reset();
};

beforeEach(seedSession);
afterEach(reset);

describe('HotspotsTab', () => {
  it('renders the two-column scaffold', () => {
    render(wrap(<HotspotsTab />));
    expect(screen.getByTestId('hotspots-tab')).toBeInTheDocument();
    expect(screen.getByTestId('hotspots-filter-sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('hotspots-results')).toBeInTheDocument();
  });

  it('shows a loading skeleton while pending', () => {
    render(wrap(<HotspotsTab />));
    expect(screen.getByTestId('hotspots-loading')).toBeInTheDocument();
  });

  it('renders an empty state when there are no hotspots', async () => {
    // Default MSW fixture has zero hotspots.
    render(wrap(<HotspotsTab />));
    expect(await screen.findByText(/No security hotspots match/i)).toBeInTheDocument();
  });

  it('renders rows with the documented columns when the query resolves', async () => {
    server.use(
      http.get('/api/sonar/v1/hotspots/search', () =>
        HttpResponse.json({
          paging: { pageIndex: 1, pageSize: 100, total: 1 },
          hotspots: [HOTSPOT()],
          components: [],
        }),
      ),
    );
    render(wrap(<HotspotsTab />));
    expect(await screen.findByText('Hardcoded credentials detected.')).toBeInTheDocument();
    expect(screen.getByText('HIGH')).toBeInTheDocument();
    expect(screen.getByText('TO_REVIEW')).toBeInTheDocument();
    expect(screen.getByText('auth')).toBeInTheDocument();
  });

  it('shows the result count badge with hotspot noun when rows are present', async () => {
    server.use(
      http.get('/api/sonar/v1/hotspots/search', () =>
        HttpResponse.json({
          paging: { pageIndex: 1, pageSize: 100, total: 1 },
          hotspots: [HOTSPOT()],
          components: [],
        }),
      ),
    );
    render(wrap(<HotspotsTab />));
    expect(await screen.findByText('1 hotspot')).toBeInTheDocument();
  });

  it('renders the forbidden error state when the proxy returns 403', async () => {
    server.use(
      http.get('/api/sonar/v1/hotspots/search', () =>
        HttpResponse.json({ errors: [{ msg: 'Browse permission required.' }] }, { status: 403 }),
      ),
    );
    render(wrap(<HotspotsTab />));
    expect(await screen.findByText('Access denied')).toBeInTheDocument();
  });
});
