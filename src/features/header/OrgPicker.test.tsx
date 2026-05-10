// SPDX-License-Identifier: MIT

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

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
