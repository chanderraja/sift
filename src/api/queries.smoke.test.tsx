// SPDX-License-Identifier: MIT

// Render-smoke for the queries.ts hooks. Mounting each hook in a
// QueryClientProvider drives the `useQuery(...)` line in each wrapper,
// covering the React surface that the option-factory tests in
// queries.test.ts can't reach. We don't assert on the data here — the
// `Result<T>` mapping is the SonarClient's contract, already tested in
// SonarClient.test.ts. These tests only prove the hooks compose with
// React Query and reach a settled state.

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import {
  useBranches,
  useHotspots,
  useIssues,
  useMeasures,
  useOrganizations,
  useProjects,
  useQualityGate,
} from './queries';
import { SonarClient } from './SonarClient';

const projectKey = 'acme_widget-service' as never;

const setup = (): {
  wrapper: ({ children }: { children: ReactNode }) => React.JSX.Element;
  client: SonarClient;
} => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const client = new SonarClient({ region: 'eu', getToken: () => 'tok' });
  const wrapper = ({ children }: { children: ReactNode }): React.JSX.Element => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { wrapper, client };
};

describe('queries hooks — render smoke', () => {
  it('useOrganizations mounts and settles', async () => {
    const { wrapper, client } = setup();
    const { result } = renderHook(() => useOrganizations(client), { wrapper });
    await waitFor(() => {
      expect(result.current.isFetched).toBe(true);
    });
  });

  it('useProjects mounts and settles', async () => {
    const { wrapper, client } = setup();
    const { result } = renderHook(() => useProjects(client, 'acme'), { wrapper });
    await waitFor(() => {
      expect(result.current.isFetched).toBe(true);
    });
  });

  it('useBranches mounts and settles', async () => {
    const { wrapper, client } = setup();
    const { result } = renderHook(() => useBranches(client, projectKey), { wrapper });
    await waitFor(() => {
      expect(result.current.isFetched).toBe(true);
    });
  });

  it('useIssues mounts and settles', async () => {
    const { wrapper, client } = setup();
    const { result } = renderHook(() => useIssues(client, {}), { wrapper });
    await waitFor(() => {
      expect(result.current.isFetched).toBe(true);
    });
  });

  it('useHotspots mounts and settles', async () => {
    const { wrapper, client } = setup();
    const { result } = renderHook(() => useHotspots(client, { projectKey }), { wrapper });
    await waitFor(() => {
      expect(result.current.isFetched).toBe(true);
    });
  });

  it('useQualityGate mounts and settles', async () => {
    const { wrapper, client } = setup();
    const { result } = renderHook(() => useQualityGate(client, projectKey, 'master'), {
      wrapper,
    });
    await waitFor(() => {
      expect(result.current.isFetched).toBe(true);
    });
  });

  it('useMeasures mounts and settles', async () => {
    const { wrapper, client } = setup();
    const { result } = renderHook(
      () => useMeasures(client, projectKey, 'master', ['ncloc', 'coverage']),
      { wrapper },
    );
    await waitFor(() => {
      expect(result.current.isFetched).toBe(true);
    });
  });
});
