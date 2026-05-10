// SPDX-License-Identifier: MIT

// Validation effect: every time the token or region changes, debounce
// 250ms then call authStore.validate(). authStore.setToken / setRegion
// reset validation to 'idle' on change; this hook drives the
// idle→pending→valid|invalid transition.
//
// Empty token short-circuits before the timer is set so we never burn
// a guaranteed-401 request. The cleanup clears the in-flight timer on
// every re-fire so rapid edits collapse to a single validate at the
// end of the burst (the IMPLEMENTATION.md gotcha against firing on
// every keystroke).

import { useEffect } from 'react';

import { useAuthStore } from '../../app/stores';

const DEBOUNCE_MS = 250;

export function useValidateAuthEffect(): void {
  const token = useAuthStore((s) => s.token);
  const region = useAuthStore((s) => s.region);

  useEffect(() => {
    if (token.length === 0) return;
    const id = setTimeout(() => {
      void useAuthStore.getState().validate();
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(id);
    };
  }, [token, region]);
}
