"use client";

import { useState } from "react";
import { Crosshair, ShieldAlert, Rss } from "lucide-react";
import { API_ENDPOINTS } from "@/lib/api";
import { useIngest } from "./useIngest";
import IngestProgress from "./IngestProgress";
import type { KnowledgeSource } from "@/lib/ingestStream";

const FEEDS = [
    { id: "mitre_attack", label: "MITRE ATT&CK", sub: "Enterprise matrix — one doc per technique", icon: Crosshair, tone: "text-violet-400" },
    { id: "cisa_advisories", label: "CISA advisories", sub: "Latest advisories from the CISA feed", icon: Rss, tone: "text-blue-400" },
    { id: "cisa_kev", label: "CISA KEV", sub: "Known Exploited Vulnerabilities catalog", icon: ShieldAlert, tone: "text-amber-400" },
] as const;

export default function FeedIngest({ onSource }: { onSource: (s: KnowledgeSource) => void }) {
    const [subtech, setSubtech] = useState(false);
    const [running, setRunning] = useState<string | null>(null);
    const ingest = useIngest(onSource);

    const run = async (feed: string) => {
        setRunning(feed);
        await ingest.run(API_ENDPOINTS.ingestFeed, {
            json: { feed, include_subtechniques: subtech, limit: 25 },
        });
        setRunning(null);
    };

    return (
        <div>
            <div className="flex flex-col gap-2">
                {FEEDS.map((f) => (
                    <div key={f.id} className="flex items-center gap-3 rounded-control border border-line bg-inset px-3.5 py-3">
                        <f.icon size={17} className={`shrink-0 ${f.tone}`} />
                        <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-medium text-ink">{f.label}</p>
                            <p className="text-[11.5px] text-ink-3">{f.sub}</p>
                        </div>
                        <button
                            onClick={() => run(f.id)}
                            disabled={ingest.busy}
                            className="shrink-0 rounded-control border border-line bg-surface px-3 py-1.5 text-[12.5px] font-medium text-ink shadow-btn transition-colors hover:bg-hover disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            {running === f.id ? "Importing…" : "Import"}
                        </button>
                    </div>
                ))}
            </div>

            <label className="mt-3 flex items-center gap-2 text-[12px] text-ink-3">
                <input type="checkbox" checked={subtech} onChange={(e) => setSubtech(e.target.checked)} className="accent-accent" />
                Include ATT&amp;CK sub-techniques (larger import)
            </label>

            <IngestProgress {...ingest} />
        </div>
    );
}
