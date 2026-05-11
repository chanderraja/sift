// SPDX-License-Identifier: MIT

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ResultCountBadge } from './ResultCountBadge';

describe('ResultCountBadge', () => {
  it('renders the range and total for a single page', () => {
    render(<ResultCountBadge total={42} page={1} pageSize={100} />);
    expect(screen.getByText('1–42 of 42 issues')).toBeInTheDocument();
  });

  it('renders the range for a non-first page', () => {
    render(<ResultCountBadge total={250} page={2} pageSize={100} />);
    expect(screen.getByText('101–200 of 250 issues')).toBeInTheDocument();
  });

  it('clamps the end of the range to the total on the last page', () => {
    render(<ResultCountBadge total={142} page={2} pageSize={100} />);
    expect(screen.getByText('101–142 of 142 issues')).toBeInTheDocument();
  });

  it('renders the empty state when total is zero', () => {
    render(<ResultCountBadge total={0} page={1} pageSize={100} />);
    expect(screen.getByText('0 issues')).toBeInTheDocument();
  });

  it('renders singular noun when total is one', () => {
    render(<ResultCountBadge total={1} page={1} pageSize={100} />);
    expect(screen.getByText('1 issue')).toBeInTheDocument();
  });

  it('thousands separator on the total', () => {
    render(<ResultCountBadge total={9_876} page={1} pageSize={100} />);
    expect(screen.getByText(/of 9,876 issues/)).toBeInTheDocument();
  });

  it('renders a "10,000+" hint when capped is true', () => {
    render(<ResultCountBadge total={10_000} page={1} pageSize={100} capped />);
    expect(screen.getByText(/10,000\+/)).toBeInTheDocument();
  });
});
