// SPDX-License-Identifier: MIT

import type { SonarClient } from '../../api/SonarClient';
import type { ConditionDriver, ConditionWithDrivers, DriverResult } from '../../lib/qgDrivers';
import { DRIVER_LIMIT } from '../../lib/qgDrivers';

async function executeDriver(client: SonarClient, driver: ConditionDriver): Promise<DriverResult> {
  const { spec } = driver;

  if (spec.type === 'note') {
    return { kind: 'note', message: spec.message };
  }

  if (spec.type === 'issues') {
    const result = await client.searchIssues(spec.filters, { ps: DRIVER_LIMIT });
    if (result.kind === 'ok') return { kind: 'issues', items: result.value.items };
    if (result.kind === 'over_cap') {
      return {
        kind: 'error',
        message: `Too many issues (${result.total} total); narrow the filter set.`,
      };
    }
    return { kind: 'error', message: result.kind };
  }

  // hotspots
  const result = await client.searchHotspots(spec.filters, { ps: DRIVER_LIMIT });
  if (result.kind === 'ok') return { kind: 'hotspots', items: result.value.items };
  return { kind: 'error', message: result.kind };
}

export async function orchestrateActionable(
  client: SonarClient,
  conditionDrivers: readonly ConditionDriver[],
  onProgress?: (done: number, total: number) => void,
): Promise<readonly ConditionWithDrivers[]> {
  const total = conditionDrivers.length;
  let done = 0;

  const promises = conditionDrivers.map(async (driver) => {
    const driverResult = await executeDriver(client, driver);
    done += 1;
    onProgress?.(done, total);
    return { condition: driver.condition, driverResult };
  });

  const settled = await Promise.allSettled(promises);

  return settled.map((result, idx) => {
    if (result.status === 'fulfilled') return result.value;
    return {
      condition: conditionDrivers[idx]!.condition,
      driverResult: { kind: 'error' as const, message: 'Unexpected error' },
    };
  });
}
