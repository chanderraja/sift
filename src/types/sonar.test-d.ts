// SPDX-License-Identifier: MIT

// Type-only tests. Validated by `pnpm typecheck` (tsc -b); not picked up by
// vitest's default include glob. The point: prove the brand machinery
// rejects the cross-assignments and bare-string assignments that the
// type system is supposed to reject.

import { expectTypeOf } from 'expect-type';

import type {
  Branch,
  Hotspot,
  Issue,
  IssueKey,
  IssueType,
  Measure,
  Organization,
  OrgKey,
  Project,
  ProjectKey,
  QualityGate,
  Resolution,
  RuleKey,
  Severity,
  Status,
} from './sonar';

// === Branded primitive types ===

// Each branded key is a string subtype, so it passes through utilities like
// JSON.stringify and string-context coercion without unwrapping.
expectTypeOf<IssueKey>().toExtend<string>();
expectTypeOf<ProjectKey>().toExtend<string>();
expectTypeOf<OrgKey>().toExtend<string>();
expectTypeOf<RuleKey>().toExtend<string>();

// A bare `string` is NOT a branded key — assignment requires explicit casting
// (or, in feature code, a Zod-validated parse).
expectTypeOf<string>().not.toExtend<IssueKey>();
expectTypeOf<string>().not.toExtend<ProjectKey>();
expectTypeOf<string>().not.toExtend<OrgKey>();
expectTypeOf<string>().not.toExtend<RuleKey>();

// Distinct brands have distinct types — no two brands collapse into the
// same TypeScript type.
expectTypeOf<IssueKey>().not.toEqualTypeOf<ProjectKey>();
expectTypeOf<IssueKey>().not.toEqualTypeOf<OrgKey>();
expectTypeOf<IssueKey>().not.toEqualTypeOf<RuleKey>();
expectTypeOf<ProjectKey>().not.toEqualTypeOf<OrgKey>();
expectTypeOf<ProjectKey>().not.toEqualTypeOf<RuleKey>();
expectTypeOf<OrgKey>().not.toEqualTypeOf<RuleKey>();

// Belt-and-suspenders: a function expecting one brand must reject a value of
// another brand. The @ts-expect-error directive both proves the rejection
// and silences the resulting compile error.
const acceptsIssueKey = (_: IssueKey): void => {
  void _;
};
const acceptsProjectKey = (_: ProjectKey): void => {
  void _;
};
const acceptsOrgKey = (_: OrgKey): void => {
  void _;
};

const issueKey = '' as IssueKey;
const projectKey = '' as ProjectKey;
const orgKey = '' as OrgKey;
const ruleKey = '' as RuleKey;

// @ts-expect-error — IssueKey is not assignable to ProjectKey
acceptsProjectKey(issueKey);
// @ts-expect-error — ProjectKey is not assignable to IssueKey
acceptsIssueKey(projectKey);
// @ts-expect-error — OrgKey is not assignable to ProjectKey
acceptsProjectKey(orgKey);
// @ts-expect-error — RuleKey is not assignable to OrgKey
acceptsOrgKey(ruleKey);
// @ts-expect-error — a bare string is not an IssueKey
acceptsIssueKey('AYx8K1pQ-2zR4Mv');

// Same-brand calls are accepted (and serve as use-sites for the locals so
// noUnusedLocals stays quiet).
acceptsIssueKey(issueKey);
acceptsProjectKey(projectKey);
acceptsOrgKey(orgKey);

// === Domain enum unions ===

expectTypeOf<Severity>().toEqualTypeOf<'BLOCKER' | 'CRITICAL' | 'MAJOR' | 'MINOR' | 'INFO'>();

expectTypeOf<IssueType>().toEqualTypeOf<'BUG' | 'VULNERABILITY' | 'CODE_SMELL'>();

expectTypeOf<Status>().toEqualTypeOf<'OPEN' | 'CONFIRMED' | 'REOPENED' | 'RESOLVED' | 'CLOSED'>();

expectTypeOf<Resolution>().toEqualTypeOf<
  'FALSE-POSITIVE' | 'WONTFIX' | 'FIXED' | 'REMOVED' | null
>();

// === Domain interface key fields carry the right brands ===

// These prove the brands flow into interfaces; cross-interface key swaps
// would fail to type-check, mirroring what the validators will enforce
// at runtime in the next commits.
expectTypeOf<Organization>().toHaveProperty('key').toEqualTypeOf<OrgKey>();
expectTypeOf<Project>().toHaveProperty('key').toEqualTypeOf<ProjectKey>();
expectTypeOf<Project>().toHaveProperty('organization').toEqualTypeOf<OrgKey>();
expectTypeOf<Issue>().toHaveProperty('key').toEqualTypeOf<IssueKey>();
expectTypeOf<Issue>().toHaveProperty('rule').toEqualTypeOf<RuleKey>();
expectTypeOf<Issue>().toHaveProperty('project').toEqualTypeOf<ProjectKey>();
expectTypeOf<Issue>().toHaveProperty('severity').toEqualTypeOf<Severity>();
expectTypeOf<Issue>().toHaveProperty('type').toEqualTypeOf<IssueType>();
expectTypeOf<Issue>().toHaveProperty('status').toEqualTypeOf<Status>();
expectTypeOf<Issue>().toHaveProperty('resolution').toEqualTypeOf<Resolution>();
expectTypeOf<Hotspot>().toHaveProperty('ruleKey').toEqualTypeOf<RuleKey>();
expectTypeOf<Hotspot>().toHaveProperty('project').toEqualTypeOf<ProjectKey>();

// Reference Branch / QualityGate / Measure once so the imports aren't
// flagged as unused by the lint pass; deeper structural assertions are
// covered by the runtime Zod validators in upcoming commits.
expectTypeOf<Branch>().toHaveProperty('isMain').toEqualTypeOf<boolean>();
expectTypeOf<QualityGate>().toHaveProperty('projectStatus');
expectTypeOf<Measure>().toHaveProperty('metric').toEqualTypeOf<string>();
