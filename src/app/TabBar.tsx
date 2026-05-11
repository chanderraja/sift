// SPDX-License-Identifier: MIT

// TabBar — switches between the three findings views per SPEC §7. The
// active tab and the dispatcher both live in filtersStore so that URL
// hash + cross-tab persistence flow for free.

import { Tab, TabList, Tabs } from '../components/primitives/Tabs';
import { useFiltersStore } from './stores';
import type { Tab as TabId } from '../stores/filtersStore';

const TAB_IDS: readonly TabId[] = ['issues', 'hotspots', 'quality-gate'];
const isTabId = (v: string): v is TabId => (TAB_IDS as readonly string[]).includes(v);

export function TabBar(): React.JSX.Element {
  const tab = useFiltersStore((s) => s.tab);
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const setTab = useFiltersStore.getState().setTab;

  return (
    <Tabs
      value={tab}
      onValueChange={(value) => {
        if (isTabId(value)) setTab(value);
      }}
    >
      <TabList aria-label="Findings tabs">
        <Tab value="issues">Issues</Tab>
        <Tab value="hotspots">Hotspots</Tab>
        <Tab value="quality-gate">Quality gate</Tab>
      </TabList>
    </Tabs>
  );
}
