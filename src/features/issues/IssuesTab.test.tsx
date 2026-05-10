// SPDX-License-Identifier: MIT

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { server } from '../../../tests/msw';
import { useAuthStore, useFiltersStore, useSelectionStore } from '../../app/stores';
import type { ProjectKey } from '../../types/sonar';

import { IssuesTab } from './IssuesTab';

const wrap = (children: ReactNode): React.JSX.Element => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

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

describe('IssuesTab — scaffold', () => {
  it('renders the two-column layout with sidebar + results slots', () => {
    render(wrap(<IssuesTab />));
    expect(screen.getByTestId('issues-tab')).toBeInTheDocument();
    expect(screen.getByTestId('issues-filter-sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('issues-results')).toBeInTheDocument();
  });

  it('uses a sidebar landmark for the filter column', () => {
    render(wrap(<IssuesTab />));
    expect(screen.getByRole('complementary', { name: 'Issue filters' })).toBeInTheDocument();
  });

  it('has zero axe violations', async () => {
    const { container } = render(wrap(<IssuesTab />));
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('IssuesTab — data states', () => {
  it('shows a loading skeleton while the issues query is pending', () => {
    render(wrap(<IssuesTab />));
    expect(screen.getByTestId('issues-loading')).toBeInTheDocument();
  });

  it('renders the count badge with the upstream total once the query resolves', async () => {
    render(wrap(<IssuesTab />));
    // MSW default fixture: 115 issues.
    expect(await screen.findByText(/of 115 issues/)).toBeInTheDocument();
    expect(screen.queryByTestId('issues-loading')).not.toBeInTheDocument();
  });

  it('renders the empty state when the page has zero rows', async () => {
    server.use(
      http.get('/api/sonar/v1/issues/search', () =>
        HttpResponse.json({
          total: 0,
          paging: { pageIndex: 1, pageSize: 100, total: 0 },
          issues: [],
        }),
      ),
    );
    render(wrap(<IssuesTab />));
    expect(await screen.findByText(/No issues match/i)).toBeInTheDocument();
  });

  it('shows the over-cap banner when paging.total exceeds 10,000', async () => {
    server.use(
      http.get('/api/sonar/v1/issues/search', () =>
        HttpResponse.json({
          total: 14_237,
          paging: { pageIndex: 1, pageSize: 100, total: 14_237 },
          issues: [],
        }),
      ),
    );
    render(wrap(<IssuesTab />));
    expect(await screen.findByTestId('issues-over-cap-banner')).toBeInTheDocument();
    expect(screen.getByText(/14,237/)).toBeInTheDocument();
    // The normal results table does not render in over-cap state.
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('skips the query and shows a placeholder when no project is selected', () => {
    useSelectionStore.getState().reset();
    render(wrap(<IssuesTab />));
    // Loading shouldn't fire — the tab waits for a selection.
    expect(screen.queryByTestId('issues-loading')).not.toBeInTheDocument();
  });
});
