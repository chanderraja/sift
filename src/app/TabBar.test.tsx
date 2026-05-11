// SPDX-License-Identifier: MIT

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useFiltersStore } from './stores';
import { TabBar } from './TabBar';

const reset = (): void => useFiltersStore.getState().reset();

beforeEach(reset);
afterEach(reset);

describe('TabBar', () => {
  it('renders the three documented tabs', () => {
    render(<TabBar />);
    expect(screen.getByRole('tab', { name: 'Issues' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Hotspots' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Quality gate' })).toBeInTheDocument();
  });

  it('marks the current tab as selected from filtersStore.tab', () => {
    useFiltersStore.setState({ tab: 'hotspots' });
    render(<TabBar />);
    expect(screen.getByRole('tab', { name: 'Hotspots' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Issues' })).toHaveAttribute('aria-selected', 'false');
  });

  it('clicking a tab writes filtersStore.tab', async () => {
    render(<TabBar />);
    await userEvent.click(screen.getByRole('tab', { name: 'Quality gate' }));
    expect(useFiltersStore.getState().tab).toBe('quality-gate');
  });
});
