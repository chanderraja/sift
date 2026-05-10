// SPDX-License-Identifier: MIT

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';

import type { ButtonSize, ButtonVariant } from './Button';
import { Button } from './Button';

const VARIANTS: readonly ButtonVariant[] = ['primary', 'secondary', 'ghost', 'danger'];
const SIZES: readonly ButtonSize[] = ['sm', 'md'];

describe('Button', () => {
  it('renders with default props as a <button type="button">', () => {
    render(<Button>Click me</Button>);
    const btn = screen.getByRole('button', { name: 'Click me' });
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveAttribute('type', 'button');
  });

  it.each(VARIANTS)('renders the %s variant', (variant) => {
    render(<Button variant={variant}>label</Button>);
    expect(screen.getByRole('button', { name: 'label' })).toBeInTheDocument();
  });

  it.each(SIZES)('renders the %s size', (size) => {
    render(<Button size={size}>label</Button>);
    expect(screen.getByRole('button', { name: 'label' })).toBeInTheDocument();
  });

  it('forwards ref to the underlying <button>', () => {
    const ref = createRef<HTMLButtonElement>();
    render(<Button ref={ref}>label</Button>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  it('merges caller className with built-in classes', () => {
    render(<Button className="custom-extra">label</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toHaveClass('custom-extra');
    // Built-in token-driven class still applied:
    expect(btn.className).toContain('bg-accent');
  });

  it('honors a caller-supplied type', () => {
    render(<Button type="submit">go</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
  });

  it('renders disabled and dispatches no click', async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        nope
      </Button>,
    );
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    await userEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('activates on Enter and Space when focused', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>go</Button>);
    const btn = screen.getByRole('button');
    btn.focus();
    expect(btn).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard(' ');
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it('asChild renders the child as root and applies styles to it', () => {
    render(
      <Button asChild variant="secondary">
        <a href="/somewhere">link</a>
      </Button>,
    );
    const link = screen.getByRole('link', { name: 'link' });
    expect(link).toHaveAttribute('href', '/somewhere');
    expect(link.className).toContain('bg-bg-elevated');
    // No `type` attribute when the root isn't a <button>.
    expect(link).not.toHaveAttribute('type');
  });

  it.each(VARIANTS)('has zero axe violations (%s variant)', async (variant) => {
    const { container } = render(<Button variant={variant}>accessible</Button>);
    expect(await axe(container)).toHaveNoViolations();
  });
});
