// SPDX-License-Identifier: MIT

import { render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as ToastModule from '../../components/primitives/Toast';
import { useSelectionStore } from '../../app/stores';
import type { OrgKey, ProjectKey } from '../../types/sonar';

import { resetStores, stubBranches, stubOrgs, stubProjects, wrap } from './test-helpers';
import { useEnsureSelectionLive } from './useEnsureSelectionLive';

const Mount = (): null => {
  useEnsureSelectionLive();
  return null;
};

beforeEach(resetStores);
afterEach(() => {
  resetStores();
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

    await waitFor(() => {
      expect(useSelectionStore.getState().branchName).toBe('main');
    });
    expect(useSelectionStore.getState().organizationKey).toBe('acme');
    expect(useSelectionStore.getState().projectKey).toBe('acme_widget');
    expect(warn).not.toHaveBeenCalled();
  });
});
