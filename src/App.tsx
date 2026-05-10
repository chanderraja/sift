// SPDX-License-Identifier: MIT

import { Suspense, lazy } from 'react';

import { Toaster } from './components/primitives/Toast';
import { Header } from './features/header/Header';
import { useValidateAuthEffect } from './features/header/useValidateAuthEffect';

// Dev-only kitchen-sink route. Dynamically imported and gated behind
// import.meta.env.DEV so the module is tree-shaken out of the
// production bundle.
const KitchenSink = import.meta.env.DEV ? lazy(() => import('./dev/KitchenSink')) : null;

const isKitchenSinkPath = (): boolean =>
  typeof window !== 'undefined' && window.location.pathname === '/__kitchen-sink';

/**
 * Top-level page composition: header at top, tab area below, overlay
 * slots layered on top. Header / tabs / overlays land in subsequent
 * Phase 6+ commits — this scaffold owns only the layout grid and the
 * toast mount-point.
 */
export default function App(): React.JSX.Element {
  // Drives the idle→pending→valid|invalid transition every time the
  // user pastes a token or switches region. Hydrates silently on cold
  // start when the token was restored from storage.
  useValidateAuthEffect();

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
      {/* Tab content area. Empty state + tabs land in subsequent Phase 6+ commits. */}
      <main data-testid="app-content" className="flex-1" />
      {/* Overlay mount points — Modal / Drawer / Toast portals attach here. */}
      <Toaster />
    </div>
  );
}
