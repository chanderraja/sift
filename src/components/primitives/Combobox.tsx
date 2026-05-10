// SPDX-License-Identifier: MIT

// Combobox primitive — search-as-you-type listbox composing
// @radix-ui/react-popover with an Input + a filtered list. Used by the
// project picker (Phase 7); other type-ahead surfaces can mount the
// same primitive.
//
// Filtering: by default the primitive filters internally on `label`
// (case-insensitive `includes`). When the option list is large enough
// that server-side filtering is preferable (per ARCHITECTURE.md
// Phase 7 gotcha — > 500 items), the caller passes `onQueryChange` and
// the primitive defers filtering: it just emits the query, the caller
// updates `options`, and the primitive renders whatever it gets.
//
// Keyboard: arrow keys move the highlight, Enter selects, Escape
// closes. The keyboard handlers live on the search Input so the
// listbox doesn't need its own focus.

import * as RadixPopover from '@radix-ui/react-popover';
import clsx from 'clsx';
import { Check, ChevronDown } from 'lucide-react';
import type { KeyboardEvent, ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { Input } from './Input';

export interface ComboboxOption {
  value: string;
  label: string;
}

export interface ComboboxProps {
  value?: string;
  onValueChange?: (value: string) => void;
  options: readonly ComboboxOption[];
  /**
   * Controlled query. When set, the primitive does NOT filter
   * internally; the caller listens to onQueryChange and updates the
   * `options` array. When omitted, the primitive filters internally on
   * `label`.
   */
  query?: string;
  onQueryChange?: (q: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
}

const triggerClasses =
  'inline-flex h-8 w-full min-w-[10rem] items-center justify-between gap-2 rounded ' +
  'border border-border bg-bg-elevated px-3 text-xs text-text-primary ' +
  'data-[placeholder]:text-text-tertiary ' +
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ' +
  'focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50';

const contentClasses =
  'z-50 min-w-[var(--radix-popover-trigger-width)] overflow-hidden rounded ' +
  'border border-border bg-bg-elevated shadow-md';

const optionClasses =
  'flex h-7 cursor-pointer items-center gap-2 rounded-sm px-2 text-xs text-text-primary ' +
  'aria-selected:bg-bg-surface-hover data-[active]:bg-bg-surface-hover';

export function Combobox({
  value,
  onValueChange,
  options,
  query: externalQuery,
  onQueryChange,
  placeholder = 'Select…',
  searchPlaceholder = 'Search…',
  emptyText = 'No matches.',
  disabled,
  className,
  'aria-label': ariaLabel,
}: ComboboxProps): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [internalQuery, setInternalQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const query = externalQuery ?? internalQuery;

  const visibleOptions = useMemo(() => {
    if (onQueryChange !== undefined) return options;
    if (query.length === 0) return options;
    const q = query.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query, onQueryChange]);

  // Clamp the highlight at render time rather than re-syncing via a
  // separate effect — keeps the active index inside the visible range
  // when the option list shrinks (e.g. typing 'xyz' narrows to zero).
  const clampedActive =
    visibleOptions.length === 0 ? 0 : Math.min(activeIndex, visibleOptions.length - 1);

  // Focus the search input when the popover opens.
  useEffect(() => {
    if (open) {
      // requestAnimationFrame so Radix has finished mounting the content
      // before we call focus(). Without it, jsdom + StrictMode dispatch
      // ordering loses the focus.
      const id = requestAnimationFrame(() => inputRef.current?.focus());
      return () => {
        cancelAnimationFrame(id);
      };
    }
    return undefined;
  }, [open]);

  const selected = options.find((o) => o.value === value);

  const setQuery = (q: string): void => {
    if (onQueryChange !== undefined) onQueryChange(q);
    else setInternalQuery(q);
  };

  const selectOption = (option: ComboboxOption): void => {
    onValueChange?.(option.value);
    setOpen(false);
    setQuery('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (visibleOptions.length === 0) return;
      setActiveIndex((i) => (i + 1) % visibleOptions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (visibleOptions.length === 0) return;
      setActiveIndex((i) => (i - 1 + visibleOptions.length) % visibleOptions.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = visibleOptions[clampedActive];
      if (target !== undefined) selectOption(target);
    } else if (e.key === 'Escape') {
      // Radix handles close-on-Escape; nothing to do.
    }
  };

  const triggerLabel: ReactNode =
    selected !== undefined ? (
      selected.label
    ) : (
      <span className="text-text-tertiary">{placeholder}</span>
    );

  return (
    <RadixPopover.Root open={open} onOpenChange={setOpen}>
      <RadixPopover.Trigger
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        className={clsx(triggerClasses, className)}
      >
        <span className="truncate">{triggerLabel}</span>
        <ChevronDown className="h-3.5 w-3.5 text-text-tertiary" aria-hidden="true" />
      </RadixPopover.Trigger>
      <RadixPopover.Portal>
        <RadixPopover.Content
          align="start"
          sideOffset={4}
          className={contentClasses}
          // Don't auto-focus the first child — we route focus to the
          // search Input via the effect above so typing starts working
          // immediately.
          onOpenAutoFocus={(e) => {
            e.preventDefault();
          }}
        >
          <div className="border-b border-border-subtle p-2">
            <Input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
              }}
              onKeyDown={handleKeyDown}
              placeholder={searchPlaceholder}
              aria-label={`${ariaLabel ?? 'Combobox'} search`}
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          <ul role="listbox" aria-label={ariaLabel} className="max-h-64 overflow-y-auto p-1">
            {visibleOptions.length === 0 ? (
              <li className="px-2 py-1 text-2xs text-text-tertiary">{emptyText}</li>
            ) : (
              visibleOptions.map((option, i) => (
                // Keyboard activation lives on the search input (arrow
                // keys + Enter against the highlighted option) — that's
                // the documented combobox pattern, so the click-only
                // <li> is correct here.
                // eslint-disable-next-line jsx-a11y/click-events-have-key-events
                <li
                  key={option.value}
                  role="option"
                  aria-selected={option.value === value}
                  data-active={i === clampedActive || undefined}
                  onMouseEnter={() => {
                    setActiveIndex(i);
                  }}
                  onMouseDown={(e) => {
                    // Pointerdown on a list item would steal focus from
                    // the search input — preventDefault keeps the input
                    // focused so Enter still works after a hover-then-
                    // click sequence.
                    e.preventDefault();
                  }}
                  onClick={() => {
                    selectOption(option);
                  }}
                  className={optionClasses}
                >
                  <span className="flex h-3.5 w-3.5 items-center justify-center">
                    {option.value === value ? (
                      <Check className="h-3 w-3 text-accent" aria-hidden="true" />
                    ) : null}
                  </span>
                  <span className="truncate">{option.label}</span>
                </li>
              ))
            )}
          </ul>
        </RadixPopover.Content>
      </RadixPopover.Portal>
    </RadixPopover.Root>
  );
}
