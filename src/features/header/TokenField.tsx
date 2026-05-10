// SPDX-License-Identifier: MIT

// Token field — password-masked input bound to authStore.token. Per
// ADR-005, every keystroke / paste flows through cleanToken before
// landing in the store; the live indicator below the field reports
// how many characters the most recent input carried that would have
// been stripped (zero-width space, NBSP, BOM, smart quotes, etc.).
// Surfacing the count up front avoids the "I pasted my token but the
// request fails with TypeError: non ISO-8859-1 code point" headache
// the spike encountered.

import { useState } from 'react';

import { Input } from '../../components/primitives/Input';
import { cleanToken } from '../../lib/sanitize';
import { useAuthStore } from '../../app/stores';

export function TokenField(): React.JSX.Element {
  const token = useAuthStore((s) => s.token);
  // Zustand actions are stable across the store's lifetime and don't
  // close over `this`; the unbound-method lint guards against value-
  // typed methods that need binding, which doesn't apply here.
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const setToken = useAuthStore.getState().setToken;
  const [strippedCount, setStrippedCount] = useState(0);

  return (
    <div className="flex flex-col gap-1">
      <Input
        type="password"
        autoComplete="off"
        spellCheck={false}
        aria-label="SonarCloud token"
        placeholder="Paste your SonarCloud token"
        value={token}
        onChange={(e) => {
          const raw = e.target.value;
          const cleaned = cleanToken(raw);
          setStrippedCount(raw.length - cleaned.length);
          setToken(raw);
        }}
        className="w-72"
      />
      {strippedCount > 0 ? (
        <p className="text-2xs text-severity-major" aria-live="polite">
          {strippedCount === 1
            ? '1 invisible character was stripped from your paste.'
            : `${String(strippedCount)} invisible characters were stripped from your paste.`}
        </p>
      ) : null}
    </div>
  );
}
