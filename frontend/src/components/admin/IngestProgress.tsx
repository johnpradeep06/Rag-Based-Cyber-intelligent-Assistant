"use client";

import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import type { IngestState } from "./useIngest";

export default function IngestProgress({ phase, step, progress, error, added }: IngestState) {
    if (phase === "idle") return null;

    const pct = progress && progress.total > 0
        ? Math.min(100, Math.round((progress.done / progress.total) * 100))
        : null;

    if (phase === "error") {
        return (
            <div className="mt-4 flex items-start gap-3 rounded-control border border-red/30 bg-red-tint p-3.5">
                <AlertCircle size={18} className="mt-0.5 shrink-0 text-red" />
                <div>
                    <p className="text-[13px] font-medium text-ink">Ingestion failed</p>
                    <p className="text-[11.5px] break-words text-ink-3">{error}</p>
                </div>
            </div>
        );
    }

    if (phase === "done") {
        const chunks = added.reduce((n, s) => n + s.chunk_count, 0);
        return (
            <div className="mt-4 flex items-start gap-3 rounded-control border border-green/30 bg-green-tint p-3.5">
                <CheckCircle size={18} className="mt-0.5 shrink-0 text-green" />
                <div>
                    <p className="text-[13px] font-medium text-ink">
                        Indexed {added.length} source{added.length === 1 ? "" : "s"} · {chunks} chunks
                    </p>
                    <p className="text-[11.5px] text-ink-3">Sentinel can now retrieve from this.</p>
                </div>
            </div>
        );
    }

    // running
    return (
        <div className="mt-4 rounded-control border border-line bg-inset p-3.5">
            <div className="flex items-center gap-2.5">
                <Loader2 size={16} className="shrink-0 animate-spin text-accent-ink" />
                <span className="text-[12.5px] text-ink-2">{step || "Working…"}</span>
                {progress && (
                    <span className="ml-auto font-mono text-[11px] text-ink-3 tabular-nums">
                        {progress.done}/{progress.total}
                    </span>
                )}
            </div>
            {pct !== null && (
                <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-line">
                    <div
                        className="h-full rounded-full bg-accent transition-[width] duration-300"
                        style={{ width: `${pct}%` }}
                    />
                </div>
            )}
        </div>
    );
}
