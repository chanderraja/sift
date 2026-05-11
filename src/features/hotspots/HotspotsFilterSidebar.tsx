// SPDX-License-Identifier: MIT

// HotspotsFilterSidebar — narrower filter surface than Issues since
// SonarCloud's hotspots search exposes only two single-valued
// dimensions: status (TO_REVIEW / REVIEWED) and resolution (FIXED /
// SAFE / ACKNOWLEDGED). Each group is a radio set with an "Any"
// option that clears the filter.

import { FilterGroup } from '../../components/primitives/FilterGroup';
import { Radio, RadioGroup } from '../../components/primitives/RadioGroup';
import { useFiltersStore } from '../../app/stores';
import type { HotspotFilters } from '../../types/sonar';

const ANY = '__any__';

type StatusValue = NonNullable<HotspotFilters['status']>;
type ResolutionValue = NonNullable<HotspotFilters['resolution']>;

const STATUSES: readonly StatusValue[] = ['TO_REVIEW', 'REVIEWED'];
const RESOLUTIONS: readonly ResolutionValue[] = ['FIXED', 'SAFE', 'ACKNOWLEDGED'];

// "Any" clears the dimension by removing the key from hotspotsFilters
// entirely. `exactOptionalPropertyTypes` forbids setting it to
// `undefined`, so we drop the key with destructuring instead.
const clearKey = <K extends keyof HotspotFilters>(key: K): void => {
  useFiltersStore.setState((s) => {
    const existing = s.hotspotsFilters;
    if (existing === null) return {};
    const next = { ...existing };
    delete next[key];
    return { hotspotsFilters: next, page: 1 };
  });
};

export function HotspotsFilterSidebar(): React.JSX.Element {
  const filters = useFiltersStore((s) => s.hotspotsFilters);
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const patchHotspots = useFiltersStore.getState().patchHotspots;

  const statusValue: string = filters?.status ?? ANY;
  const resolutionValue: string = filters?.resolution ?? ANY;

  return (
    <div className="flex flex-col">
      <FilterGroup title="Status">
        <RadioGroup
          value={statusValue}
          onValueChange={(v) => {
            if (v === ANY) clearKey('status');
            else patchHotspots({ status: v as StatusValue });
          }}
        >
          <Radio value={ANY}>Any</Radio>
          {STATUSES.map((s) => (
            <Radio key={s} value={s}>
              {s.replace('_', ' ')}
            </Radio>
          ))}
        </RadioGroup>
      </FilterGroup>
      <FilterGroup title="Resolution">
        <RadioGroup
          value={resolutionValue}
          onValueChange={(v) => {
            if (v === ANY) clearKey('resolution');
            else patchHotspots({ resolution: v as ResolutionValue });
          }}
        >
          <Radio value={ANY}>Any</Radio>
          {RESOLUTIONS.map((r) => (
            <Radio key={r} value={r}>
              {r}
            </Radio>
          ))}
        </RadioGroup>
      </FilterGroup>
    </div>
  );
}
