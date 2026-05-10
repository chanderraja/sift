// SPDX-License-Identifier: MIT

import { afterAll, afterEach, beforeAll, expect } from 'vitest';
import * as axeMatchers from 'vitest-axe/matchers';

import '@testing-library/jest-dom/vitest';

import { server } from './msw';

// Phase 5 primitives are required to be axe-clean — every primitive
// test asserts `expect(await axe(container)).toHaveNoViolations()`. The
// matcher is registered at runtime here; TypeScript augmentation lives
// in `tests/vitest-axe.d.ts` (vitest-axe 0.1.0 ships its types under
// the legacy `Vi` namespace which Vitest 4 no longer reads).
expect.extend(axeMatchers);

// Boot the MSW request-interception server once per test run. Tests that
// need bespoke responses should layer one-off handlers via `server.use(...)`;
// `resetHandlers` after each test wipes those overlays so suite order does
// not affect outcomes. `onUnhandledRequest: 'error'` makes any unmocked
// network call (including a stray fetch to `sonarcloud.io`) fail loudly
// rather than silently leak — the project's no-live-API rule from CLAUDE.md.
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});
afterEach(() => {
  server.resetHandlers();
});
afterAll(() => {
  server.close();
});
