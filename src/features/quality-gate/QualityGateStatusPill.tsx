// SPDX-License-Identifier: MIT

// Quality Gate status pill — large, color-coded summary of the
// project's gate state per SPEC §7.3.

import clsx from 'clsx';

import type { QualityGateStatus } from '../../types/sonar';

const TONE: Record<QualityGateStatus, string> = {
  OK: 'border-qg-pass/40 bg-qg-pass/10 text-qg-pass',
  WARN: 'border-qg-warn/40 bg-qg-warn/10 text-qg-warn',
  ERROR: 'border-qg-fail/40 bg-qg-fail/10 text-qg-fail',
  NONE: 'border-border-subtle bg-bg-surface text-text-secondary',
};

const LABEL: Record<QualityGateStatus, string> = {
  OK: 'Passed',
  WARN: 'Warning',
  ERROR: 'Failed',
  NONE: 'No quality gate',
};

export interface QualityGateStatusPillProps {
  status: QualityGateStatus;
}

export function QualityGateStatusPill({ status }: QualityGateStatusPillProps): React.JSX.Element {
  return (
    <div
      data-testid="qg-status-pill"
      data-status={status}
      role="status"
      aria-label={`Quality gate ${LABEL[status]}`}
      className={clsx(
        'inline-flex items-center gap-2 rounded border px-3 py-2 text-sm font-medium',
        TONE[status],
      )}
    >
      <span aria-hidden="true" className="font-mono text-xs uppercase tracking-wide">
        {status}
      </span>
      <span>{LABEL[status]}</span>
    </div>
  );
}
