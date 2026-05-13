// SPDX-License-Identifier: MIT

import { render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { server } from '../../../tests/msw';
import { useSelectionStore } from '../../app/stores';
import { resetSession, seedSession, wrap } from '../test-helpers/sessionWrap';

import { IssuesTab } from './IssuesTab';

beforeEach(() => {
  seedSession();
});
afterEach(resetSession);

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

  it('renders the forbidden error state when the proxy returns 403', async () => {
    server.use(
      http.get('/api/sonar/v1/issues/search', () =>
        HttpResponse.json({ errors: [{ msg: 'Browse permission required.' }] }, { status: 403 }),
      ),
    );
    render(wrap(<IssuesTab />));
    expect(await screen.findByText('Access denied')).toBeInTheDocument();
  });

  it('renders the rate-limited error state when upstream returns 429', async () => {
    server.use(
      http.get('/api/sonar/v1/issues/search', () =>
        HttpResponse.json({}, { status: 429, headers: { 'Retry-After': '15' } }),
      ),
    );
    render(wrap(<IssuesTab />));
    expect(await screen.findByText(/15s/)).toBeInTheDocument();
  });

  it('renders the server_error state when upstream returns 5xx', async () => {
    server.use(
      http.get('/api/sonar/v1/issues/search', () => HttpResponse.json({}, { status: 502 })),
    );
    render(wrap(<IssuesTab />));
    expect(await screen.findByText(/502/)).toBeInTheDocument();
  });

  it('renders the network_error state when the fetch throws', async () => {
    server.use(http.get('/api/sonar/v1/issues/search', () => HttpResponse.error()));
    render(wrap(<IssuesTab />));
    expect(await screen.findByText(/Network error/)).toBeInTheDocument();
  });

  it('shows server-side facet counts in the sidebar (not page-based counts)', async () => {
    // The API returns 2 CRITICAL on this page but 12 total — facets have the truth.
    server.use(
      http.get('/api/sonar/v1/issues/search', () =>
        HttpResponse.json({
          paging: { pageIndex: 1, pageSize: 100, total: 115 },
          issues: [
            {
              key: 'issue-1',
              rule: 'typescript:S1',
              severity: 'CRITICAL',
              type: 'CODE_SMELL',
              status: 'OPEN',
              resolution: null,
              component: 'proj:file.ts',
              project: 'my-project',
              message: 'Test issue',
              flows: [],
              tags: [],
              creationDate: '2024-01-01T00:00:00+0000',
              updateDate: '2024-01-01T00:00:00+0000',
            },
            {
              key: 'issue-2',
              rule: 'typescript:S2',
              severity: 'CRITICAL',
              type: 'CODE_SMELL',
              status: 'OPEN',
              resolution: null,
              component: 'proj:file.ts',
              project: 'my-project',
              message: 'Test issue 2',
              flows: [],
              tags: [],
              creationDate: '2024-01-01T00:00:00+0000',
              updateDate: '2024-01-01T00:00:00+0000',
            },
          ],
          facets: [
            {
              property: 'severities',
              values: [{ val: 'CRITICAL', count: 12 }],
            },
          ],
        }),
      ),
    );
    render(wrap(<IssuesTab />));
    // The sidebar should display 12 (from facets) not 2 (from page items).
    expect(await screen.findByText('12')).toBeInTheDocument();
  });

  it('skips the query and shows a placeholder when no project is selected', () => {
    useSelectionStore.getState().reset();
    render(wrap(<IssuesTab />));
    // Loading shouldn't fire — the tab waits for a selection.
    expect(screen.queryByTestId('issues-loading')).not.toBeInTheDocument();
  });
});
