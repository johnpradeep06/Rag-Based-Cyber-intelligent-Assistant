"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Shield, Cpu, Filter, Layers, Waypoints } from "lucide-react";
import { API_ENDPOINTS } from "@/lib/api";
import type { KnowledgeSource } from "@/lib/ingestStream";
import IngestPanel from "@/components/admin/IngestPanel";
import SourceList from "@/components/admin/SourceList";

export default function AdminPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [sources, setSources] = useState<KnowledgeSource[]>([]);

    const fetchSources = useCallback(async () => {
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(API_ENDPOINTS.sources, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) setSources(await res.json());
        } catch (error) {
            console.error("Failed to fetch sources", error);
        }
    }, []);

    useEffect(() => {
        const token = localStorage.getItem("token");
        const role = localStorage.getItem("role");
        if (!token || role !== "admin") {
            router.push("/");
        } else {
            setLoading(false);
            fetchSources();
        }
    }, [router, fetchSources]);

    if (loading) {
        return <div className="flex min-h-[100dvh] items-center justify-center bg-canvas text-ink-2">Loading admin…</div>;
    }

    const totalChunks = sources.reduce((n, s) => n + s.chunk_count, 0);

    return (
        <main className="custom-scrollbar flex h-[100dvh] w-full flex-col items-center overflow-y-auto bg-canvas">
            {/* Nav */}
            <div className="sticky top-0 z-50 flex w-full items-center border-b border-line bg-page px-3 py-2.5">
                <div className="flex items-center gap-2 px-1 md:px-3">
                    <button
                        onClick={() => router.push("/")}
                        className="rounded-control p-2 text-ink-3 transition-colors hover:bg-hover hover:text-ink"
                        title="Back to chat"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <span className="flex size-6 items-center justify-center rounded-[7px] bg-accent text-white">
                        <Shield size={13} strokeWidth={2.4} />
                    </span>
                    <span className="text-[14px] font-semibold tracking-tight text-ink">Sentinel</span>
                    <span className="text-ink-3">/</span>
                    <span className="text-[14px] text-ink-2">Knowledge base</span>
                </div>
                <button
                    onClick={() => router.push("/graph")}
                    className="ml-auto mr-1 flex items-center gap-1.5 rounded-control border border-line bg-surface px-2.5 py-1.5 text-[12.5px] font-medium text-ink-2 shadow-btn transition-colors hover:bg-hover hover:text-ink md:mr-3"
                >
                    <Waypoints size={14} className="text-accent-ink" />
                    Graph
                </button>
            </div>

            {/* Content */}
            <div className="flex w-full max-w-5xl flex-1 flex-col gap-6 p-5 md:p-9">
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <h1 className="mb-1 text-[22px] font-semibold tracking-tight text-ink">Knowledge base</h1>
                        <p className="text-[13.5px] text-ink-3">
                            The corpus Sentinel retrieves from. Grow it from files, URLs, APIs, GitHub repos, or curated feeds.
                        </p>
                    </div>
                    <div className="flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-[12.5px] shadow-btn">
                        <Layers size={13} className="text-accent-ink" />
                        <span className="font-medium text-ink">{sources.length}</span>
                        <span className="text-ink-3">source{sources.length === 1 ? "" : "s"}</span>
                        {totalChunks > 0 && (
                            <span className="font-mono text-[11px] text-ink-3">· {totalChunks.toLocaleString()} chunks</span>
                        )}
                    </div>
                </div>

                <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 lg:grid-cols-3">
                    <div className="flex flex-col gap-5 lg:col-span-2">
                        <IngestPanel onIngested={() => fetchSources()} />
                        <SourceList sources={sources} onChanged={fetchSources} />
                    </div>

                    <div className="flex flex-col gap-5">
                        <div className="rounded-card border border-line bg-surface p-5 shadow-card">
                            <h3 className="mb-4 flex items-center gap-2 text-[13.5px] font-medium text-ink">
                                <Cpu size={15} className="text-accent-ink" />
                                Pipeline status
                            </h3>
                            <div className="space-y-2.5 text-[13px]">
                                <div className="flex items-center justify-between">
                                    <span className="text-ink-3">Vector store</span>
                                    <span className="flex items-center gap-1.5 font-medium text-green">
                                        <span className="inline-block size-1.5 rounded-full bg-green" /> Online
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-ink-3">Embeddings</span>
                                    <span className="font-mono text-[12px] text-ink-2">ada-002</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-ink-3">Retrieval</span>
                                    <span className="font-mono text-[12px] text-ink-2">top-4 · ≥ 0.15</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-ink-3">Chunking</span>
                                    <span className="font-mono text-[12px] text-ink-2">1000 / 200</span>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-card border border-line bg-surface p-5 shadow-card">
                            <h3 className="mb-3 flex items-center gap-2 text-[13.5px] font-medium text-ink">
                                <Filter size={15} className="text-ink-3" />
                                How retrieval works
                            </h3>
                            <ol className="space-y-2.5 text-[12.5px] leading-relaxed text-ink-2">
                                {[
                                    "The question is embedded and matched against indexed chunks.",
                                    "Passages above the score threshold become the answer's context.",
                                    "The model answers only from that context, and cites the sources.",
                                ].map((step, i) => (
                                    <li key={i} className="flex gap-2.5">
                                        <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-inset font-mono text-[10px] text-ink-3 shadow-hairline">
                                            {i + 1}
                                        </span>
                                        {step}
                                    </li>
                                ))}
                            </ol>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
