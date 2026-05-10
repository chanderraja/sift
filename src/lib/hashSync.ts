// SPDX-License-Identifier: MIT

// URL-hash serialization for the SPA's shareable view state.
//
// Wire format:
//
//   v=1&region=eu&project=acme_widget-service&branch=main&tab=issues&sev=BLOCKER,CRITICAL
//
// The leading `v=1` is the schema version (per IMPLEMENTATION.md gotcha):
// future hash schemas can evolve without breaking shared URLs that older
// clients try to load. Parse rejects any hash whose version isn't the
// current `HASH_VERSION` and returns an empty state — the caller falls
// back to defaults rather than mis-applying a different schema.
//
// This module is the transport layer only — it does not know which keys
// represent selection vs filters vs tab. The store-integration step
// (Phase 4 final commit) maps between domain shapes (severity arrays,
// branded keys, etc.) and the flat string-only `HashState`.

export type HashState = Readonly<Record<string, string>>;

const HASH_VERSION = '1';
const VERSION_KEY = 'v';

export function serialize(state: HashState): string {
  const params = new URLSearchParams();
  params.set(VERSION_KEY, HASH_VERSION);
  for (const [k, v] of Object.entries(state)) {
    if (k === VERSION_KEY) continue;
    params.set(k, v);
  }
  return params.toString();
}

export function parse(hash: string): HashState {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  if (raw.length === 0) return {};

  const params = new URLSearchParams(raw);
  if (params.get(VERSION_KEY) !== HASH_VERSION) return {};

  const result: Record<string, string> = {};
  for (const [k, v] of params.entries()) {
    if (k === VERSION_KEY) continue;
    result[k] = v;
  }
  return result;
}
