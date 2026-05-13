// SPDX-License-Identifier: MIT

import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { server } from '../../../tests/msw';
import { useAuthStore, useSelectionStore } from '../../app/stores';

import { OrgPicker } from './OrgPicker';
import { resetStores, stubOrgs, wrap } from './test-helpers';

beforeEach(resetStores);
afterEach(resetStores);

describe('OrgPicker', () => {
  it('renders a skeleton while validation is not yet valid', () => {
    useAuthStore.setState({ validation: 'idle' });
    render(wrap(<OrgPicker />));
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('lists orgs from the SonarClient response when validation is valid', async () => {
    stubOrgs([
      { key: 'acme', name: 'Acme Corp' },
      { key: 'other-corp', name: 'Other Corp' },
    ]);
    render(wrap(<OrgPicker />));

    await userEvent.click(await screen.findByRole('combobox', { name: 'Organization' }));
    expect(await screen.findByRole('option', { name: 'Acme Corp' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Other Corp' })).toBeInTheDocument();
  });

  it('auto-selects when the response carries exactly one org', async () => {
    stubOrgs([{ key: 'acme', name: 'Acme Corp' }]);
    render(wrap(<OrgPicker />));
    await waitFor(() => {
      expect(useSelectionStore.getState().organizationKey).toBe('acme');
    });
  });

  it('does not auto-select when the user has already chosen an org', async () => {
    stubOrgs([{ key: 'acme', name: 'Acme Corp' }]);
    useSelectionStore.setState({ organizationKey: 'other-corp' as never });
    render(wrap(<OrgPicker />));
    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: 'Organization' })).toBeInTheDocument();
    });
    expect(useSelectionStore.getState().organizationKey).toBe('other-corp');
  });

  it('does not query orgs before auth is valid, then loads them once valid', async () => {
    // Simulate production: proxy returns 401 until the user provides a valid token.
    // Without an `enabled` guard the premature query poisons the cache and orgs
    // never appear even after auth succeeds (staleTime keeps the 401 for 5 min).
    server.use(
      http.get('/api/sonar/v1/organizations/search', () => new HttpResponse(null, { status: 401 })),
    );
    useAuthStore.setState({ validation: 'idle' });
    render(wrap(<OrgPicker />));

    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();

    // Swap the stub to return real orgs before auth flips to valid.
    stubOrgs([{ key: 'acme', name: 'Acme Corp' }]);
    act(() => {
      useAuthStore.setState({ validation: 'valid' });
    });

    await waitFor(() => {
      expect(useSelectionStore.getState().organizationKey).toBe('acme');
    });
  });

  it('changing org via the picker writes selection store', async () => {
    stubOrgs([
      { key: 'acme', name: 'Acme Corp' },
      { key: 'other-corp', name: 'Other Corp' },
    ]);
    useSelectionStore.setState({ organizationKey: 'acme' as never });
    render(wrap(<OrgPicker />));

    await userEvent.click(await screen.findByRole('combobox', { name: 'Organization' }));
    await userEvent.click(await screen.findByRole('option', { name: 'Other Corp' }));
    expect(useSelectionStore.getState().organizationKey).toBe('other-corp');
  });
});
