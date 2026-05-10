// SPDX-License-Identifier: MIT

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useSelectionStore } from '../../app/stores';
import type { ProjectKey } from '../../types/sonar';

import { BranchPicker } from './BranchPicker';
import { resetStores, stubBranches, wrap } from './test-helpers';

beforeEach(resetStores);
afterEach(resetStores);

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
