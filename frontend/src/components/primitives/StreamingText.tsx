"use client";

import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import CodeBlock from "@/components/primitives/CodeBlock";

/* ─────────────────────────────────────────────────────────
 * STREAMING TEXT — markdown answer with a live caret.
 *
 * Typographic rhythm tuned to match ChatGPT's assistant message:
 * 16px body, ~1.75 leading, generous paragraph gaps, clear heading
 * steps, roomy lists, subtle inline code. `.stream-caret` /
 * `caret-blink` come from foundation.css.
 * ───────────────────────────────────────────────────────── */

const components: Components = {
  p: (props) => <p className="my-5 first:mt-0 last:mb-0" {...props} />,

  ul: (props) => (
    <ul className="my-5 list-disc space-y-2 pl-6 first:mt-0 last:mb-0 marker:text-ink-3" {...props} />
  ),
  ol: (props) => (
    <ol className="my-5 list-decimal space-y-2 pl-6 first:mt-0 last:mb-0 marker:text-ink-3" {...props} />
  ),
  li: (props) => (
    <li className="pl-1 [&>ol]:my-2 [&>p]:my-0 [&>ul]:my-2" {...props} />
  ),

  h1: (props) => <h1 className="mt-7 mb-3 text-[1.45em] font-semibold text-ink first:mt-0" {...props} />,
  h2: (props) => <h2 className="mt-7 mb-3 text-[1.22em] font-semibold text-ink first:mt-0" {...props} />,
  h3: (props) => <h3 className="mt-6 mb-2 text-[1.08em] font-semibold text-ink first:mt-0" {...props} />,
  h4: (props) => <h4 className="mt-5 mb-2 text-[1em] font-semibold text-ink first:mt-0" {...props} />,

  a: (props) => (
    <a
      className="font-medium text-accent-ink underline decoration-accent-ink/30 underline-offset-2 transition-colors hover:decoration-accent-ink"
      target="_blank"
      rel="noreferrer"
      {...props}
    />
  ),
  strong: (props) => <strong className="font-semibold text-ink" {...props} />,
  em: (props) => <em className="italic" {...props} />,

  blockquote: (props) => (
    <blockquote className="my-5 border-l-2 border-line-strong pl-4 text-ink-2" {...props} />
  ),
  hr: () => <hr className="my-7 border-line" />,

  table: (props) => (
    <div className="my-5 w-full overflow-x-auto rounded-card border border-line">
      <table className="w-full border-collapse text-left text-[0.92em]" {...props} />
    </div>
  ),
  thead: (props) => <thead className="bg-inset" {...props} />,
  th: (props) => (
    <th className="border-b border-line px-3 py-2 font-semibold text-ink" {...props} />
  ),
  td: (props) => <td className="border-b border-line px-3 py-2 align-top text-ink-2" {...props} />,

  code({ className, children, ...props }) {
    const match = /language-(\w+)/.exec(className || "");
    if (!match) {
      return (
        <code
          className="rounded-[5px] border border-line/70 bg-inset px-[0.4em] py-[0.15em] font-mono text-[0.86em] text-ink"
          {...props}
        >
          {children}
        </code>
      );
    }
    const raw = String(children).replace(/\n$/, "");
    return (
      <div className="my-5 first:mt-0 last:mb-0">
        <CodeBlock lines={raw.split("\n")} code={raw} filename={match[1]} />
      </div>
    );
  },
};

export default function StreamingText({
  text,
  streaming = false,
}: {
  text: string;
  streaming?: boolean;
}) {
  return (
    <div className="text-[16.5px] leading-[1.75] text-ink">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {text}
      </ReactMarkdown>
      {streaming && <span className="stream-caret is-streaming" aria-hidden />}
    </div>
  );
}
