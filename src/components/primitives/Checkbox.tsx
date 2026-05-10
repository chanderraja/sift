// SPDX-License-Identifier: MIT

// Checkbox primitive built on @radix-ui/react-checkbox. Renders the
// box + a label (children) wrapped in a row so the whole row is the
// click target. Indeterminate state supported because issue/hotspot
// filter trees will need it.

import * as RadixCheckbox from '@radix-ui/react-checkbox';
import clsx from 'clsx';
import { Check, Minus } from 'lucide-react';
import type { ReactNode } from 'react';
import { forwardRef, useId } from 'react';

export interface CheckboxProps extends Omit<RadixCheckbox.CheckboxProps, 'asChild' | 'children'> {
  children?: ReactNode;
  className?: string;
}

const baseClasses =
  'inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-border ' +
  'bg-bg-elevated text-bg-base ' +
  'data-[state=checked]:bg-accent data-[state=checked]:border-accent ' +
  'data-[state=indeterminate]:bg-accent data-[state=indeterminate]:border-accent ' +
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ' +
  'focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50';

export const Checkbox = forwardRef<HTMLButtonElement, CheckboxProps>(function Checkbox(
  { id, children, className, ...rest },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <label
      htmlFor={inputId}
      className={clsx(
        'inline-flex cursor-pointer items-center gap-2 text-xs text-text-primary',
        rest.disabled && 'cursor-not-allowed opacity-50',
        className,
      )}
    >
      <RadixCheckbox.Root id={inputId} ref={ref} className={baseClasses} {...rest}>
        <RadixCheckbox.Indicator className="flex items-center justify-center">
          {rest.checked === 'indeterminate' ? (
            <Minus className="h-3 w-3" aria-hidden="true" />
          ) : (
            <Check className="h-3 w-3" aria-hidden="true" />
          )}
        </RadixCheckbox.Indicator>
      </RadixCheckbox.Root>
      {children}
    </label>
  );
});
