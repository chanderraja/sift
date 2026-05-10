// SPDX-License-Identifier: MIT

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('renders heading', () => {
    render(<EmptyState heading="No findings" />);
    expect(screen.getByText('No findings')).toBeInTheDocument();
  });

  it('renders optional body and action', () => {
    render(
      <EmptyState
        heading="No findings"
        body="Paste a token to begin."
        action={<button type="button">Paste</button>}
      />,
    );
    expect(screen.getByText('Paste a token to begin.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Paste' })).toBeInTheDocument();
  });

  it('marks the icon aria-hidden', () => {
    render(<EmptyState icon={<svg data-testid="icon" />} heading="x" />);
    const wrapper = screen.getByTestId('icon').parentElement;
    expect(wrapper).toHaveAttribute('aria-hidden', 'true');
  });

  it('uses role=status so it is announced politely', () => {
    render(<EmptyState heading="x" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('has zero axe violations', async () => {
    const { container } = render(<EmptyState heading="No findings" body="…" />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
