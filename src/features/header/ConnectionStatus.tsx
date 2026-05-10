// SPDX-License-Identifier: MIT

// Connection status indicator — small badge driven by
// authStore.validation. States cover the four transitions:
//
//   idle      Awaiting token  — neutral
//   pending   Validating…     — neutral with subtle pulse
//   valid     Connected       — qg-pass tone
//   invalid   Invalid token   — qg-fail tone
//
// aria-live='polite' so screen readers announce transitions without
// interrupting whatever the user is currently doing.

import clsx from 'clsx';

import type { ValidationState } from '../../stores/authStore';
import { useAuthStore } from '../../app/stores';

const STATE_TEXT: Record<ValidationState, string> = {
  idle: 'Awaiting token',
  pending: 'Validating…',
  valid: 'Connected',
  invalid: 'Invalid token',
};

const STATE_CLASSES: Record<ValidationState, string> = {
  idle: 'border-border-subtle text-text-secondary',
  pending: 'border-border-subtle text-text-secondary animate-pulse',
  valid: 'border-qg-pass/40 text-qg-pass',
  invalid: 'border-qg-fail/40 text-qg-fail',
};

export function ConnectionStatus(): React.JSX.Element {
  const validation = useAuthStore((s) => s.validation);
  return (
    <span
      role="status"
      aria-live="polite"
      data-state={validation}
      className={clsx(
        'inline-flex items-center rounded-sm border bg-transparent px-1.5 py-0.5 ' +
          'text-2xs font-medium uppercase tracking-wide',
        STATE_CLASSES[validation],
      )}
    >
      {STATE_TEXT[validation]}
    </span>
  );
}
