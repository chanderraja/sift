// SPDX-License-Identifier: MIT

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, waitFor } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { server } from '../../../tests/msw';
import * as ToastModule from '../../components/primitives/Toast';
import { useAuthStore, useSelectionStore } from '../../app/stores';
import type { OrgKey, ProjectKey } from '../../types/sonar';

import { useEnsureSelectionLive } from './useEnsureSelectionLive';

const Mount = (): null => {
  useEnsureSelectionLive();
  return null;
};

const wrap = (children: ReactNode): React.JSX.Element => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

const reset = (): void => {
  useAuthStore.setState({ token: 'squ_test', region: 'eu', validation: 'valid' });
  useSelectionStore.getState().reset();
};

const stubOrgs = (orgs: { key: string; name: string }[]): void => {
  server.use(
    http.get('/api/sonar/v1/organizations/search', () =>
      HttpResponse.json({
        paging: { pageIndex: 1, pageSize: 50, total: orgs.length },
        organizations: orgs.map((o) => ({ ...o, subscription: 'FREE' })),
      }),
    ),
  );
};

const stubProjects = (projects: { key: string; name: string }[]): void => {
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

const stubBranches = (branches: { name: string; isMain?: boolean }[]): void => {
  server.use(
    http.get('/api/sonar/v1/project_branches/list', () =>
      HttpResponse.json({
        branches: branches.map((b) => ({
          name: b.name,
          isMain: b.isMain ?? false,
          type: 'LONG',
        })),
      }),
    ),
  );
};

beforeEach(reset);
afterEach(() => {
  reset();
  vi.restoreAllMocks();
});

describe('useEnsureSelectionLive', () => {
  it('clears org+project+branch and toasts when the persisted org is missing', async () => {
    const warn = vi.spyOn(ToastModule.toast, 'warn').mockImplementation(() => 0);
    stubOrgs([{ key: 'still-here', name: 'Still Here' }]);
    useSelectionStore.setState({
      organizationKey: 'gone' as OrgKey,
      projectKey: 'gone_proj' as ProjectKey,
      branchName: 'main',
    });

    render(wrap(<Mount />));

    await waitFor(() => {
      expect(useSelectionStore.getState().organizationKey).toBeNull();
    });
    expect(useSelectionStore.getState().projectKey).toBeNull();
    expect(useSelectionStore.getState().branchName).toBeNull();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('"gone"'));
  });

  it('clears project+branch and toasts when the persisted project is missing', async () => {
    const warn = vi.spyOn(ToastModule.toast, 'warn').mockImplementation(() => 0);
    stubOrgs([{ key: 'acme', name: 'Acme' }]);
    stubProjects([{ key: 'still-here', name: 'still-here' }]);
    useSelectionStore.setState({
      organizationKey: 'acme' as OrgKey,
      projectKey: 'gone_proj' as ProjectKey,
      branchName: 'main',
    });

    render(wrap(<Mount />));

    await waitFor(() => {
      expect(useSelectionStore.getState().projectKey).toBeNull();
    });
    expect(useSelectionStore.getState().organizationKey).toBe('acme');
    expect(useSelectionStore.getState().branchName).toBeNull();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('"gone_proj"'));
  });

  it('falls back to main when the persisted branch is missing but main exists', async () => {
    const warn = vi.spyOn(ToastModule.toast, 'warn').mockImplementation(() => 0);
    stubOrgs([{ key: 'acme', name: 'Acme' }]);
    stubProjects([{ key: 'acme_widget', name: 'widget' }]);
    stubBranches([{ name: 'main', isMain: true }, { name: 'feat/abc' }]);
    useSelectionStore.setState({
      organizationKey: 'acme' as OrgKey,
      projectKey: 'acme_widget' as ProjectKey,
      branchName: 'release/2024.q4',
    });

    render(wrap(<Mount />));

    await waitFor(() => {
      expect(useSelectionStore.getState().branchName).toBe('main');
    });
    expect(warn).toHaveBeenCalledWith(
      expect.stringMatching(/"release\/2024\.q4".*switched to "main"/),
    );
  });

  it('does nothing when every persisted key is present in the lists', async () => {
    const warn = vi.spyOn(ToastModule.toast, 'warn').mockImplementation(() => 0);
    stubOrgs([{ key: 'acme', name: 'Acme' }]);
    stubProjects([{ key: 'acme_widget', name: 'widget' }]);
    stubBranches([{ name: 'main', isMain: true }]);
    useSelectionStore.setState({
      organizationKey: 'acme' as OrgKey,
      projectKey: 'acme_widget' as ProjectKey,
      branchName: 'main',
    });

    render(wrap(<Mount />));

    // Wait long enough for all three queries to resolve.
    await waitFor(() => {
      expect(useSelectionStore.getState().branchName).toBe('main');
    });
    expect(useSelectionStore.getState().organizationKey).toBe('acme');
    expect(useSelectionStore.getState().projectKey).toBe('acme_widget');
    expect(warn).not.toHaveBeenCalled();
  });
});
