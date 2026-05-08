// SPDX-License-Identifier: MIT

// Domain types for the SonarCloud Web API V1, per ARCHITECTURE.md §3.
//
// Branded primitives below prevent cross-assignment of identifier types
// across the codebase: a function expecting a `ProjectKey` cannot accept an
// `IssueKey` even though both are strings at runtime.

// === Branded primitive types ===

/** A SonarCloud project key, e.g. `"acme_widget-service"`. */
export type ProjectKey = string & { readonly __brand: 'ProjectKey' };

/** A SonarCloud issue key, e.g. `"AYx8K1pQ-2zR4Mv"`. */
export type IssueKey = string & { readonly __brand: 'IssueKey' };

/** A SonarCloud rule key, e.g. `"typescript:S6571"`. */
export type RuleKey = string & { readonly __brand: 'RuleKey' };

/** A SonarCloud organization key, e.g. `"acme"`. */
export type OrgKey = string & { readonly __brand: 'OrgKey' };

// === Domain enum unions ===

/** Issue severity levels per SonarCloud V1. */
export type Severity = 'BLOCKER' | 'CRITICAL' | 'MAJOR' | 'MINOR' | 'INFO';

/** Issue type per SonarCloud V1. */
export type IssueType = 'BUG' | 'VULNERABILITY' | 'CODE_SMELL';

/** Issue lifecycle states per SonarCloud V1. */
export type Status = 'OPEN' | 'CONFIRMED' | 'REOPENED' | 'RESOLVED' | 'CLOSED';

/** Issue resolution; `null` means unresolved. */
export type Resolution = 'FALSE-POSITIVE' | 'WONTFIX' | 'FIXED' | 'REMOVED' | null;
