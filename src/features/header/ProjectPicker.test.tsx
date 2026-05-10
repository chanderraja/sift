// SPDX-License-Identifier: MIT

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { server } from '../../../tests/msw';
import { useAuthStore, useSelectionStore } from '../../app/stores';
import type { OrgKey, ProjectKey } from '../../types/sonar';

import { ProjectPicker } from './ProjectPicker';

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

const stubProjects = (projects: { key: string; name: string }[]): void => {
  server.use(
    http.get('/api/sonar/v1/projects/search', () =>
      HttpResponse.json({
        paging: { pageIndex: 1, pageSize: 500, total: projects.length },
        components: projects.map((p) => ({
          key: p.key,
          name: p.name,
          organization: 'acme',
          qualifier: 'TRK',
          visibility: 'public',
        })),
      }),
    ),
  );
};

describe('ProjectPicker', () => {
  it('renders a skeleton while no org is selected', () => {
    render(wrap(<ProjectPicker />));
    expect(screen.queryByRole('button', { name: 'Project' })).not.toBeInTheDocument();
  });

  it('lists projects once an org is selected', async () => {
    stubProjects([
      { key: 'acme_widget', name: 'widget-service' },
      { key: 'acme_other', name: 'other-service' },
    ]);
    useSelectionStore.setState({ organizationKey: 'acme' as OrgKey });
    render(wrap(<ProjectPicker />));

    await userEvent.click(await screen.findByRole('button', { name: 'Project' }));
    expect(await screen.findByRole('option', { name: 'widget-service' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'other-service' })).toBeInTheDocument();
  });

  it('selecting writes the project key to the store', async () => {
    stubProjects([
      { key: 'acme_widget', name: 'widget-service' },
      { key: 'acme_other', name: 'other-service' },
    ]);
    useSelectionStore.setState({ organizationKey: 'acme' as OrgKey });
    render(wrap(<ProjectPicker />));

    await userEvent.click(await screen.findByRole('button', { name: 'Project' }));
    await userEvent.click(await screen.findByRole('option', { name: 'other-service' }));
    expect(useSelectionStore.getState().projectKey).toBe('acme_other');
  });

  it('search filters the visible options client-side', async () => {
    stubProjects([
      { key: 'acme_alpha', name: 'alpha' },
      { key: 'acme_beta', name: 'beta' },
      { key: 'acme_gamma', name: 'gamma' },
    ]);
    useSelectionStore.setState({ organizationKey: 'acme' as OrgKey });
    render(wrap(<ProjectPicker />));

    await userEvent.click(await screen.findByRole('button', { name: 'Project' }));
    await userEvent.type(await screen.findByLabelText('Project search'), 'be');
    await waitFor(() => {
      const labels = screen.getAllByRole('option').map((o) => o.textContent);
      expect(labels).toEqual(['beta']);
    });
  });

  it('reflects the persisted project on the trigger', async () => {
    stubProjects([{ key: 'acme_widget', name: 'widget-service' }]);
    useSelectionStore.setState({
      organizationKey: 'acme' as OrgKey,
      projectKey: 'acme_widget' as ProjectKey,
    });
    render(wrap(<ProjectPicker />));
    expect(await screen.findByRole('button', { name: 'Project' })).toHaveTextContent(
      'widget-service',
    );
  });
});
