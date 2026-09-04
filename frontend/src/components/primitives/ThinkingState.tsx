"use client";

import { useLayoutEffect, useRef, useState } from "react";

/* ─────────────────────────────────────────────────────────
 * THINKING — expandable agent trace.
 *
 * Forked from beautifui's demo (which cycled hardcoded rows on a timer)
 * to render a live trace: pipeline `steps` + streamed model `reasoning`.
 * ───────────────────────────────────────────────────────── */

export type ThinkStep = { id: string; label: string; state: "active" | "done" };

export default function ThinkingState({
  steps,
  reasoning,
  working,
}: {
  steps: ThinkStep[];
  reasoning?: string;
  working: boolean;
}) {
  const [manualExpanded, setManualExpanded] = useState<boolean | null>(null);
  const expanded = manualExpanded ?? working;

  const traceRef = useRef<HTMLDivElement>(null);
  const [lineHeight, setLineHeight] = useState(0);
  useLayoutEffect(() => {
    if (traceRef.current) setLineHeight(traceRef.current.offsetHeight);
  }, [steps, reasoning, expanded, working]);

  const hasBody = steps.length > 0 || !!reasoning;

  return (
    <div
      className="flex w-full flex-col"
      style={{
        minHeight: working || expanded ? 40 : undefined,
        transition: "min-height 400ms cubic-bezier(0.23,1,0.32,1)",
      }}
    >
      {/* header */}
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setManualExpanded((c) => !(c ?? working))}
        className="-mx-1.5 flex w-fit items-center gap-2 rounded-control px-1.5 py-1
          transition-colors duration-100 hover:bg-hover-2"
      >
        {/* hooded-figure glyph — the assistant's mark.
         * idle: a slow periodic tilt; thinking: fast red blink + pulse. */}
        <svg
          aria-hidden
          width="19" height="19" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
          style={{
            color: working ? "var(--red)" : "var(--ink-3)",
            transformOrigin: "50% 62%",
            animation: working
              ? "hood-alert 0.85s ease-in-out infinite"
              : "hood-idle 7s ease-in-out infinite",
          }}
        >
          <path d="M4.5 19C4.5 12 7.5 6.5 12 6.5S19.5 12 19.5 19" />
          <path d="M4 19h16" />
          {/* eyes stay red at all times; the hood is grey when idle, red while thinking */}
          <path d="M8.1 12.2 10.9 13.6" stroke="var(--red)" />
          <path d="M15.9 12.2 13.1 13.6" stroke="var(--red)" />
        </svg>
        <span role="status" className="contents">
          {working ? (
            <span
              className="bg-clip-text text-[13px] font-medium whitespace-nowrap text-transparent"
              style={{
                backgroundImage:
                  "linear-gradient(90deg, var(--ink-3) 35%, var(--ink) 50%, var(--ink-3) 65%)",
                backgroundSize: "200% 100%",
                animation: "shimmer-text 1.4s linear infinite",
              }}
            >
              Thinking
            </span>
          ) : (
            <span
              className="text-[13px] font-medium whitespace-nowrap text-ink-2"
              style={{ animation: "fade-in 350ms ease-out both" }}
            >
              Thought it through
            </span>
          )}
        </span>
        {hasBody && (
          <svg
            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)"
            strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
            className="transition-transform duration-300"
            style={{ transform: expanded ? "rotate(180deg)" : "rotate(0)" }}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        )}
      </button>

      {/* expandable trace */}
      <div
        className="grid transition-[grid-template-rows,opacity] duration-400"
        style={{
          gridTemplateRows: expanded && hasBody ? "1fr" : "0fr",
          opacity: expanded && hasBody ? 1 : 0,
          transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)",
        }}
      >
        <div className="overflow-hidden">
          <div className="relative mt-1 ml-[5px] pl-4">
            <span
              aria-hidden
              className="absolute left-[3px] w-px bg-line"
              style={{
                top: -8,
                height: lineHeight ? lineHeight - 2 : 0,
                transition: "height 500ms cubic-bezier(0.23,1,0.32,1)",
              }}
            />
            <div ref={traceRef} className="flex flex-col gap-1 py-1">
              {steps.map((step, i) => (
                <div
                  key={step.id + i}
                  className="flex min-h-7 w-full items-center gap-2 rounded-[6px] px-1.5 py-0.5 text-left"
                  style={{ animation: `fade-up 320ms cubic-bezier(0.23,1,0.32,1) ${i * 60}ms both` }}
                >
                  {step.state === "done" ? (
                    <svg
                      width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--green)"
                      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"
                    >
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  ) : (
                    <span
                      className="size-3 shrink-0 rounded-full border-[1.5px] border-line-strong border-t-ink-2"
                      style={{ animation: "spin 700ms linear infinite" }}
                    />
                  )}
                  <span className="min-w-0 truncate text-[12.5px] font-medium text-ink">
                    {step.label}
                  </span>
                </div>
              ))}

              {reasoning && (
                <div
                  className="mt-0.5 px-1.5 text-[12.5px] leading-relaxed whitespace-pre-wrap text-ink-2"
                  style={{ animation: "fade-up 320ms cubic-bezier(0.23,1,0.32,1) both" }}
                >
                  {reasoning}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
