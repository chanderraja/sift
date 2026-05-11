// SPDX-License-Identifier: MIT

// Zod schemas + parse functions for SonarCloud Web API V1 responses,
// per ARCHITECTURE.md §3 and IMPLEMENTATION.md "Phase 1".
//
// Design notes:
//   - Every object schema uses `.passthrough()` so unknown keys flow through
//     unchanged. SonarCloud adds fields over time (cleanCodeAttribute,
//     internalTags, lastChangeAnalysisUuid, …) and we don't want a v1 client
//     to break the moment a v1.1 response lands.
//   - Schemas validate the shapes our domain code consumes, not every field
//     SonarCloud may return. The brand cast `string → BrandedKey` is the only
//     place a brand boundary is crossed; feature code receives branded values.
//   - `parseX` functions return ParseResult<T> — a small discriminated union
//     mirroring Zod's safeParse output without leaking Zod's type into the
//     domain layer. The SonarClient (Phase 3) maps a parse failure to a
//     SonarClient-level Result<T> variant; this layer is concerned only with
//     "did the bytes match the schema."

import { z } from 'zod';

import type {
  Branch,
  Hotspot,
  Issue,
  IssueKey,
  Measure,
  Organization,
  OrgKey,
  Page,
  Project,
  ProjectKey,
  QualityGate,
  RuleKey,
} from '../types/sonar';

// === ParseResult ===

export type ParseResult<T> = { ok: true; value: T } | { ok: false; error: z.ZodError };

const ok = <T>(value: T): ParseResult<T> => ({ ok: true, value });

const fail = <T>(error: z.ZodError): ParseResult<T> => ({ ok: false, error });

// === Branded-string schemas ===
//
// Zod has no native "branded primitive" notion; the safest route is to parse
// as `string` and cast at the boundary. Using a named function keeps the
// `as` cast localised to one line per brand.

const projectKeySchema = z.string().transform((s) => s as ProjectKey);
const issueKeySchema = z.string().transform((s) => s as IssueKey);
const ruleKeySchema = z.string().transform((s) => s as RuleKey);
const orgKeySchema = z.string().transform((s) => s as OrgKey);

// === Enum schemas ===

const severitySchema = z.enum(['BLOCKER', 'CRITICAL', 'MAJOR', 'MINOR', 'INFO']);
const issueTypeSchema = z.enum(['BUG', 'VULNERABILITY', 'CODE_SMELL']);
const statusSchema = z.enum(['OPEN', 'CONFIRMED', 'REOPENED', 'RESOLVED', 'CLOSED']);

// `resolution` is absent from open-issue responses; normalise the missing
// case to `null` so the typed value is always one of the documented states.
const resolutionSchema = z
  .enum(['FALSE-POSITIVE', 'WONTFIX', 'FIXED', 'REMOVED'])
  .nullish()
  .transform((v) => v ?? null);

const qualityGateStatusSchema = z.enum(['OK', 'WARN', 'ERROR', 'NONE']);

const conditionStatusSchema = z.enum(['OK', 'WARN', 'ERROR']);

const comparatorSchema = z.enum(['GT', 'LT', 'EQ', 'NE']);

// === Domain object schemas ===

const textRangeSchema = z
  .object({
    startLine: z.number(),
    endLine: z.number(),
    startOffset: z.number(),
    endOffset: z.number(),
  })
  .passthrough();

export const OrganizationSchema = z
  .object({
    key: orgKeySchema,
    name: z.string(),
    description: z.string().optional(),
    subscription: z.string(),
    alm: z
      .object({
        key: z.string(),
        url: z.string(),
        personal: z.boolean(),
      })
      .passthrough()
      .optional(),
    actions: z
      .object({
        admin: z.boolean(),
        delete: z.boolean(),
        provision: z.boolean(),
      })
      .passthrough()
      .optional(),
    avatar: z.string().optional(),
  })
  .passthrough();

export const ProjectSchema = z
  .object({
    key: projectKeySchema,
    name: z.string(),
    organization: orgKeySchema,
    qualifier: z.literal('TRK'),
    visibility: z.enum(['public', 'private']),
    lastAnalysisDate: z.string().optional(),
    qualityGate: qualityGateStatusSchema.optional(),
  })
  .passthrough();

export const BranchSchema = z
  .object({
    name: z.string(),
    isMain: z.boolean(),
    type: z.enum(['LONG', 'SHORT', 'PULL_REQUEST']),
    status: z
      .object({
        qualityGateStatus: qualityGateStatusSchema,
      })
      .passthrough()
      .optional(),
    analysisDate: z.string().optional(),
  })
  .passthrough();

const issueFlowSchema = z
  .object({
    locations: z.array(
      z
        .object({
          component: z.string(),
          textRange: textRangeSchema,
          msg: z.string(),
        })
        .passthrough(),
    ),
  })
  .passthrough();

const issueCommentSchema = z
  .object({
    key: z.string(),
    htmlText: z.string(),
    createdAt: z.string(),
  })
  .passthrough();

export const IssueSchema = z
  .object({
    key: issueKeySchema,
    rule: ruleKeySchema,
    severity: severitySchema,
    type: issueTypeSchema,
    status: statusSchema,
    resolution: resolutionSchema,
    component: z.string(),
    project: projectKeySchema,
    line: z.number().optional(),
    hash: z.string().optional(),
    textRange: textRangeSchema.optional(),
    flows: z.array(issueFlowSchema).default([]),
    message: z.string(),
    effort: z.string().optional(),
    debt: z.string().optional(),
    author: z.string().optional(),
    tags: z.array(z.string()).default([]),
    creationDate: z.string(),
    updateDate: z.string(),
    closeDate: z.string().optional(),
    assignee: z.string().optional(),
    comments: z.array(issueCommentSchema).optional(),
  })
  .passthrough();

export const HotspotSchema = z
  .object({
    key: z.string(),
    component: z.string(),
    project: projectKeySchema,
    securityCategory: z.string(),
    vulnerabilityProbability: z.enum(['HIGH', 'MEDIUM', 'LOW']),
    status: z.enum(['TO_REVIEW', 'REVIEWED']),
    resolution: z.enum(['FIXED', 'SAFE', 'ACKNOWLEDGED']).optional(),
    line: z.number(),
    message: z.string(),
    creationDate: z.string(),
    updateDate: z.string(),
    ruleKey: ruleKeySchema,
  })
  .passthrough();

export const QualityGateSchema = z
  .object({
    projectStatus: z
      .object({
        status: qualityGateStatusSchema,
        conditions: z.array(
          z
            .object({
              status: conditionStatusSchema,
              metricKey: z.string(),
              comparator: comparatorSchema,
              errorThreshold: z.string(),
              actualValue: z.string(),
            })
            .passthrough(),
        ),
      })
      .passthrough(),
  })
  .passthrough();

export const MeasureSchema = z
  .object({
    metric: z.string(),
    value: z.string().optional(),
    bestValue: z.boolean().optional(),
    period: z
      .object({
        index: z.number(),
        value: z.string(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

// === Response-envelope schemas + parse functions ===

const pagingSchema = z
  .object({
    pageIndex: z.number(),
    pageSize: z.number(),
    total: z.number(),
  })
  .passthrough();

const toPage = <T>(items: T[], paging: z.infer<typeof pagingSchema>): Page<T> => ({
  items,
  pageIndex: paging.pageIndex,
  pageSize: paging.pageSize,
  total: paging.total,
});

const OrganizationsSearchResponseSchema = z
  .object({
    paging: pagingSchema,
    organizations: z.array(OrganizationSchema),
  })
  .passthrough();

const ProjectsSearchResponseSchema = z
  .object({
    paging: pagingSchema,
    components: z.array(ProjectSchema),
  })
  .passthrough();

const BranchesListResponseSchema = z
  .object({
    branches: z.array(BranchSchema),
  })
  .passthrough();

const IssuesSearchResponseSchema = z
  .object({
    paging: pagingSchema,
    issues: z.array(IssueSchema),
  })
  .passthrough();

const HotspotsSearchResponseSchema = z
  .object({
    paging: pagingSchema,
    hotspots: z.array(HotspotSchema),
  })
  .passthrough();

const MeasuresComponentResponseSchema = z
  .object({
    component: z
      .object({
        measures: z.array(MeasureSchema),
      })
      .passthrough(),
  })
  .passthrough();

export function parseOrganizationsSearchResponse(raw: unknown): ParseResult<Page<Organization>> {
  const result = OrganizationsSearchResponseSchema.safeParse(raw);
  if (!result.success) return fail(result.error);
  return ok(toPage(result.data.organizations as Organization[], result.data.paging));
}

export function parseProjectsSearchResponse(raw: unknown): ParseResult<Page<Project>> {
  const result = ProjectsSearchResponseSchema.safeParse(raw);
  if (!result.success) return fail(result.error);
  return ok(toPage(result.data.components as Project[], result.data.paging));
}

export function parseBranchesListResponse(raw: unknown): ParseResult<Branch[]> {
  const result = BranchesListResponseSchema.safeParse(raw);
  if (!result.success) return fail(result.error);
  return ok(result.data.branches as Branch[]);
}

export function parseIssuesSearchResponse(raw: unknown): ParseResult<Page<Issue>> {
  const result = IssuesSearchResponseSchema.safeParse(raw);
  if (!result.success) return fail(result.error);
  return ok(toPage(result.data.issues as Issue[], result.data.paging));
}

export function parseHotspotsSearchResponse(raw: unknown): ParseResult<Page<Hotspot>> {
  const result = HotspotsSearchResponseSchema.safeParse(raw);
  if (!result.success) return fail(result.error);
  return ok(toPage(result.data.hotspots as Hotspot[], result.data.paging));
}

export function parseQualityGate(raw: unknown): ParseResult<QualityGate> {
  const result = QualityGateSchema.safeParse(raw);
  if (!result.success) return fail(result.error);
  return ok(result.data as QualityGate);
}

export function parseMeasuresComponentResponse(raw: unknown): ParseResult<Measure[]> {
  const result = MeasuresComponentResponseSchema.safeParse(raw);
  if (!result.success) return fail(result.error);
  return ok(result.data.component.measures as Measure[]);
}

const AuthValidateResponseSchema = z.object({ valid: z.boolean() });

export function parseAuthValidateResponse(raw: unknown): ParseResult<boolean> {
  const result = AuthValidateResponseSchema.safeParse(raw);
  if (!result.success) return fail(result.error);
  return ok(result.data.valid);
}
