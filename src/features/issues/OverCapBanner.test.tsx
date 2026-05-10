// SPDX-License-Identifier: MIT

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useFiltersStore } from '../../app/stores';

import { OverCapBanner } from './OverCapBanner';

const reset = (): void => useFiltersStore.getState().reset();

beforeEach(reset);
afterEach(reset);

describe('OverCapBanner', () => {
  it('renders the upstream total with a thousands separator', () => {
    render(<OverCapBanner total={14_237} />);
    expect(screen.getByText(/14,237/)).toBeInTheDocument();
  });

  it('mentions the 10,000 cap', () => {
    render(<OverCapBanner total={11_000} />);
    expect(screen.getByText(/10,000/)).toBeInTheDocument();
  });

  it('renders three narrowing chips', () => {
    render(<OverCapBanner total={12_000} />);
    expect(screen.getByRole('button', { name: /Severity ≥ Critical/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Unresolved only/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Created in last 90 days/ })).toBeInTheDocument();
  });

  it('clicking "Severity ≥ Critical" patches filtersStore', async () => {
    render(<OverCapBanner total={12_000} />);
    await userEvent.click(screen.getByRole('button', { name: /Severity ≥ Critical/ }));
    expect(useFiltersStore.getState().issuesFilters.severities).toEqual(['BLOCKER', 'CRITICAL']);
  });

  it('clicking "Unresolved only" patches filtersStore', async () => {
    render(<OverCapBanner total={12_000} />);
    await userEvent.click(screen.getByRole('button', { name: /Unresolved only/ }));
    expect(useFiltersStore.getState().issuesFilters.statuses).toEqual([
      'OPEN',
      'CONFIRMED',
      'REOPENED',
    ]);
  });

  it('clicking "Created in last 90 days" sets createdAfter', async () => {
    render(<OverCapBanner total={12_000} />);
    await userEvent.click(screen.getByRole('button', { name: /Created in last 90 days/ }));
    const createdAfter = useFiltersStore.getState().issuesFilters.createdAfter;
    expect(typeof createdAfter).toBe('string');
    // ISO date YYYY-MM-DD.
    expect(createdAfter).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('renders with the alert role for screen readers', () => {
    render(<OverCapBanner total={12_000} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});
