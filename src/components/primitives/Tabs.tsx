// SPDX-License-Identifier: MIT

// Tabs primitive built on @radix-ui/react-tabs. Horizontal layout
// with a single underline accent on the active tab per SPEC §16.5.
// Radix owns the keyboard semantics (arrow-key cycling, Home/End).

import * as RadixTabs from '@radix-ui/react-tabs';
import clsx from 'clsx';
import type { ReactNode } from 'react';

export interface TabsProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  children: ReactNode;
}

export const Tabs = ({
  value,
  defaultValue,
  onValueChange,
  className,
  children,
}: TabsProps): React.JSX.Element => {
  const props: RadixTabs.TabsProps = { orientation: 'horizontal' };
  if (value !== undefined) props.value = value;
  if (defaultValue !== undefined) props.defaultValue = defaultValue;
  if (onValueChange !== undefined) props.onValueChange = onValueChange;
  return (
    <RadixTabs.Root className={className} {...props}>
      {children}
    </RadixTabs.Root>
  );
};

export const TabList = ({
  className,
  children,
  'aria-label': ariaLabel,
}: {
  className?: string;
  children: ReactNode;
  'aria-label'?: string;
}): React.JSX.Element => (
  <RadixTabs.List
    aria-label={ariaLabel}
    className={clsx('flex border-b border-border-subtle', className)}
  >
    {children}
  </RadixTabs.List>
);

const triggerClasses =
  'relative inline-flex h-9 items-center px-3 text-xs text-text-secondary ' +
  'data-[state=active]:text-text-primary ' +
  // Underline accent for the active tab per SPEC §16.5.
  'data-[state=active]:after:absolute data-[state=active]:after:inset-x-0 ' +
  'data-[state=active]:after:bottom-0 data-[state=active]:after:h-0.5 ' +
  'data-[state=active]:after:bg-accent ' +
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ' +
  'focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50';

export const Tab = ({
  value,
  className,
  children,
  disabled,
}: {
  value: string;
  className?: string;
  children: ReactNode;
  disabled?: boolean;
}): React.JSX.Element => {
  const props: RadixTabs.TabsTriggerProps = { value };
  if (disabled !== undefined) props.disabled = disabled;
  return (
    <RadixTabs.Trigger className={clsx(triggerClasses, className)} {...props}>
      {children}
    </RadixTabs.Trigger>
  );
};

export const TabPanel = ({
  value,
  className,
  children,
}: {
  value: string;
  className?: string;
  children: ReactNode;
}): React.JSX.Element => (
  <RadixTabs.Content value={value} className={className}>
    {children}
  </RadixTabs.Content>
);
