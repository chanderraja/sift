// SPDX-License-Identifier: MIT

import { KeyRound } from 'lucide-react';
import { Suspense, lazy, useEffect } from 'react';

import { EmptyState } from './components/primitives/EmptyState';
import { Toaster } from './components/primitives/Toast';
import { Header } from './features/header/Header';
import { useEnsureSelectionLive } from './features/header/useEnsureSelectionLive';
import { useValidateAuthEffect } from './features/header/useValidateAuthEffect';
import { startHashSync } from './stores/hashSyncIntegration';
import { useAuthStore, useFiltersStore, useSelectionStore } from './app/stores';

// Dev-only kitchen-sink route. Dynamically imported and gated behind
// import.meta.env.DEV so the module is tree-shaken out of the
// production bundle.
const KitchenSink = import.meta.env.DEV ? lazy(() => import('./dev/KitchenSink')) : null;

const isKitchenSinkPath = (): boolean =>
  typeof window !== 'undefined' && window.location.pathname === '/__kitchen-sink';

/**
 * Empty state shown in the tab area until a token is pasted and
 * validated. Tabs themselves land in Phase 8+; until then, this is
 * the only thing the body shows.
 */
function NoTokenContent(): React.JSX.Element {
  const validation = useAuthStore((s) => s.validation);
  const token = useAuthStore((s) => s.token);

  if (validation === 'valid') {
    // The token has been accepted by the proxy; the populated tabs
    // land in Phases 7 (pickers) and 8+ (issues / hotspots / QG).
    return (
      <EmptyState
        heading="Token connected"
        body="Pickers and tabs arrive in Phase 7+ — for now, the auth flow is
          live end-to-end. Watch DevTools for store and query state."
      />
    );
  }

  if (token.length > 0 && validation === 'invalid') {
    return (
      <EmptyState
        icon={<KeyRound className="h-6 w-6" />}
        heading="Token rejected"
        body="The proxy returned an authentication failure. Check the token,
          confirm you copied it from the right environment, and try again."
      />
    );
  }

  return (
    <EmptyState
      icon={<KeyRound className="h-6 w-6" />}
      heading="Paste a token above to begin."
      body="Sift never sends your token to a server other than SonarCloud (or
        SonarQube.us). The thin proxy that fronts SonarCloud is stateless and
        logs nothing — see SECURITY.md."
    />
  );
}

/**
 * Top-level page composition: header at top, tab area below, overlay
 * slots layered on top.
 */
export default function App(): React.JSX.Element {
  // Drives the idle→pending→valid|invalid transition every time the
  // user pastes a token or switches region. Hydrates silently on cold
  // start when the token was restored from storage.
  useValidateAuthEffect();

  // ADR-009: when a persisted selection key (org / project / branch)
  // is missing from the freshly-loaded list, clear that level + cascade
  // and fire a toast. Filters survive intact.
  useEnsureSelectionLive();

  // Hash ⇄ store round-trip per Phase 4's hashSyncIntegration. One-shot
  // hydration at mount; subsequent store changes write the hash. The
  // cleanup detaches the subscription on unmount.
  useEffect(() => {
    return startHashSync({
      selection: useSelectionStore,
      filters: useFiltersStore,
      location: window.location,
    });
  }, []);

  if (KitchenSink !== null && isKitchenSinkPath()) {
    return (
      <Suspense fallback={<main className="p-8 text-xs text-text-tertiary">Loading…</main>}>
        <KitchenSink />
      </Suspense>
    );
  }

  return (
    <div className="flex min-h-full flex-col bg-bg-base text-text-primary">
      <Header />
      <main data-testid="app-content" className="flex-1 p-6">
        <NoTokenContent />
      </main>
      {/* Overlay mount points — Modal / Drawer / Toast portals attach here. */}
      <Toaster />
    </div>
  );
}
