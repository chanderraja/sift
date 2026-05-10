// SPDX-License-Identifier: MIT

// Toast wrapper around `sonner` (decision recorded in IMPLEMENTATION.md
// Phase 5). Two exports:
//
//   - `Toaster` — mount once at the app root; renders the actual
//     notification stack.
//   - `toast` — a small object with `info` / `success` / `warn` /
//     `error` helpers (the four levels SPEC §16.5 calls out). Each
//     helper takes a message string + optional description.
//
// Sonner is unstyled by default but supports CSS variable theming. We
// pass `theme="dark"` to align with the documented default theme; the
// theme-switching wiring (Phase 11) will swap this dynamically.

import {
  Toaster as SonnerToaster,
  toast as sonnerToast,
  type ToasterProps as SonnerToasterProps,
} from 'sonner';

export type ToasterProps = Omit<SonnerToasterProps, 'theme'> & {
  theme?: 'light' | 'dark' | 'system';
};

export const Toaster = (props: ToasterProps): React.JSX.Element => (
  <SonnerToaster
    theme={props.theme ?? 'dark'}
    position={props.position ?? 'top-right'}
    closeButton
    richColors
    {...props}
  />
);

export interface ToastOptions {
  description?: string;
}

export const toast = {
  info: (message: string, opts?: ToastOptions): string | number => sonnerToast.info(message, opts),
  success: (message: string, opts?: ToastOptions): string | number =>
    sonnerToast.success(message, opts),
  warn: (message: string, opts?: ToastOptions): string | number =>
    sonnerToast.warning(message, opts),
  error: (message: string, opts?: ToastOptions): string | number =>
    sonnerToast.error(message, opts),
};
