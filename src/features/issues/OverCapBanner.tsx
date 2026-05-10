// SPDX-License-Identifier: MIT

// OverCapBanner — per ADR-007, when SonarCloud's `paging.total` exceeds
// the 10,000 hard cap on `/issues/search`, Sift shows a banner above
// the (otherwise inert) results explaining the cap and offering one-click
// narrowing chips that patch filtersStore.issuesFilters.
//
// ADR-007 also describes per-page heuristic chips ("+ file path: src/...",
// "+ created ≥ 90 days ago"). Those depend on the SonarClient preserving
// the first page of items inside the `over_cap` variant, which the current
// client does not (the discriminated variant carries only `total`). Until
// the client is extended, this banner ships generic narrowing chips that
// always make the filter strictly smaller; the heuristic chips can land
// alongside an `items?: Issue[]` extension to the variant.

import { AlertTriangle } from 'lucide-react';

import { Button } from '../../components/primitives/Button';
import { useFiltersStore } from '../../app/stores';

const fmt = (n: number): string => n.toLocaleString('en-US');

export interface OverCapBannerProps {
  total: number;
}

export function OverCapBanner({ total }: OverCapBannerProps): React.JSX.Element {
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const patchIssues = useFiltersStore.getState().patchIssues;

  return (
    <div
      data-testid="issues-over-cap-banner"
      role="alert"
      className={
        'flex flex-col gap-2 rounded border border-amber-500/40 bg-amber-500/10 ' +
        'p-3 text-xs text-text-primary'
      }
    >
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-500" aria-hidden="true" />
        <div className="flex-1">
          <div className="font-medium">Filter returns ~{fmt(total)} issues</div>
          <p className="text-text-secondary">
            SonarCloud caps a single search at 10,000 results. Sift will not silently chunk because
            exports would shift between page fetches. Narrow the filter to see and export a
            consistent set.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 pl-6">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            patchIssues({ severities: ['BLOCKER', 'CRITICAL'] });
          }}
        >
          + Severity ≥ Critical
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            patchIssues({ statuses: ['OPEN', 'CONFIRMED', 'REOPENED'] });
          }}
        >
          + Unresolved only
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            // ~90 days back from today.
            const since = new Date(Date.now() - 90 * 86_400_000).toISOString().slice(0, 10);
            patchIssues({ createdAfter: since });
          }}
        >
          + Created in last 90 days
        </Button>
      </div>
    </div>
  );
}
