"use client";

import { useState } from "react";
import GlideMenu from "@/components/primitives/GlideMenu";

/* ─────────────────────────────────────────────────────────
 * SEARCH — command search with live filtering.
 *
 * Forked from beautifui's demo (mock string list, clicking a row
 * only refilled the input) to take real `{id,label}` items and an
 * `onSelect` callback.
 * ───────────────────────────────────────────────────────── */

export type SearchItem = { id: number; label: string };

export type SearchListLabels = {
  placeholder: string;
  ariaLabel: string;
  emptyTitle: string;
  emptyHint: string;
};

const LABELS: SearchListLabels = {
  placeholder: "Search chats…",
  ariaLabel: "Search chats",
  emptyTitle: "No chats found",
  emptyHint: "Try a different word from the chat title",
};

export default function SearchList({
  items,
  labels = LABELS,
  onSelect,
  autoFocus = true,
}: {
  items: SearchItem[];
  labels?: SearchListLabels;
  onSelect?: (id: number) => void;
  autoFocus?: boolean;
}) {
  const [query, setQuery] = useState("");
  const results = query
    ? items.filter((i) => i.label.toLowerCase().includes(query.toLowerCase()))
    : items.slice(0, 8);
  const empty = query.length > 0 && results.length === 0;

  return (
    <div className="flex w-full flex-col items-stretch">
      <div className="w-full overflow-hidden rounded-card bg-surface shadow-raised">
        {/* input row */}
        <div className="flex h-11 items-center gap-2 border-b border-line px-3">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth="2" strokeLinecap="round" className="shrink-0">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
          <input
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus={autoFocus}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && results[0]) onSelect?.(results[0].id);
            }}
            placeholder={labels.placeholder}
            aria-label={labels.ariaLabel}
            className="min-w-0 flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-3"
          />
          {query && (
            <button
              aria-label="Clear search"
              type="button"
              onClick={() => setQuery("")}
              className="flex size-6 items-center justify-center rounded-full text-ink-3
                transition-colors duration-100 hover:bg-line/70 hover:text-ink"
              style={{ animation: "fade-in 150ms ease-out both" }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* results / empty state */}
        {empty ? (
          <div className="flex flex-col items-center justify-center gap-1 px-4 py-8" style={{ animation: "fade-in 250ms ease-out both" }}>
            <span className="mb-1.5 flex size-8 items-center justify-center rounded-control bg-inset text-ink-3 shadow-hairline">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.3-4.3" />
              </svg>
            </span>
            <span className="text-[13px] font-medium text-ink">{labels.emptyTitle}</span>
            <span className="text-[12px] text-ink-3">{labels.emptyHint}</span>
          </div>
        ) : (
          <div className="max-h-72 overflow-y-auto p-1 custom-scrollbar">
            <GlideMenu className="flex flex-col gap-px" highlightClassName="inset-x-0 rounded-[6px] bg-hover">
              {results.map((item) => (
                <button
                  key={item.id}
                  data-menu-row
                  type="button"
                  onClick={() => onSelect?.(item.id)}
                  className="relative z-10 flex h-8 w-full items-center rounded-[6px] px-2 text-left text-[13px] text-ink"
                  style={{ animation: "fade-in 200ms ease-out both" }}
                >
                  <span className="truncate">{item.label}</span>
                </button>
              ))}
            </GlideMenu>
          </div>
        )}
      </div>
    </div>
  );
}
