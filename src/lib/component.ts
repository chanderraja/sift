// SPDX-License-Identifier: MIT

// Helpers for the SonarCloud `component` field, which arrives as
// `projectKey:path/to/file`.

/**
 * Strip the `projectKey:` prefix so the display path is just
 * `src/foo.ts` rather than `acme_widget:src/foo.ts`.
 */
export const fileFromComponent = (component: string): string => {
  const colon = component.indexOf(':');
  return colon === -1 ? component : component.slice(colon + 1);
};
