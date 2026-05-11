// SPDX-License-Identifier: MIT

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useFiltersStore } from '../../app/stores';
import type { ProjectKey } from '../../types/sonar';

import { HotspotsFilterSidebar } from './HotspotsFilterSidebar';

const projectKey = 'acme_widget-service' as ProjectKey;

const seedFilters = (): void => {
  useFiltersStore.getState().reset();
  // Seed hotspotsFilters so the sidebar's patches are accepted.
  useFiltersStore.getState().patchHotspots({ projectKey });
};

beforeEach(seedFilters);
afterEach(() => useFiltersStore.getState().reset());

describe('HotspotsFilterSidebar', () => {
  it('renders Status and Resolution groups', () => {
    render(<HotspotsFilterSidebar />);
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Resolution')).toBeInTheDocument();
  });

  it('renders the status options including Any', () => {
    render(<HotspotsFilterSidebar />);
    expect(screen.getAllByLabelText('Any').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByLabelText('TO REVIEW')).toBeInTheDocument();
    expect(screen.getByLabelText('REVIEWED')).toBeInTheDocument();
  });

  it('renders the resolution options including Any', () => {
    render(<HotspotsFilterSidebar />);
    expect(screen.getByLabelText('FIXED')).toBeInTheDocument();
    expect(screen.getByLabelText('SAFE')).toBeInTheDocument();
    expect(screen.getByLabelText('ACKNOWLEDGED')).toBeInTheDocument();
  });

  it('selecting a status writes filtersStore.hotspotsFilters.status', async () => {
    render(<HotspotsFilterSidebar />);
    await userEvent.click(screen.getByLabelText('TO REVIEW'));
    expect(useFiltersStore.getState().hotspotsFilters?.status).toBe('TO_REVIEW');
  });

  it('selecting Any in Status clears the status filter', async () => {
    useFiltersStore.getState().patchHotspots({ projectKey, status: 'REVIEWED' });
    render(<HotspotsFilterSidebar />);
    // The first "Any" radio is the Status group's.
    const [statusAny] = screen.getAllByLabelText('Any');
    if (!statusAny) throw new Error('expected an Any radio');
    await userEvent.click(statusAny);
    expect(useFiltersStore.getState().hotspotsFilters?.status).toBeUndefined();
  });

  it('selecting a resolution writes filtersStore.hotspotsFilters.resolution', async () => {
    render(<HotspotsFilterSidebar />);
    await userEvent.click(screen.getByLabelText('FIXED'));
    expect(useFiltersStore.getState().hotspotsFilters?.resolution).toBe('FIXED');
  });

  it('changing a filter resets page to 1', async () => {
    useFiltersStore.setState({ page: 4 });
    render(<HotspotsFilterSidebar />);
    await userEvent.click(screen.getByLabelText('REVIEWED'));
    expect(useFiltersStore.getState().page).toBe(1);
  });
});
