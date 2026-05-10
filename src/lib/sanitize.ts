// SPDX-License-Identifier: MIT

// Input-boundary sanitisation per ADR-005.
//
// `cleanToken` strips any character outside printable ASCII (U+0021 to
// U+007E). The reason this exists is empirical: during the CORS spike,
// pasting a token from the browser's address bar / a wiki / a terminal
// frequently introduced invisible Unicode (zero-width space, NBSP, BOM,
// smart quotes, RTL marks) that caused the Fetch API to throw
// `TypeError: String contains non ISO-8859-1 code point` *before* the
// request left the browser. The error didn't reveal the cause; we
// diagnosed it by hex inspection. Stripping at the input boundary
// guarantees any token that makes it into a request header is byte-safe.
//
// `escapeForDisplay` HTML-escapes user-facing strings (issue messages,
// rule descriptions, etc.). The five required characters per the HTML
// spec, with `&` first so subsequent substitutions don't double-encode.

const PRINTABLE_ASCII_RE = /[^!-~]/g;

export function cleanToken(raw: string): string {
  return raw.replace(PRINTABLE_ASCII_RE, '');
}

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

const HTML_ESCAPE_RE = /[&<>"']/g;

export function escapeForDisplay(text: string): string {
  return text.replace(HTML_ESCAPE_RE, (ch) => HTML_ESCAPES[ch] ?? ch);
}
