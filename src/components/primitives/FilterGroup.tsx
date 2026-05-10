// SPDX-License-Identifier: MIT

// FilterGroup primitive — collapsible section with title + count
// badge, used by the issue/hotspot filter sidebar (Phase 8). Native
// <details>/<summary> for the disclosure semantics so we get keyboard
// support (Enter/Space to toggle) without any JS.

import clsx from 'clsx';
import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';

export interface FilterGroupProps {
  title: string;
  count?: number;
  defaultOpen?: boolean;
  className?: string;
  children: ReactNode;
}

export const FilterGroup = ({
  title,
  count,
  defaultOpen = true,
  className,
  children,
}: FilterGroupProps): React.JSX.Element => (
  <details
    open={defaultOpen}
    className={clsx('group border-b border-border-subtle py-2', className)}
  >
    <summary
      className={
        'flex cursor-pointer list-none items-center justify-between gap-2 px-1 py-1 ' +
        'text-2xs font-medium uppercase tracking-wide text-text-secondary ' +
        'hover:text-text-primary ' +
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ' +
        'focus-visible:outline-accent'
      }
    >
      <span className="flex items-center gap-1.5">
        <ChevronRight
          className="h-3 w-3 transition-transform group-open:rotate-90"
          aria-hidden="true"
        />
        {title}
      </span>
      {count !== undefined ? <span className="text-text-tertiary">{count}</span> : null}
    </summary>
    <div className="mt-2 flex flex-col gap-1 px-1 pb-1">{children}</div>
  </details>
);
