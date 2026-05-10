// SPDX-License-Identifier: MIT

/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Self-hoster knob: cold-start storage mode for new visitors. One of
   * 'local' | 'session' | 'cookie' | 'memory'. Defaults to 'local' when
   * unset. A persisted user choice always wins over this default.
   */
  readonly VITE_DEFAULT_STORAGE_MODE?: string;
  /**
   * Self-hoster knob: cold-start SonarCloud region for new visitors.
   * One of 'eu' | 'us'. Defaults to 'eu' when unset. A persisted user
   * choice always wins.
   */
  readonly VITE_DEFAULT_REGION?: string;
}
