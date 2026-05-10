// SPDX-License-Identifier: MIT

// Region selector — bound to authStore.region. Switching region
// invalidates the prior validation result (handled in authStore.
// setRegion); the validation effect downstream then re-fires.

import { Select, SelectItem } from '../../components/primitives/Select';
import { useAuthStore } from '../../app/stores';
import type { Region } from '../../stores/authStore';

const REGION_LABEL: Record<Region, string> = {
  eu: 'EU',
  us: 'US',
};

export function RegionSelector(): React.JSX.Element {
  const region = useAuthStore((s) => s.region);
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const setRegion = useAuthStore.getState().setRegion;
  return (
    <Select
      value={region}
      onValueChange={(v) => {
        if (v === 'eu' || v === 'us') setRegion(v);
      }}
      aria-label="Region"
      className="w-20"
    >
      <SelectItem value="eu">{REGION_LABEL.eu}</SelectItem>
      <SelectItem value="us">{REGION_LABEL.us}</SelectItem>
    </Select>
  );
}
