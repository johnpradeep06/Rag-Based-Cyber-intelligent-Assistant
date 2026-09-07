"use client";

import { useState } from "react";
import { Globe } from "lucide-react";
import { API_ENDPOINTS } from "@/lib/api";
import { useIngest } from "./useIngest";
import IngestProgress from "./IngestProgress";
import type { KnowledgeSource } from "@/lib/ingestStream";

export default function UrlIngest({ onSource }: { onSource: (s: KnowledgeSource) => void }) {
    const [url, setUrl] = useState("");
    const [crawl, setCrawl] = useState(false);
    const [maxPages, setMaxPages] = useState(20);
    const ingest = useIngest(onSource);

    const submit = async () => {
        if (!/^https?:\/\//i.test(url)) return;
        await ingest.run(API_ENDPOINTS.ingestUrl, {
            json: { url: url.trim(), crawl, max_pages: Math.max(1, Math.min(maxPages, 40)) },
        });
        setUrl("");
    };

    return (
        <div>
            <label className="mb-1.5 block text-[12.5px] font-medium text-ink-2">Advisory / article URL</label>
            <div className="flex gap-2">
                <div className="flex flex-1 items-center gap-2 rounded-control border border-line bg-field px-3 focus-within:border-line-strong">
                    <Globe size={14} className="shrink-0 text-ink-3" />
                    <input
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && submit()}
                        placeholder="https://www.cisa.gov/news-events/cybersecurity-advisories/…"
                        className="min-w-0 flex-1 bg-transparent py-2.5 text-[13.5px] text-ink outline-none placeholder:text-ink-3"
                    />
                </div>
                <button
                    onClick={submit}
                    disabled={ingest.busy || !/^https?:\/\//i.test(url)}
                    className="shrink-0 rounded-control bg-accent px-4 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    {crawl ? "Crawl & index" : "Fetch & index"}
                </button>
            </div>

            <div className="mt-2.5 flex items-center gap-3">
                <label className="flex cursor-pointer items-center gap-2 text-[12px] text-ink-2">
                    <input
                        type="checkbox"
                        checked={crawl}
                        onChange={(e) => setCrawl(e.target.checked)}
                        className="size-3.5 accent-accent"
                    />
                    Crawl linked pages on the same site
                </label>
                {crawl && (
                    <label className="flex items-center gap-1.5 text-[12px] text-ink-3">
                        max
                        <input
                            type="number"
                            min={1}
                            max={40}
                            value={maxPages}
                            onChange={(e) => setMaxPages(Number(e.target.value) || 20)}
                            className="w-14 rounded-control border border-line bg-field px-2 py-1 text-[12px] text-ink outline-none focus:border-line-strong"
                        />
                        pages
                    </label>
                )}
            </div>

            <p className="mt-2 text-[11px] text-ink-3">
                Any HTML page — advisories, write-ups, ATT&amp;CK pages. A{" "}
                <span className="font-mono">cve.org</span> / <span className="font-mono">nvd.nist.gov</span> link
                pulls the structured record from the CVE API.
            </p>
            <IngestProgress {...ingest} />
        </div>
    );
}
