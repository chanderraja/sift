// SPDX-License-Identifier: MIT

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { useAuthStore } from '../../app/stores';

import { RegionSelector } from './RegionSelector';

const reset = (): void => {
  useAuthStore.setState({ region: 'eu', validation: 'idle' });
};

describe('RegionSelector', () => {
  it('renders the current region from the auth store', () => {
    reset();
    render(<RegionSelector />);
    expect(screen.getByRole('combobox', { name: 'Region' })).toBeInTheDocument();
    expect(screen.getByText('EU')).toBeInTheDocument();
  });

  it('reflects a region change in the store', async () => {
    reset();
    render(<RegionSelector />);
    await userEvent.click(screen.getByRole('combobox', { name: 'Region' }));
    await userEvent.click(await screen.findByRole('option', { name: 'US' }));
    expect(useAuthStore.getState().region).toBe('us');
  });

  it('resets validation when the region changes (auth-store invariant)', async () => {
    reset();
    useAuthStore.setState({ validation: 'valid' });
    render(<RegionSelector />);
    await userEvent.click(screen.getByRole('combobox', { name: 'Region' }));
    await userEvent.click(await screen.findByRole('option', { name: 'US' }));
    expect(useAuthStore.getState().validation).toBe('idle');
  });
});
