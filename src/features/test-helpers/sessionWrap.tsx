// SPDX-License-Identifier: MIT

// Shared scaffolding for feature tests that mount a component which
// reads from auth + selection + filters + filtersStore *and* runs a
// TanStack Query. Each tab's test file would otherwise re-implement
// the same `wrap()`, `seedSession()`, and `reset()` trio.

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { useAuthStore, useFiltersStore, useSelectionStore } from '../../app/stores';
import type { ProjectKey } from '../../types/sonar';

/** Wrap a component in a fresh QueryClient. */
export const wrap = (children: ReactNode): React.JSX.Element => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

/**
 * Put the four stores into the "valid auth + project + branch selected"
 * configuration the tab components expect. Filters always start fresh.
 */
export const seedSession = (
  overrides: { projectKey?: ProjectKey; branchName?: string } = {},
): void => {
  useAuthStore.setState({ token: 'squ_ok', validation: 'valid', region: 'eu' });
  useSelectionStore.setState({
    organizationKey: null,
    projectKey: (overrides.projectKey ?? 'acme_widget-service') as ProjectKey,
    branchName: overrides.branchName ?? 'main',
  });
  useFiltersStore.getState().reset();
};

/** Tear the stores back down between tests. */
export const resetSession = (): void => {
  useAuthStore.getState().clear();
  useSelectionStore.getState().reset();
  useFiltersStore.getState().reset();
};
