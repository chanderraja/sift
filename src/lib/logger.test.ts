// SPDX-License-Identifier: MIT

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { logger } from './logger';

const spies = {
  debug: vi.spyOn(console, 'debug').mockImplementation(() => undefined),
  info: vi.spyOn(console, 'info').mockImplementation(() => undefined),
  warn: vi.spyOn(console, 'warn').mockImplementation(() => undefined),
  error: vi.spyOn(console, 'error').mockImplementation(() => undefined),
};

beforeEach(() => {
  for (const s of Object.values(spies)) s.mockClear();
});

afterEach(() => {
  for (const s of Object.values(spies)) s.mockClear();
});

describe('logger — delegation to console.*', () => {
  it.each([
    ['debug', spies.debug],
    ['info', spies.info],
    ['warn', spies.warn],
    ['error', spies.error],
  ] as const)('logger.%s forwards to console.%s', (level, spy) => {
    logger[level]('hello');
    expect(spy).toHaveBeenCalledWith('hello');
  });
});

describe('logger — string redaction', () => {
  it('redacts the token portion of a Bearer Authorization header', () => {
    logger.info('Authorization: Bearer squ_abc123def456');
    expect(spies.info).toHaveBeenCalledWith('Authorization: Bearer [REDACTED]');
  });

  it('handles multiple Bearer tokens in one string', () => {
    logger.info('first=Bearer aaa, second=Bearer bbb');
    expect(spies.info).toHaveBeenCalledWith('first=Bearer [REDACTED], second=Bearer [REDACTED]');
  });

  it('matches Bearer case-insensitively', () => {
    logger.info('bearer squ_xyz');
    expect(spies.info).toHaveBeenCalledWith('bearer [REDACTED]');
  });

  it('redacts squ_ tokens not preceded by Bearer', () => {
    logger.info('token in URL: squ_abcdef0123456789');
    expect(spies.info).toHaveBeenCalledWith('token in URL: [REDACTED]');
  });

  it('redacts sqp_ tokens', () => {
    logger.info('project token: sqp_abc123');
    expect(spies.info).toHaveBeenCalledWith('project token: [REDACTED]');
  });

  it('redacts long hex runs (32+ chars — legacy SonarCloud format)', () => {
    const hex = 'a'.repeat(40);
    logger.info(`legacy token ${hex}`);
    expect(spies.info).toHaveBeenCalledWith('legacy token [REDACTED]');
  });

  it('does not redact short hex runs', () => {
    logger.info('commit deadbeef');
    expect(spies.info).toHaveBeenCalledWith('commit deadbeef');
  });

  it('passes plain strings through unchanged', () => {
    logger.info('nothing to see here');
    expect(spies.info).toHaveBeenCalledWith('nothing to see here');
  });
});

describe('logger — object field redaction', () => {
  it('redacts an object field literally named token', () => {
    logger.info({ token: 'squ_abc', region: 'eu' });
    expect(spies.info).toHaveBeenCalledWith({ token: '[REDACTED]', region: 'eu' });
  });

  it('redacts apiKey, secret, password (lowercase)', () => {
    logger.info({ apiKey: 'k1', secret: 's1', password: 'p1' });
    expect(spies.info).toHaveBeenCalledWith({
      apiKey: '[REDACTED]',
      secret: '[REDACTED]',
      password: '[REDACTED]',
    });
  });

  it('redacts in a case-insensitive way (Token, APIKEY, …)', () => {
    logger.info({ Token: 't', APIKEY: 'k', Authorization: 'Bearer x' });
    expect(spies.info).toHaveBeenCalledWith({
      Token: '[REDACTED]',
      APIKEY: '[REDACTED]',
      Authorization: '[REDACTED]',
    });
  });

  it('does not redact non-sensitive fields', () => {
    logger.info({ region: 'eu', branch: 'main' });
    expect(spies.info).toHaveBeenCalledWith({ region: 'eu', branch: 'main' });
  });

  it('recurses into nested objects', () => {
    logger.info({ outer: { token: 'squ_abc', branch: 'main' } });
    expect(spies.info).toHaveBeenCalledWith({
      outer: { token: '[REDACTED]', branch: 'main' },
    });
  });

  it('recurses into arrays', () => {
    logger.info([{ token: 't1' }, { token: 't2' }]);
    expect(spies.info).toHaveBeenCalledWith([{ token: '[REDACTED]' }, { token: '[REDACTED]' }]);
  });

  it('redacts string values found while recursing (Bearer in nested string)', () => {
    logger.info({ headers: { authorization: 'Bearer squ_abc' } });
    // `authorization` field-level redaction wins regardless of contents.
    expect(spies.info).toHaveBeenCalledWith({ headers: { authorization: '[REDACTED]' } });
  });

  it('passes non-string non-object values through', () => {
    logger.info(42, true, null, undefined);
    expect(spies.info).toHaveBeenCalledWith(42, true, null, undefined);
  });

  it('survives self-referencing objects without stack-overflow', () => {
    interface Cycle {
      name: string;
      self?: Cycle;
    }
    const cyclic: Cycle = { name: 'cyclic' };
    cyclic.self = cyclic;
    expect(() => {
      logger.info(cyclic);
    }).not.toThrow();
    expect(spies.info).toHaveBeenCalledOnce();
  });
});
