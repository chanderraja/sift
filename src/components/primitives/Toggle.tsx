// SPDX-License-Identifier: MIT

// Toggle (Switch) primitive built on @radix-ui/react-switch.
// Standalone — not part of a group — typically used in the Settings
// drawer for boolean preferences (theme switch, "remember last
// project", etc.).

import * as RadixSwitch from '@radix-ui/react-switch';
import clsx from 'clsx';
import type { ReactNode } from 'react';
import { forwardRef, useId } from 'react';

export interface ToggleProps extends Omit<RadixSwitch.SwitchProps, 'children'> {
  children?: ReactNode;
}

const rootClasses =
  'relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border ' +
  'border-border bg-bg-elevated transition-colors ' +
  'data-[state=checked]:bg-accent data-[state=checked]:border-accent ' +
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ' +
  'focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50';

const thumbClasses =
  'block h-3.5 w-3.5 translate-x-0.5 rounded-full bg-text-primary transition-transform ' +
  'data-[state=checked]:translate-x-[18px] data-[state=checked]:bg-bg-base';

export const Toggle = forwardRef<HTMLButtonElement, ToggleProps>(function Toggle(
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
      <RadixSwitch.Root id={inputId} ref={ref} className={rootClasses} {...rest}>
        <RadixSwitch.Thumb className={thumbClasses} />
      </RadixSwitch.Root>
      {children}
    </label>
  );
});
