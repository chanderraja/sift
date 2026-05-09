// SPDX-License-Identifier: MIT

import { afterAll, afterEach, beforeAll } from 'vitest';

import '@testing-library/jest-dom/vitest';

import { server } from './msw';

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
