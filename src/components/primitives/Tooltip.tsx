// SPDX-License-Identifier: MIT

// Tooltip primitive built on @radix-ui/react-tooltip. 200ms hover
// delay, top placement default per SPEC §16.5. Wrap a trigger element
// with `<Tooltip content="...">trigger</Tooltip>`; the trigger uses the
// asChild pattern so the wrapped element keeps its identity (button,
// link, etc.) and Tooltip just decorates it with the popover behavior.

import * as RadixTooltip from '@radix-ui/react-tooltip';
import clsx from 'clsx';
import type { ReactNode } from 'react';

const HOVER_DELAY_MS = 200;

export interface TooltipProps {
  content: ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  delayDuration?: number;
  className?: string;
  children: ReactNode;
}

const contentClasses =
  'z-50 max-w-xs rounded border border-border-subtle bg-bg-elevated px-2 py-1 ' +
  'text-2xs text-text-primary shadow-md';

export const Tooltip = ({
  content,
  side = 'top',
  align = 'center',
  delayDuration = HOVER_DELAY_MS,
  className,
  children,
}: TooltipProps): React.JSX.Element => (
  <RadixTooltip.Provider delayDuration={delayDuration}>
    <RadixTooltip.Root>
      <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
      <RadixTooltip.Portal>
        <RadixTooltip.Content
          side={side}
          align={align}
          sideOffset={4}
          className={clsx(contentClasses, className)}
        >
          {content}
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  </RadixTooltip.Provider>
);
