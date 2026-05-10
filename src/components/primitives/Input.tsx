// SPDX-License-Identifier: MIT

// Input primitive per SPEC §16.5. Accepts every native <input> type;
// the four named variants the spec calls out (text, password, search,
// number) all flow through the same component. `leadingIcon` is the
// hook for the search variant — supply a `<Search />` from lucide-react
// (or anything else) and it renders left-aligned with the input padded
// to make room.

import clsx from 'clsx';
import type { InputHTMLAttributes, ReactNode } from 'react';
import { forwardRef } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  leadingIcon?: ReactNode;
}

const baseClasses =
  'h-8 w-full rounded border border-border bg-bg-elevated px-3 text-xs ' +
  'text-text-primary placeholder:text-text-tertiary ' +
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ' +
  'focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50';

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { leadingIcon, className, type = 'text', ...rest },
  ref,
) {
  if (leadingIcon !== undefined) {
    return (
      <div className={clsx('relative', className)}>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-2 top-1/2 flex h-3.5 w-3.5 -translate-y-1/2 items-center text-text-tertiary"
        >
          {leadingIcon}
        </span>
        <input ref={ref} type={type} className={clsx(baseClasses, 'pl-7')} {...rest} />
      </div>
    );
  }
  return <input ref={ref} type={type} className={clsx(baseClasses, className)} {...rest} />;
});
