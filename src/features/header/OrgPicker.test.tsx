// SPDX-License-Identifier: MIT

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { server } from '../../../tests/msw';
import { useAuthStore, useSelectionStore } from '../../app/stores';

import { OrgPicker } from './OrgPicker';

const wrap = (children: ReactNode): React.JSX.Element => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

const reset = (): void => {
  useAuthStore.setState({ token: 'squ_test', region: 'eu', validation: 'idle' });
  useSelectionStore.getState().reset();
};

beforeEach(reset);
afterEach(reset);

const stubOrgs = (orgs: { key: string; name: string }[]): void => {
  server.use(
    http.get('/api/sonar/v1/organizations/search', () =>
      HttpResponse.json({
        paging: { pageIndex: 1, pageSize: 50, total: orgs.length },
        organizations: orgs.map((o) => ({
          key: o.key,
          name: o.name,
          subscription: 'FREE',
        })),
      }),
    ),
  );
};

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
    useAuthStore.setState({ validation: 'valid' });
    render(wrap(<OrgPicker />));

    const trigger = await screen.findByRole('combobox', { name: 'Organization' });
    await userEvent.click(trigger);
    expect(await screen.findByRole('option', { name: 'Acme Corp' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Other Corp' })).toBeInTheDocument();
  });

  it('auto-selects when the response carries exactly one org', async () => {
    stubOrgs([{ key: 'acme', name: 'Acme Corp' }]);
    useAuthStore.setState({ validation: 'valid' });
    render(wrap(<OrgPicker />));
    await waitFor(() => {
      expect(useSelectionStore.getState().organizationKey).toBe('acme');
    });
  });

  it('does not auto-select when the user has already chosen an org', async () => {
    stubOrgs([{ key: 'acme', name: 'Acme Corp' }]);
    useAuthStore.setState({ validation: 'valid' });
    useSelectionStore.setState({
      organizationKey: 'other-corp' as never,
    });
    render(wrap(<OrgPicker />));
    // Wait a beat — auto-select should NOT fire.
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
    useAuthStore.setState({ validation: 'valid' });
    useSelectionStore.setState({ organizationKey: 'acme' as never });
    render(wrap(<OrgPicker />));

    await userEvent.click(await screen.findByRole('combobox', { name: 'Organization' }));
    await userEvent.click(await screen.findByRole('option', { name: 'Other Corp' }));
    expect(useSelectionStore.getState().organizationKey).toBe('other-corp');
  });
});
