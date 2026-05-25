// SPDX-License-Identifier: MIT

import { useQuery } from '@tanstack/react-query';
import { KeyRound } from 'lucide-react';
import { Suspense, lazy, useEffect } from 'react';

import { hotspotsQuery, issuesQuery, measuresQuery, qualityGateQuery } from './api/queries';
import { EmptyState } from './components/primitives/EmptyState';
import { Toaster } from './components/primitives/Toast';
import { Header } from './features/header/Header';
import { useEnsureSelectionLive } from './features/header/useEnsureSelectionLive';
import { useValidateAuthEffect } from './features/header/useValidateAuthEffect';
import { ExportModal } from './features/export-modal/ExportModal';
import { HotspotsTab } from './features/hotspots/HotspotsTab';
import { IssuesTab } from './features/issues/IssuesTab';
import { QualityGateTab } from './features/quality-gate/QualityGateTab';
import { startHashSync } from './stores/hashSyncIntegration';
import { useAuthStore, useFiltersStore, useSelectionStore, sonarClient } from './app/stores';
import { TabBar } from './app/TabBar';
import { SettingsDrawer } from './features/settings/SettingsDrawer';
import { ShortcutsModal } from './features/settings/ShortcutsModal';
import { useKeyboardShortcuts } from './features/settings/useKeyboardShortcuts';
import { useTheme } from './features/settings/useTheme';
import type {
  Hotspot,
  HotspotFilters,
  Issue,
  IssueFilters,
  Measure,
  QualityGate,
} from './types/sonar';

// Dev-only kitchen-sink route. Dynamically imported and gated behind
// import.meta.env.DEV so the module is tree-shaken out of the
// production bundle.
const KitchenSink = import.meta.env.DEV ? lazy(() => import('./dev/KitchenSink')) : null;

const isKitchenSinkPath = (): boolean =>
  typeof window !== 'undefined' && window.location.pathname === '/__kitchen-sink';

/**
 * Decide what to render in the tab area based on auth + selection.
 *
 * Cold start / token rejected → narrative empty state.
 * Token connected, no project picked → pick-a-project prompt.
 * Selection complete → the active tab (Issues / Hotspots / Quality Gate).
 */
function TabContent(): React.JSX.Element {
  const validation = useAuthStore((s) => s.validation);
  const token = useAuthStore((s) => s.token);
  const projectKey = useSelectionStore((s) => s.projectKey);
  const branchName = useSelectionStore((s) => s.branchName);
  const tab = useFiltersStore((s) => s.tab);

  if (validation === 'valid' && projectKey !== null && branchName !== null) {
    return (
      <>
        <TabBar />
        <div className="mt-4 flex-1">
          {tab === 'issues' ? (
            <IssuesTab />
          ) : tab === 'hotspots' ? (
            <HotspotsTab />
          ) : (
            <QualityGateTab />
          )}
        </div>
      </>
    );
  }

  if (validation === 'valid') {
    return (
      <EmptyState
        heading="Pick a project and branch"
        body="Use the pickers in the header to select an organization, project,
          and branch. The Issues tab will render results below."
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
 * Subscribes to the currently active issues page so the ExportModal always
 * reflects the data visible in the table. Using useQuery (not getQueryData)
 * ensures App re-renders when the query settles, so the Export dialog shows
 * the real count instead of 0.
 */
function useVisibleIssues(): { items: Issue[]; total: number } {
  const projectKey = useSelectionStore((s) => s.projectKey);
  const branchName = useSelectionStore((s) => s.branchName);
  const issuesFilters = useFiltersStore((s) => s.issuesFilters);
  const page = useFiltersStore((s) => s.page);
  const pageSize = useFiltersStore((s) => s.pageSize);

  const enabled = projectKey !== null && branchName !== null;
  const filters: IssueFilters = enabled
    ? { ...issuesFilters, componentKeys: [projectKey], branch: branchName }
    : issuesFilters;

  const result = useQuery({
    ...issuesQuery(sonarClient, filters, { p: page, ps: pageSize }),
    enabled,
  });
  return result.data?.kind === 'ok'
    ? { items: result.data.value.items, total: result.data.value.total }
    : { items: [], total: 0 };
}

function useVisibleHotspots(): { items: Hotspot[]; total: number } {
  const projectKey = useSelectionStore((s) => s.projectKey);
  const branchName = useSelectionStore((s) => s.branchName);
  const hotspotsFilters = useFiltersStore((s) => s.hotspotsFilters);

  const enabled = projectKey !== null && branchName !== null && hotspotsFilters !== null;
  const filters: HotspotFilters = enabled
    ? { ...hotspotsFilters, projectKey, branch: branchName }
    : { projectKey: (projectKey ?? '') as HotspotFilters['projectKey'] };

  const result = useQuery({ ...hotspotsQuery(sonarClient, filters), enabled });
  return result.data?.kind === 'ok'
    ? { items: result.data.value.items, total: result.data.value.total }
    : { items: [], total: 0 };
}

const QG_MEASURE_KEYS = [
  'complexity',
  'reliability_rating',
  'duplicated_lines_density',
  'security_rating',
  'ncloc',
  'sqale_rating',
];

function useVisibleQualityGate(): QualityGate | null {
  const projectKey = useSelectionStore((s) => s.projectKey);
  const branchName = useSelectionStore((s) => s.branchName);
  const enabled = projectKey !== null && branchName !== null;
  const result = useQuery({
    ...qualityGateQuery(sonarClient, projectKey ?? '', branchName ?? ''),
    enabled,
  });
  return result.data?.kind === 'ok' ? result.data.value : null;
}

function useVisibleMeasures(): Measure[] {
  const projectKey = useSelectionStore((s) => s.projectKey);
  const branchName = useSelectionStore((s) => s.branchName);
  const enabled = projectKey !== null && branchName !== null;
  const result = useQuery({
    ...measuresQuery(sonarClient, projectKey ?? '', branchName ?? '', QG_MEASURE_KEYS),
    enabled,
  });
  return result.data?.kind === 'ok' ? result.data.value : [];
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
  useTheme();
  useKeyboardShortcuts();

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

  const { items: visibleIssues, total: totalIssues } = useVisibleIssues();
  const { items: visibleHotspots, total: totalHotspots } = useVisibleHotspots();
  const visibleQualityGate = useVisibleQualityGate();
  const visibleMeasures = useVisibleMeasures();

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
        <TabContent />
      </main>
      {/* Overlay mount points — Modal / Drawer / Toast portals attach here. */}
      <ExportModal
        issues={visibleIssues}
        hotspots={visibleHotspots}
        qualityGate={visibleQualityGate}
        measures={visibleMeasures}
        totalIssues={totalIssues}
        totalHotspots={totalHotspots}
      />
      <SettingsDrawer />
      <ShortcutsModal />
      <Toaster />
    </div>
  );
}
