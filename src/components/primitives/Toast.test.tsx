// SPDX-License-Identifier: MIT

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { Toaster, toast } from './Toast';

describe('Toast', () => {
  it('Toaster renders a region for screen readers', () => {
    render(<Toaster />);
    // sonner emits a polite live region; the role is 'region'.
    expect(screen.getByRole('region', { name: /notification/i })).toBeInTheDocument();
  });

  it('exposes info/success/warn/error helpers as functions', () => {
    expect(typeof toast.info).toBe('function');
    expect(typeof toast.success).toBe('function');
    expect(typeof toast.warn).toBe('function');
    expect(typeof toast.error).toBe('function');
  });

  it('toast.info dispatches without throwing', () => {
    render(<Toaster />);
    expect(() => toast.info('hello', { description: 'world' })).not.toThrow();
  });

  it('Toaster is axe-clean (empty stack)', async () => {
    const { container } = render(<Toaster />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
