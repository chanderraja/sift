// SPDX-License-Identifier: MIT

// vitest-axe@0.1.0 ships its matcher types under the legacy `Vi`
// namespace; Vitest 4 reads `vitest`-module augmentation instead.
// Re-publish the AxeMatchers shape under the namespace Vitest 4 looks
// at so `toHaveNoViolations` is visible in `.toHaveNoViolations()`
// chains throughout the primitive tests.

import 'vitest';
import type { AxeMatchers } from 'vitest-axe';

declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-unused-vars
  interface Assertion<T = unknown> extends AxeMatchers {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}
