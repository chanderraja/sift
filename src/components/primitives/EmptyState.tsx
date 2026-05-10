// SPDX-License-Identifier: MIT

// EmptyState primitive — icon + heading + body + optional action,
// per SPEC §16.5. Used by the Issues table when filters yield zero
// results, the cold-start "paste a token" state, etc.

import clsx from 'clsx';
import type { ReactNode } from 'react';

export interface EmptyStateProps {
  icon?: ReactNode;
  heading: string;
  body?: string;
  action?: ReactNode;
  className?: string;
}

export const EmptyState = ({
  icon,
  heading,
  body,
  action,
  className,
}: EmptyStateProps): React.JSX.Element => (
  <div
    role="status"
    className={clsx(
      'flex flex-col items-center justify-center gap-3 rounded border border-dashed ' +
        'border-border-subtle bg-bg-surface px-6 py-12 text-center',
      className,
    )}
  >
    {icon !== undefined ? (
      <div aria-hidden="true" className="text-text-tertiary">
        {icon}
      </div>
    ) : null}
    <div className="text-sm font-medium text-text-primary">{heading}</div>
    {body !== undefined ? <p className="max-w-md text-xs text-text-secondary">{body}</p> : null}
    {action !== undefined ? <div className="mt-1">{action}</div> : null}
  </div>
);
