// SPDX-License-Identifier: MIT

// Token field — password-masked input bound to authStore.token. Per
// ADR-005, every keystroke / paste flows through cleanToken before
// landing in the store; the live indicator below the field reports
// how many characters the most recent input carried that would have
// been stripped (zero-width space, NBSP, BOM, smart quotes, etc.).
// Surfacing the count up front avoids the "I pasted my token but the
// request fails with TypeError: non ISO-8859-1 code point" headache
// the spike encountered.
//
// Two affordances added per IMPLEMENTATION.md Phase 6 "When to ask
// the maintainer":
//
//   - Auto-focus on cold start (when the field is empty at mount —
//     i.e. no token restored from storage).
//   - Paste-from-clipboard button. Safari sometimes treats paste into
//     a password input oddly, and the button gives a frictionless
//     mobile path too. Uses the Clipboard API; the button click is
//     the user gesture the browser requires for permission.

import { Clipboard as ClipboardIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Button } from '../../components/primitives/Button';
import { Input } from '../../components/primitives/Input';
import { Tooltip } from '../../components/primitives/Tooltip';
import { cleanToken } from '../../lib/sanitize';
import { useAuthStore } from '../../app/stores';

const applyRawTextToStore = (
  raw: string,
  setToken: (raw: string) => void,
  setStrippedCount: (n: number) => void,
): void => {
  const cleaned = cleanToken(raw);
  setStrippedCount(raw.length - cleaned.length);
  setToken(raw);
};

export function TokenField(): React.JSX.Element {
  const token = useAuthStore((s) => s.token);
  // Zustand actions are stable across the store's lifetime and don't
  // close over `this`; the unbound-method lint guards against value-
  // typed methods that need binding, which doesn't apply here.
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const setToken = useAuthStore.getState().setToken;
  const [strippedCount, setStrippedCount] = useState(0);
  const [pasteFailed, setPasteFailed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus on cold start when no token has been restored from
  // storage. Only fires on the first mount so a re-render doesn't
  // steal focus mid-interaction.
  useEffect(() => {
    if (token.length === 0) inputRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePasteClick = (): void => {
    setPasteFailed(false);
    if (typeof navigator === 'undefined' || navigator.clipboard?.readText === undefined) {
      setPasteFailed(true);
      return;
    }
    navigator.clipboard
      .readText()
      .then((text) => {
        applyRawTextToStore(text, setToken, setStrippedCount);
        inputRef.current?.focus();
      })
      .catch(() => {
        setPasteFailed(true);
      });
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1">
        <Input
          ref={inputRef}
          type="password"
          autoComplete="off"
          spellCheck={false}
          aria-label="SonarCloud token"
          placeholder="Paste your SonarCloud token"
          value={token}
          onChange={(e) => {
            applyRawTextToStore(e.target.value, setToken, setStrippedCount);
          }}
          className="w-72"
        />
        <Tooltip content="Paste from clipboard">
          <Button
            variant="ghost"
            size="sm"
            aria-label="Paste token from clipboard"
            onClick={handlePasteClick}
          >
            <ClipboardIcon className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        </Tooltip>
      </div>
      {strippedCount > 0 ? (
        <p className="text-2xs text-severity-major" aria-live="polite">
          {strippedCount === 1
            ? '1 invisible character was stripped from your paste.'
            : `${String(strippedCount)} invisible characters were stripped from your paste.`}
        </p>
      ) : null}
      {pasteFailed ? (
        <p className="text-2xs text-text-tertiary" aria-live="polite">
          Couldn&apos;t read clipboard. Paste with the keyboard, or grant clipboard permission in
          your browser.
        </p>
      ) : null}
    </div>
  );
}
