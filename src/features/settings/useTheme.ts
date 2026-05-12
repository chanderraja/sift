// SPDX-License-Identifier: MIT

import { useEffect } from 'react';

import { usePrefsStore } from '../../app/stores';

const DARK_MEDIA = '(prefers-color-scheme: dark)';

export function useTheme(): void {
  const theme = usePrefsStore((s) => s.theme);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      return;
    }
    if (theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
      return;
    }
    // 'system': follow the OS preference and react to changes.
    const mq = window.matchMedia(DARK_MEDIA);
    const apply = (): void => {
      document.documentElement.setAttribute('data-theme', mq.matches ? 'dark' : 'light');
    };
    apply();
    mq.addEventListener('change', apply);
    return () => {
      mq.removeEventListener('change', apply);
    };
  }, [theme]);
}
