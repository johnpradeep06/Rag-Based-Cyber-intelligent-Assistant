"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Copy, Quote, Sparkles } from "lucide-react";

/* ─────────────────────────────────────────────────────────
 * SELECTION ACTIONS — floating bar on text selection.
 *
 * beautifui's registry version renders a pre-baked passage and never
 * touches the real selection, so this is a ground-up build that keeps
 * the same restrained bar: watch `selectionchange` inside the chat
 * transcript, anchor a fixed toolbar to the selection rect.
 * ───────────────────────────────────────────────────────── */

type Pos = { top: number; left: number };

export default function SelectionActions({
  containerSelector = "[data-selectable]",
  onQuote,
  onExplain,
}: {
  containerSelector?: string;
  onQuote: (text: string) => void;
  onExplain: (text: string) => void;
}) {
  const [pos, setPos] = useState<Pos | null>(null);
  const [copied, setCopied] = useState(false);
  const textRef = useRef("");
  const barRef = useRef<HTMLDivElement>(null);

  const hide = useCallback(() => {
    setPos(null);
    setCopied(false);
    textRef.current = "";
  }, []);

  useEffect(() => {
    let raf = 0;

    const evaluate = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) return hide();

      const text = sel.toString().trim();
      if (text.length < 2) return hide();

      const anchor = sel.anchorNode;
      const el = anchor instanceof Element ? anchor : anchor?.parentElement;
      if (!el || !el.closest(containerSelector)) return hide();

      const rect = sel.getRangeAt(0).getBoundingClientRect();
      if (!rect.width && !rect.height) return hide();

      textRef.current = text;
      const top = rect.top - 44;
      setPos({
        top: top < 8 ? rect.bottom + 8 : top,
        left: Math.min(Math.max(rect.left + rect.width / 2, 120), window.innerWidth - 120),
      });
    };

    const onSelectionChange = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(evaluate);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") hide();
    };
    const onDown = (e: MouseEvent) => {
      if (barRef.current?.contains(e.target as Node)) return;
      // let the browser update the selection first
      setTimeout(evaluate, 0);
    };

    document.addEventListener("selectionchange", onSelectionChange);
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("selectionchange", onSelectionChange);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
    };
  }, [containerSelector, hide]);

  if (!pos) return null;

  const act = (fn: (t: string) => void) => {
    const t = textRef.current;
    if (t) fn(t);
    window.getSelection()?.removeAllRanges();
    hide();
  };

  const copy = () => {
    const t = textRef.current;
    if (!t) return;
    navigator.clipboard.writeText(t).then(() => {
      setCopied(true);
      setTimeout(hide, 900);
    });
  };

  return (
    <div
      ref={barRef}
      className="fixed z-[80] flex -translate-x-1/2 items-center gap-0.5 rounded-full
        bg-surface p-1 shadow-overlay"
      style={{ top: pos.top, left: pos.left, animation: "pop-in 140ms cubic-bezier(0.23,1,0.32,1) both" }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <BarButton onClick={copy} label={copied ? "Copied" : "Copy"}>
        {copied ? <Check size={13} className="text-green" /> : <Copy size={13} />}
        {copied ? "Copied" : "Copy"}
      </BarButton>
      <span className="mx-0.5 h-4 w-px bg-line" />
      <BarButton onClick={() => act(onQuote)} label="Quote & ask">
        <Quote size={13} />
        Quote
      </BarButton>
      <BarButton onClick={() => act(onExplain)} label="Explain this">
        <Sparkles size={13} />
        Explain
      </BarButton>
    </div>
  );
}

function BarButton({
  children,
  onClick,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-medium
        text-ink-2 transition-colors duration-100 hover:bg-hover hover:text-ink"
    >
      {children}
    </button>
  );
}
