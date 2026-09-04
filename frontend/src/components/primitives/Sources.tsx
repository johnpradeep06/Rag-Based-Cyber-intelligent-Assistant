"use client";

import { useState } from "react";
import { FileText, Globe } from "lucide-react";
import type { Source } from "@/lib/chatStream";

/* Compact source strip — Google AI-Mode style: a short wrapping row of
 * small chips, first few shown, the rest behind a "+N" toggle. Doc chips
 * expand an inline snippet; web chips open the link. */

const MAX_SHOWN = 4;

const TYPE_TAG: Record<string, string> = {
    attack: "ATT&CK",
    kev: "KEV",
    advisory: "Advisory",
    github: "Repo",
};

function host(url?: string) {
    if (!url) return "";
    try {
        return new URL(url).hostname.replace(/^www\./, "");
    } catch {
        return url;
    }
}

function Favicon({ url }: { url?: string }) {
    const [ok, setOk] = useState(true);
    const h = host(url);
    if (!ok || !h) return <Globe size={12} className="shrink-0 text-ink-3" />;
    return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
            src={`https://www.google.com/s2/favicons?domain=${h}&sz=64`}
            alt=""
            width={12}
            height={12}
            className="size-3 shrink-0 rounded-[3px]"
            onError={() => setOk(false)}
        />
    );
}

export default function Sources({ items }: { items: Source[] }) {
    const [expanded, setExpanded] = useState(false);
    const [openId, setOpenId] = useState<string | null>(null);
    const shown = expanded ? items : items.slice(0, MAX_SHOWN);
    const detail = items.find((s) => s.id === openId) ?? null;

    return (
        <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-0.5 text-[11px] font-medium tracking-wide text-ink-3 uppercase">
                    Sources
                </span>

                {shown.map((s) => {
                    const name =
                        s.kind === "web" ? host(s.url) || s.title : s.title.replace(/\.[^.]+$/, "");
                    const chipClass =
                        "inline-flex max-w-[200px] items-center gap-1.5 rounded-full border border-line bg-surface px-2 py-1 text-[11.5px] text-ink-2 shadow-btn transition-colors hover:bg-hover hover:text-ink";

                    const tag = s.source_type ? TYPE_TAG[s.source_type] : undefined;

                    return s.kind === "web" ? (
                        <a
                            key={s.id}
                            href={s.url}
                            target="_blank"
                            rel="noreferrer"
                            className={chipClass}
                            title={s.title}
                        >
                            <Favicon url={s.url} />
                            {tag && <span className="shrink-0 font-medium text-accent-ink">{tag}</span>}
                            <span className="truncate">{name}</span>
                        </a>
                    ) : (
                        <button
                            key={s.id}
                            type="button"
                            onClick={() => setOpenId((id) => (id === s.id ? null : s.id))}
                            className={`${chipClass} ${openId === s.id ? "bg-hover text-ink" : ""}`}
                            title={s.title}
                        >
                            <FileText size={11} className="shrink-0 text-accent-ink" />
                            {tag && <span className="shrink-0 font-medium text-accent-ink">{tag}</span>}
                            <span className="truncate">{name}</span>
                            {s.page ? (
                                <span className="shrink-0 text-ink-3">p.{s.page}</span>
                            ) : null}
                        </button>
                    );
                })}

                {!expanded && items.length > MAX_SHOWN && (
                    <button
                        type="button"
                        onClick={() => setExpanded(true)}
                        className="rounded-full border border-line bg-surface px-2 py-1 text-[11.5px] text-ink-3 shadow-btn transition-colors hover:bg-hover hover:text-ink"
                    >
                        +{items.length - MAX_SHOWN}
                    </button>
                )}
            </div>

            {detail && (
                <div className="rounded-control border border-line bg-inset px-3 py-2 text-[12px] leading-relaxed text-ink-2">
                    <span className="font-medium text-ink">
                        {detail.title}
                        {detail.page ? ` · p.${detail.page}` : ""}
                    </span>
                    {detail.snippet && <p className="mt-0.5 line-clamp-3">{detail.snippet}</p>}
                </div>
            )}
        </div>
    );
}
