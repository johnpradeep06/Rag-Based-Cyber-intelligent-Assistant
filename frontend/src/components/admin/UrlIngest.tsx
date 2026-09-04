"use client";

import { useState } from "react";
import { Globe } from "lucide-react";
import { API_ENDPOINTS } from "@/lib/api";
import { useIngest } from "./useIngest";
import IngestProgress from "./IngestProgress";
import type { KnowledgeSource } from "@/lib/ingestStream";

export default function UrlIngest({ onSource }: { onSource: (s: KnowledgeSource) => void }) {
    const [url, setUrl] = useState("");
    const ingest = useIngest(onSource);

    const submit = async () => {
        if (!/^https?:\/\//i.test(url)) return;
        await ingest.run(API_ENDPOINTS.ingestUrl, { json: { url: url.trim() } });
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
                    Fetch &amp; index
                </button>
            </div>
            <p className="mt-2 text-[11px] text-ink-3">Any HTML page — CISA / vendor advisories, CVE write-ups, ATT&amp;CK pages.</p>
            <IngestProgress {...ingest} />
        </div>
    );
}
