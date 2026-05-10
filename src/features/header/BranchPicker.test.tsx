// SPDX-License-Identifier: MIT

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { server } from '../../../tests/msw';
import { useAuthStore, useSelectionStore } from '../../app/stores';
import type { ProjectKey } from '../../types/sonar';

import { BranchPicker } from './BranchPicker';

const wrap = (children: ReactNode): React.JSX.Element => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

const reset = (): void => {
  useAuthStore.setState({ token: 'squ_test', region: 'eu', validation: 'valid' });
  useSelectionStore.getState().reset();
};

beforeEach(reset);
afterEach(reset);

const stubBranches = (
  branches: { name: string; isMain?: boolean; type?: 'LONG' | 'SHORT' | 'PULL_REQUEST' }[],
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

describe('BranchPicker', () => {
  it('renders a skeleton while no project is selected', () => {
    render(wrap(<BranchPicker />));
    expect(screen.queryByRole('combobox', { name: 'Branch' })).not.toBeInTheDocument();
  });

  it('auto-defaults to the main branch on first appearance', async () => {
    stubBranches([
      { name: 'main', isMain: true },
      { name: 'release/2026.q2' },
      { name: 'feat/abc' },
    ]);
    useSelectionStore.setState({ projectKey: 'acme_widget' as ProjectKey });
    render(wrap(<BranchPicker />));
    await waitFor(() => {
      expect(useSelectionStore.getState().branchName).toBe('main');
    });
  });

  it('does not override a branch the user already chose', async () => {
    stubBranches([{ name: 'main', isMain: true }, { name: 'feat/abc' }]);
    useSelectionStore.setState({
      projectKey: 'acme_widget' as ProjectKey,
      branchName: 'feat/abc',
    });
    render(wrap(<BranchPicker />));
    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: 'Branch' })).toBeInTheDocument();
    });
    expect(useSelectionStore.getState().branchName).toBe('feat/abc');
  });

  it('marks the main branch with a (main) suffix in the listbox', async () => {
    stubBranches([{ name: 'main', isMain: true }, { name: 'feat/abc' }]);
    useSelectionStore.setState({ projectKey: 'acme_widget' as ProjectKey });
    render(wrap(<BranchPicker />));
    await userEvent.click(await screen.findByRole('combobox', { name: 'Branch' }));
    expect(await screen.findByRole('option', { name: /main \(main\)/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'feat/abc' })).toBeInTheDocument();
  });
});
