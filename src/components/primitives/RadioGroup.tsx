// SPDX-License-Identifier: MIT

// RadioGroup primitive built on @radix-ui/react-radio-group. Two
// exports: RadioGroup (the wrapper that owns the value) and Radio
// (the individual option, including its label). Roving keyboard
// focus and arrow-key navigation come from Radix.

import * as RadixRadioGroup from '@radix-ui/react-radio-group';
import clsx from 'clsx';
import type { ReactNode } from 'react';
import { forwardRef, useId } from 'react';

export interface RadioGroupProps extends RadixRadioGroup.RadioGroupProps {
  className?: string;
}

export const RadioGroup = forwardRef<HTMLDivElement, RadioGroupProps>(function RadioGroup(
  { className, ...rest },
  ref,
) {
  return (
    <RadixRadioGroup.Root ref={ref} className={clsx('flex flex-col gap-2', className)} {...rest} />
  );
});

export interface RadioProps extends Omit<RadixRadioGroup.RadioGroupItemProps, 'children'> {
  children?: ReactNode;
}

const itemClasses =
  'inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-border ' +
  'bg-bg-elevated ' +
  'data-[state=checked]:border-accent ' +
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ' +
  'focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50';

export const Radio = forwardRef<HTMLButtonElement, RadioProps>(function Radio(
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
      <RadixRadioGroup.Item id={inputId} ref={ref} className={itemClasses} {...rest}>
        <RadixRadioGroup.Indicator className="block h-2 w-2 rounded-full bg-accent" />
      </RadixRadioGroup.Item>
      {children}
    </label>
  );
});
