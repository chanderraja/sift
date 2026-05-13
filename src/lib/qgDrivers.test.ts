// SPDX-License-Identifier: MIT

import { describe, it, expect } from 'vitest';
import {
  getConditionDrivers,
  DRIVER_LIMIT,
  COMPOSITE_CAP,
  type ConditionDriver,
  type IssueDriverSpec,
  type HotspotDriverSpec,
  type NoteDriverSpec,
} from './qgDrivers';
import type { QualityGate } from '../types/sonar';

type Condition = QualityGate['projectStatus']['conditions'][number];

const mk = (
  metricKey: string,
  actualValue = '3.0',
  status: Condition['status'] = 'ERROR',
): Condition => ({
  status,
  metricKey,
  comparator: 'LT',
  errorThreshold: '80',
  actualValue,
});

const PROJECT = 'acme';
const BRANCH = 'main';

const issueSpec = (d: ConditionDriver): IssueDriverSpec => {
  expect(d.spec.type).toBe('issues');
  return d.spec as IssueDriverSpec;
};

const hotspotSpec = (d: ConditionDriver): HotspotDriverSpec => {
  expect(d.spec.type).toBe('hotspots');
  return d.spec as HotspotDriverSpec;
};

const noteSpec = (d: ConditionDriver): NoteDriverSpec => {
  expect(d.spec.type).toBe('note');
  return d.spec as NoteDriverSpec;
};

describe('getConditionDrivers — constants', () => {
  it('DRIVER_LIMIT is 25', () => expect(DRIVER_LIMIT).toBe(25));
  it('COMPOSITE_CAP is 200', () => expect(COMPOSITE_CAP).toBe(200));
});

describe('getConditionDrivers — filtering', () => {
  it('skips OK conditions', () => {
    const result = getConditionDrivers([mk('reliability_rating', '1.0', 'OK')], PROJECT, BRANCH);
    expect(result).toHaveLength(0);
  });

  it('includes ERROR conditions', () => {
    const result = getConditionDrivers([mk('reliability_rating', '3.0', 'ERROR')], PROJECT, BRANCH);
    expect(result).toHaveLength(1);
  });

  it('includes WARN conditions', () => {
    const result = getConditionDrivers([mk('reliability_rating', '2.0', 'WARN')], PROJECT, BRANCH);
    expect(result).toHaveLength(1);
  });

  it('preserves the original condition on each driver', () => {
    const cond = mk('reliability_rating', '3.0');
    const [driver] = getConditionDrivers([cond], PROJECT, BRANCH);
    expect(driver?.condition).toBe(cond);
  });
});

describe('getConditionDrivers — reliability_rating', () => {
  it('maps to issues/BUG/OPEN', () => {
    const s = issueSpec(
      getConditionDrivers([mk('reliability_rating', '3.0')], PROJECT, BRANCH)[0]!,
    );
    expect(s.filters.types).toEqual(['BUG']);
    expect(s.filters.statuses).toEqual(['OPEN']);
    expect(s.filters.inNewCodePeriod).toBeUndefined();
  });

  it('includes the project key in componentKeys', () => {
    const s = issueSpec(
      getConditionDrivers([mk('reliability_rating', '3.0')], PROJECT, BRANCH)[0]!,
    );
    expect(s.filters.componentKeys).toContain(PROJECT);
  });
});

describe('getConditionDrivers — new_reliability_rating', () => {
  it('maps to issues/BUG/OPEN with inNewCodePeriod', () => {
    const s = issueSpec(
      getConditionDrivers([mk('new_reliability_rating', '3.0')], PROJECT, BRANCH)[0]!,
    );
    expect(s.filters.types).toEqual(['BUG']);
    expect(s.filters.statuses).toEqual(['OPEN']);
    expect(s.filters.inNewCodePeriod).toBe(true);
  });
});

describe('getConditionDrivers — security_rating', () => {
  it('maps to issues/VULNERABILITY/OPEN', () => {
    const s = issueSpec(getConditionDrivers([mk('security_rating', '3.0')], PROJECT, BRANCH)[0]!);
    expect(s.filters.types).toEqual(['VULNERABILITY']);
    expect(s.filters.statuses).toEqual(['OPEN']);
  });
});

describe('getConditionDrivers — new_security_rating', () => {
  it('maps to issues/VULNERABILITY with inNewCodePeriod', () => {
    const s = issueSpec(
      getConditionDrivers([mk('new_security_rating', '3.0')], PROJECT, BRANCH)[0]!,
    );
    expect(s.filters.types).toEqual(['VULNERABILITY']);
    expect(s.filters.inNewCodePeriod).toBe(true);
  });
});

describe('getConditionDrivers — maintainability_rating', () => {
  it('maps to issues/CODE_SMELL/OPEN', () => {
    const s = issueSpec(
      getConditionDrivers([mk('maintainability_rating', '3.0')], PROJECT, BRANCH)[0]!,
    );
    expect(s.filters.types).toEqual(['CODE_SMELL']);
    expect(s.filters.statuses).toEqual(['OPEN']);
  });
});

describe('getConditionDrivers — new_maintainability_rating', () => {
  it('maps to issues/CODE_SMELL with inNewCodePeriod', () => {
    const s = issueSpec(
      getConditionDrivers([mk('new_maintainability_rating', '3.0')], PROJECT, BRANCH)[0]!,
    );
    expect(s.filters.types).toEqual(['CODE_SMELL']);
    expect(s.filters.inNewCodePeriod).toBe(true);
  });
});

describe('getConditionDrivers — severity scaling', () => {
  it('rating B (2) → MINOR+', () => {
    const s = issueSpec(
      getConditionDrivers([mk('reliability_rating', '2.0')], PROJECT, BRANCH)[0]!,
    );
    expect(s.filters.severities).toEqual(['BLOCKER', 'CRITICAL', 'MAJOR', 'MINOR']);
  });

  it('rating C (3) → MAJOR+', () => {
    const s = issueSpec(
      getConditionDrivers([mk('reliability_rating', '3.0')], PROJECT, BRANCH)[0]!,
    );
    expect(s.filters.severities).toEqual(['BLOCKER', 'CRITICAL', 'MAJOR']);
  });

  it('rating D (4) → CRITICAL+', () => {
    const s = issueSpec(
      getConditionDrivers([mk('reliability_rating', '4.0')], PROJECT, BRANCH)[0]!,
    );
    expect(s.filters.severities).toEqual(['BLOCKER', 'CRITICAL']);
  });

  it('rating E (5) → BLOCKER+CRITICAL', () => {
    const s = issueSpec(
      getConditionDrivers([mk('reliability_rating', '5.0')], PROJECT, BRANCH)[0]!,
    );
    expect(s.filters.severities).toEqual(['BLOCKER', 'CRITICAL']);
  });
});

describe('getConditionDrivers — hotspot metrics', () => {
  it('security_hotspots_reviewed maps to hotspots/TO_REVIEW', () => {
    const s = hotspotSpec(
      getConditionDrivers([mk('security_hotspots_reviewed', '50')], PROJECT, BRANCH)[0]!,
    );
    expect(s.filters.status).toBe('TO_REVIEW');
    expect(s.filters.inNewCodePeriod).toBeUndefined();
  });

  it('new_security_hotspots_reviewed maps to hotspots/TO_REVIEW with inNewCodePeriod', () => {
    const s = hotspotSpec(
      getConditionDrivers([mk('new_security_hotspots_reviewed', '50')], PROJECT, BRANCH)[0]!,
    );
    expect(s.filters.status).toBe('TO_REVIEW');
    expect(s.filters.inNewCodePeriod).toBe(true);
  });

  it('includes the project key', () => {
    const s = hotspotSpec(
      getConditionDrivers([mk('security_hotspots_reviewed', '50')], PROJECT, BRANCH)[0]!,
    );
    expect(s.filters.projectKey).toBe(PROJECT);
  });
});

describe('getConditionDrivers — violation metrics', () => {
  it('new_blocker_violations → BLOCKER with inNewCodePeriod', () => {
    const s = issueSpec(
      getConditionDrivers([mk('new_blocker_violations', '3')], PROJECT, BRANCH)[0]!,
    );
    expect(s.filters.severities).toEqual(['BLOCKER']);
    expect(s.filters.inNewCodePeriod).toBe(true);
  });

  it('new_critical_violations → CRITICAL with inNewCodePeriod', () => {
    const s = issueSpec(
      getConditionDrivers([mk('new_critical_violations', '5')], PROJECT, BRANCH)[0]!,
    );
    expect(s.filters.severities).toEqual(['CRITICAL']);
    expect(s.filters.inNewCodePeriod).toBe(true);
  });

  it('new_major_violations → MAJOR with inNewCodePeriod', () => {
    const s = issueSpec(
      getConditionDrivers([mk('new_major_violations', '10')], PROJECT, BRANCH)[0]!,
    );
    expect(s.filters.severities).toEqual(['MAJOR']);
    expect(s.filters.inNewCodePeriod).toBe(true);
  });
});

describe('getConditionDrivers — note metrics', () => {
  it('coverage → note', () => {
    const s = noteSpec(getConditionDrivers([mk('coverage', '65')], PROJECT, BRANCH)[0]!);
    expect(s.message).toMatch(/coverage/i);
  });

  it('new_coverage → note', () => {
    const s = noteSpec(getConditionDrivers([mk('new_coverage', '65')], PROJECT, BRANCH)[0]!);
    expect(s.message).toMatch(/coverage/i);
  });

  it('new_duplicated_lines_density → note', () => {
    const s = noteSpec(
      getConditionDrivers([mk('new_duplicated_lines_density', '5')], PROJECT, BRANCH)[0]!,
    );
    expect(s.message).toMatch(/dedup/i);
  });

  it('unknown metric → note', () => {
    const s = noteSpec(getConditionDrivers([mk('some_future_metric', '42')], PROJECT, BRANCH)[0]!);
    expect(s.message).toBeTruthy();
  });
});

describe('getConditionDrivers — branch forwarded', () => {
  it('issue filters carry the branch', () => {
    const s = issueSpec(
      getConditionDrivers([mk('reliability_rating', '3.0')], PROJECT, 'feat/x')[0]!,
    );
    expect(s.filters.branch).toBe('feat/x');
  });

  it('hotspot filters carry the branch', () => {
    const s = hotspotSpec(
      getConditionDrivers([mk('security_hotspots_reviewed', '50')], PROJECT, 'feat/x')[0]!,
    );
    expect(s.filters.branch).toBe('feat/x');
  });
});
