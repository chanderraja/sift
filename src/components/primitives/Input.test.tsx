// SPDX-License-Identifier: MIT

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Search } from 'lucide-react';
import { createRef } from 'react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { Input } from './Input';

describe('Input', () => {
  it('renders as type="text" by default', () => {
    render(<Input aria-label="name" />);
    expect(screen.getByLabelText('name')).toHaveAttribute('type', 'text');
  });

  it.each(['text', 'password', 'search', 'number'] as const)('renders type=%s', (type) => {
    render(<Input type={type} aria-label="i" />);
    expect(screen.getByLabelText('i')).toHaveAttribute('type', type);
  });

  it('forwards ref', () => {
    const ref = createRef<HTMLInputElement>();
    render(<Input ref={ref} aria-label="x" />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it('merges caller className', () => {
    render(<Input className="extra" aria-label="x" />);
    expect(screen.getByLabelText('x').className).toContain('extra');
  });

  it('renders a placeholder', () => {
    render(<Input placeholder="Search projects…" aria-label="search" />);
    expect(screen.getByPlaceholderText('Search projects…')).toBeInTheDocument();
  });

  it('lets the user type', async () => {
    render(<Input aria-label="x" />);
    await userEvent.type(screen.getByLabelText('x'), 'hello');
    expect(screen.getByLabelText('x')).toHaveValue('hello');
  });

  it('renders a leading icon when supplied (search variant)', () => {
    render(<Input type="search" aria-label="search" leadingIcon={<Search data-testid="icon" />} />);
    expect(screen.getByTestId('icon')).toBeInTheDocument();
    expect(screen.getByLabelText('search')).toBeInTheDocument();
  });

  it('marks the icon aria-hidden so screen readers skip it', () => {
    render(<Input aria-label="search" leadingIcon={<Search data-testid="icon" />} />);
    // The wrapper span is aria-hidden — the icon itself is decorative.
    const wrapper = screen.getByTestId('icon').parentElement;
    expect(wrapper).toHaveAttribute('aria-hidden', 'true');
  });

  it('disabled prevents typing', async () => {
    render(<Input disabled aria-label="x" />);
    await userEvent.type(screen.getByLabelText('x'), 'hi');
    expect(screen.getByLabelText('x')).toHaveValue('');
  });

  it('has zero axe violations (plain)', async () => {
    const { container } = render(<Input aria-label="email" />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has zero axe violations (with leading icon)', async () => {
    const { container } = render(
      <Input type="search" aria-label="search" leadingIcon={<Search />} />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
