// SPDX-License-Identifier: MIT

// Select primitive built on @radix-ui/react-select. Single-select
// dropdown with keyboard navigation and built-in type-ahead matching.
// Multi-select and the Combobox-with-search variant — used by the
// project picker in Phase 7 — will compose @radix-ui/react-popover
// with a custom listbox; this Select is the single-select baseline.

import * as RadixSelect from '@radix-ui/react-select';
import clsx from 'clsx';
import { Check, ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';
import { forwardRef } from 'react';

export interface SelectProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Accessible label — passed to the trigger as aria-label. */
  'aria-label'?: string;
  className?: string;
  children: ReactNode;
}

const triggerClasses =
  'inline-flex h-8 items-center justify-between gap-2 rounded border border-border ' +
  'bg-bg-elevated px-3 text-xs text-text-primary ' +
  'data-[placeholder]:text-text-tertiary ' +
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ' +
  'focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50';

const contentClasses =
  'z-50 overflow-hidden rounded border border-border bg-bg-elevated shadow-md ' +
  'min-w-[var(--radix-select-trigger-width)]';

export const Select = ({
  value,
  defaultValue,
  onValueChange,
  placeholder,
  disabled,
  'aria-label': ariaLabel,
  className,
  children,
}: SelectProps): React.JSX.Element => {
  // exactOptionalPropertyTypes is strict — only spread props that are
  // actually set so Radix's `disabled: boolean` (no undefined) doesn't
  // get a `undefined`.
  const rootProps: RadixSelect.SelectProps = {};
  if (value !== undefined) rootProps.value = value;
  if (defaultValue !== undefined) rootProps.defaultValue = defaultValue;
  if (onValueChange !== undefined) rootProps.onValueChange = onValueChange;
  if (disabled !== undefined) rootProps.disabled = disabled;
  return (
    <RadixSelect.Root {...rootProps}>
      <RadixSelect.Trigger aria-label={ariaLabel} className={clsx(triggerClasses, className)}>
        <RadixSelect.Value placeholder={placeholder} />
        <RadixSelect.Icon>
          <ChevronDown className="h-3.5 w-3.5 text-text-tertiary" aria-hidden="true" />
        </RadixSelect.Icon>
      </RadixSelect.Trigger>
      <RadixSelect.Portal>
        <RadixSelect.Content position="popper" sideOffset={4} className={contentClasses}>
          <RadixSelect.Viewport className="p-1">{children}</RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  );
};

export interface SelectItemProps extends RadixSelect.SelectItemProps {
  children: ReactNode;
}

const itemClasses =
  'relative flex h-7 cursor-pointer select-none items-center rounded-sm pl-7 pr-2 text-xs ' +
  'text-text-primary outline-none data-[highlighted]:bg-bg-surface-hover ' +
  'data-[disabled]:pointer-events-none data-[disabled]:opacity-50';

export const SelectItem = forwardRef<HTMLDivElement, SelectItemProps>(function SelectItem(
  { children, className, ...rest },
  ref,
) {
  return (
    <RadixSelect.Item ref={ref} className={clsx(itemClasses, className)} {...rest}>
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <RadixSelect.ItemIndicator>
          <Check className="h-3 w-3 text-accent" aria-hidden="true" />
        </RadixSelect.ItemIndicator>
      </span>
      <RadixSelect.ItemText>{children}</RadixSelect.ItemText>
    </RadixSelect.Item>
  );
});
