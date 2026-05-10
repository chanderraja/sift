// SPDX-License-Identifier: MIT

// Button primitive per SPEC §16.5.
//
// Variants (primary / secondary / ghost / danger) draw from the design
// tokens — no hex literals leak in here. `asChild` (Radix Slot pattern)
// lets the same styles apply to a non-button element when needed (e.g.
// rendering an `<a>` that looks like a button), without compromising
// the default-button-as-button accessibility contract.

import { Slot } from '@radix-ui/react-slot';
import clsx from 'clsx';
import type { ButtonHTMLAttributes } from 'react';
import { forwardRef } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Render the children as the root element while keeping these styles. */
  asChild?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-bg-base hover:bg-accent-muted hover:text-text-primary',
  secondary: 'bg-bg-elevated text-text-primary border border-border hover:bg-bg-surface-hover',
  ghost: 'bg-transparent text-text-primary hover:bg-bg-surface-hover',
  danger: 'bg-severity-blocker text-white hover:opacity-90',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-7 px-2.5 text-2xs',
  md: 'h-8 px-3 text-xs',
};

const baseClasses =
  'inline-flex items-center justify-center gap-1.5 rounded font-medium ' +
  'transition-colors disabled:cursor-not-allowed disabled:opacity-50 ' +
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ' +
  'focus-visible:outline-accent';

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', asChild = false, className, type, ...props },
  ref,
) {
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp
      ref={ref}
      // Default to type="button" so a Button inside a form doesn't submit
      // accidentally. Explicit `type` on the caller still wins.
      type={asChild ? undefined : (type ?? 'button')}
      className={clsx(baseClasses, variantClasses[variant], sizeClasses[size], className)}
      {...props}
    />
  );
});
