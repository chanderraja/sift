// SPDX-License-Identifier: MIT

import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuthStore } from '../../app/stores';

import { useValidateAuthEffect } from './useValidateAuthEffect';

const Mount = (): null => {
  useValidateAuthEffect();
  return null;
};

// Replace `validate` on the store with a spy so the assertion is
// stable regardless of Zustand's setState merge semantics. Restored
// in afterEach.
const installValidateSpy = (): ReturnType<typeof vi.fn> => {
  const spy = vi.fn().mockResolvedValue(undefined);
  useAuthStore.setState({ validate: spy });
  return spy;
};

const reset = (): void => {
  useAuthStore.setState({ token: '', region: 'eu', validation: 'idle' });
};

describe('useValidateAuthEffect', () => {
  beforeEach(() => {
    reset();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    reset();
  });

  it('does not validate while the token is empty', () => {
    const validate = installValidateSpy();
    render(<Mount />);
    act(() => {
      vi.advanceTimersByTime(2_000);
    });
    expect(validate).not.toHaveBeenCalled();
  });

  it('validates 250ms after the token becomes non-empty', () => {
    const validate = installValidateSpy();
    render(<Mount />);
    act(() => {
      useAuthStore.setState({ token: 'squ_abc' });
    });
    expect(validate).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(249);
    });
    expect(validate).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(validate).toHaveBeenCalledTimes(1);
  });

  it('debounces: a second token change inside the window collapses to one call', () => {
    const validate = installValidateSpy();
    render(<Mount />);
    act(() => {
      useAuthStore.setState({ token: 'squ_a' });
    });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    act(() => {
      useAuthStore.setState({ token: 'squ_ab' });
    });
    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(validate).toHaveBeenCalledTimes(1);
  });

  it('region change retriggers validate', () => {
    useAuthStore.setState({ token: 'squ_abc' });
    const validate = installValidateSpy();
    render(<Mount />);
    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(validate).toHaveBeenCalledTimes(1);
    act(() => {
      useAuthStore.setState({ region: 'us' });
    });
    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(validate).toHaveBeenCalledTimes(2);
  });
});
