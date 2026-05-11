// SPDX-License-Identifier: MIT

import { render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { server } from '../../../tests/msw';
import { useSelectionStore } from '../../app/stores';
import { resetSession, seedSession, wrap } from '../test-helpers/sessionWrap';

import { QualityGateTab } from './QualityGateTab';

beforeEach(() => {
  seedSession();
});
afterEach(resetSession);

describe('QualityGateTab', () => {
  it('renders the three section slots', async () => {
    render(wrap(<QualityGateTab />));
    await screen.findByTestId('qg-status-pill');
    expect(screen.getByTestId('quality-gate-tab')).toBeInTheDocument();
    expect(screen.getByTestId('qg-status-slot')).toBeInTheDocument();
    expect(screen.getByTestId('qg-conditions-slot')).toBeInTheDocument();
    expect(screen.getByTestId('qg-measures-slot')).toBeInTheDocument();
  });

  it('shows the status loading skeleton while pending', () => {
    render(wrap(<QualityGateTab />));
    expect(screen.getByTestId('qg-status-loading')).toBeInTheDocument();
  });

  it('renders the status pill with the OK fixture', async () => {
    render(wrap(<QualityGateTab />));
    const pill = await screen.findByTestId('qg-status-pill');
    expect(pill).toHaveAttribute('data-status', 'OK');
    expect(pill).toHaveTextContent('Passed');
  });

  it('renders an ERROR status when the gate is failed', async () => {
    server.use(
      http.get('/api/sonar/v1/qualitygates/project_status', () =>
        HttpResponse.json({ projectStatus: { status: 'ERROR', conditions: [] } }),
      ),
    );
    render(wrap(<QualityGateTab />));
    const pill = await screen.findByTestId('qg-status-pill');
    expect(pill).toHaveAttribute('data-status', 'ERROR');
    expect(pill).toHaveTextContent('Failed');
  });

  it('renders the forbidden error state on 403', async () => {
    server.use(
      http.get('/api/sonar/v1/qualitygates/project_status', () =>
        HttpResponse.json({ errors: [{ msg: 'Browse permission required.' }] }, { status: 403 }),
      ),
    );
    render(wrap(<QualityGateTab />));
    expect(await screen.findByText('Access denied')).toBeInTheDocument();
  });

  it('renders nothing when no project is selected', () => {
    useSelectionStore.getState().reset();
    render(wrap(<QualityGateTab />));
    expect(screen.getByTestId('quality-gate-tab')).toBeInTheDocument();
    expect(screen.queryByTestId('qg-status-pill')).not.toBeInTheDocument();
  });
});
