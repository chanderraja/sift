// SPDX-License-Identifier: MIT

import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useAuthStore, useFiltersStore, useSelectionStore } from '../../app/stores';
import type { Hotspot, ProjectKey, RuleKey } from '../../types/sonar';

import { HotspotsTable } from './HotspotsTable';

const HOTSPOT = (overrides: Partial<Hotspot> = {}): Hotspot => ({
  key: 'AYz1hotspot',
  component: 'acme_widget:src/auth.ts',
  project: 'acme_widget' as ProjectKey,
  securityCategory: 'auth',
  vulnerabilityProbability: 'HIGH',
  status: 'TO_REVIEW',
  line: 42,
  message: 'Hardcoded credentials detected.',
  creationDate: new Date(Date.now() - 5 * 86_400_000).toISOString(),
  updateDate: new Date().toISOString(),
  ruleKey: 'javasecurity:S2068' as RuleKey,
  ...overrides,
});

const resetStores = (): void => {
  useFiltersStore.setState({ sort: [], page: 1 });
  useAuthStore.getState().clear();
  useSelectionStore.getState().reset();
};

beforeEach(() => {
  useAuthStore.setState({ token: 'squ_ok', validation: 'valid', region: 'eu' });
  useSelectionStore.setState({
    organizationKey: null,
    projectKey: 'acme_widget' as ProjectKey,
    branchName: 'main',
  });
});
afterEach(resetStores);

describe('HotspotsTable — SonarCloud link column', () => {
  it('renders a SonarCloud link for each row', () => {
    render(<HotspotsTable items={[HOTSPOT({ key: 'AYz1hotspot' })]} />);
    const link = screen.getByRole('link', { name: /open in sonarcloud/i });
    expect(link).toHaveAttribute(
      'href',
      'https://sonarcloud.io/project/security_hotspots?id=acme_widget&hotspots=AYz1hotspot&branch=main',
    );
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noreferrer');
  });

  it('uses sonarqube.us host for US region', () => {
    useAuthStore.setState({ region: 'us' });
    render(<HotspotsTable items={[HOTSPOT()]} />);
    const link = screen.getByRole('link', { name: /open in sonarcloud/i });
    expect(link).toHaveAttribute('href', expect.stringContaining('sonarqube.us'));
  });
});
