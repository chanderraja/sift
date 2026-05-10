// SPDX-License-Identifier: MIT

// Shared test scaffolding for the picker tests (Org / Project /
// Branch / useEnsureSelectionLive). Each picker test was redeclaring
// the same QueryClientProvider wrapper, the same store-reset helper,
// and the same trio of MSW stub builders — SonarCloud flagged the
// duplication at ~12% per file. Centralising here cuts the per-test
// file boilerplate while keeping each test's intent inline.

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HttpResponse, http } from 'msw';
import type { ReactNode } from 'react';

import { server } from '../../../tests/msw';
import { useAuthStore, useSelectionStore } from '../../app/stores';

/**
 * Wrap a node in a fresh QueryClientProvider. A fresh client per
 * render keeps query-cache state from bleeding across tests.
 */
export const wrap = (children: ReactNode): React.JSX.Element => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

/**
 * Reset the auth + selection stores to a 'token connected, nothing
 * selected' baseline. Tests that want an unaccepted-token starting
 * state should call this and then `useAuthStore.setState({
 * validation: 'idle' })`.
 */
export const resetStores = (): void => {
  useAuthStore.setState({ token: 'squ_test', region: 'eu', validation: 'valid' });
  useSelectionStore.getState().reset();
};

/** Override the MSW /organizations/search handler. */
export const stubOrgs = (orgs: { key: string; name: string }[]): void => {
  server.use(
    http.get('/api/sonar/v1/organizations/search', () =>
      HttpResponse.json({
        paging: { pageIndex: 1, pageSize: 50, total: orgs.length },
        organizations: orgs.map((o) => ({ ...o, subscription: 'FREE' })),
      }),
    ),
  );
};

/** Override the MSW /projects/search handler. */
export const stubProjects = (projects: { key: string; name: string }[]): void => {
  server.use(
    http.get('/api/sonar/v1/projects/search', () =>
      HttpResponse.json({
        paging: { pageIndex: 1, pageSize: 500, total: projects.length },
        components: projects.map((p) => ({
          ...p,
          organization: 'acme',
          qualifier: 'TRK',
          visibility: 'public',
        })),
      }),
    ),
  );
};

/** Override the MSW /project_branches/list handler. */
export const stubBranches = (
  branches: {
    name: string;
    isMain?: boolean;
    type?: 'LONG' | 'SHORT' | 'PULL_REQUEST';
  }[],
): void => {
  server.use(
    http.get('/api/sonar/v1/project_branches/list', () =>
      HttpResponse.json({
        branches: branches.map((b) => ({
          name: b.name,
          isMain: b.isMain ?? false,
          type: b.type ?? 'LONG',
        })),
      }),
    ),
  );
};
