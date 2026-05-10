// SPDX-License-Identifier: MIT

import { Suspense, lazy } from 'react';

// Dev-only kitchen-sink route. Dynamically imported and gated behind
// import.meta.env.DEV so the module is tree-shaken out of the
// production bundle.
const KitchenSink = import.meta.env.DEV ? lazy(() => import('./dev/KitchenSink')) : null;

const isKitchenSinkPath = (): boolean =>
  typeof window !== 'undefined' && window.location.pathname === '/__kitchen-sink';

export default function App(): React.JSX.Element {
  if (KitchenSink !== null && isKitchenSinkPath()) {
    return (
      <Suspense fallback={<main className="p-8 text-xs text-text-tertiary">Loading…</main>}>
        <KitchenSink />
      </Suspense>
    );
  }

  return (
    <main className="p-8">
      <h1 className="text-xl text-text-primary">Sift</h1>
    </main>
  );
}
