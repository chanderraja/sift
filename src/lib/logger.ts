// SPDX-License-Identifier: MIT

// Logging chokepoint — the only file in src/ and proxy/ that may call
// `console.*` (enforced by ESLint and a CI grep). Every value passes
// through a token-redaction filter on the way out so a stray
// `logger.info({ headers })` or `logger.error('Authorization: Bearer xyz')`
// can't leak credentials into devtools, Sentry-equivalent telemetry, or
// CI logs.
//
// What gets redacted:
//
//   - The token portion of any `Authorization: Bearer …` substring in a
//     logged string.
//   - The value of any object property whose name (case-insensitive)
//     equals `token`, `apiKey`, `secret`, `password`, or `authorization`.
//   - Token-shaped substrings inside any logged string: SonarCloud's
//     `squ_…` / `sqp_…` prefixes, and bare hex runs of 32+ characters.
//
// The redaction recurses into arrays and plain objects, with cycle
// protection via a WeakSet so a self-referencing log argument can't
// stack-overflow.

const TOKEN_FIELD_NAMES = new Set(['token', 'apikey', 'secret', 'password', 'authorization']);

// Bearer-token character set is intentionally tight (RFC 6750-ish: alnum
// plus `_+/=.-`). Stops the redaction from swallowing a trailing comma,
// semicolon, or close-quote that follows the token in a logged sentence.
const BEARER_RE = /(Bearer\s+)[A-Za-z0-9_+/=.-]+/gi;
const TOKEN_LIKE_RE = /\b(squ_[A-Za-z0-9]+|sqp_[A-Za-z0-9]+|[a-fA-F0-9]{32,})\b/g;

const REDACTED = '[REDACTED]';

const redactString = (s: string): string =>
  s.replace(BEARER_RE, `$1${REDACTED}`).replace(TOKEN_LIKE_RE, REDACTED);

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const redactValue = (value: unknown, seen: WeakSet<object> = new WeakSet()): unknown => {
  if (typeof value === 'string') return redactString(value);
  if (value === null || typeof value !== 'object') return value;
  if (seen.has(value)) return value;
  seen.add(value);
  if (Array.isArray(value)) return value.map((v) => redactValue(v, seen));
  if (!isPlainObject(value)) return value;
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) {
    if (TOKEN_FIELD_NAMES.has(k.toLowerCase())) {
      result[k] = REDACTED;
    } else {
      result[k] = redactValue(v, seen);
    }
  }
  return result;
};

const redactArgs = (args: unknown[]): unknown[] => args.map((a) => redactValue(a));

const realConsole = console;

export const logger = {
  debug: (...args: unknown[]): void => {
    realConsole.debug(...redactArgs(args));
  },
  info: (...args: unknown[]): void => {
    realConsole.info(...redactArgs(args));
  },
  warn: (...args: unknown[]): void => {
    realConsole.warn(...redactArgs(args));
  },
  error: (...args: unknown[]): void => {
    realConsole.error(...redactArgs(args));
  },
};
