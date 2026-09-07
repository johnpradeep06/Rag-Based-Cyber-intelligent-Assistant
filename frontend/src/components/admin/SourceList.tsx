"use client";

import { useState } from "react";
import { Trash2, Database, FileText, Globe, Crosshair, ShieldAlert, Braces, Github } from "lucide-react";
import { API_ENDPOINTS } from "@/lib/api";
import type { KnowledgeSource } from "@/lib/ingestStream";

const META: Record<string, { label: string; tone: string; icon: typeof FileText }> = {
    pdf: { label: "PDF", tone: "text-red bg-red/12", icon: FileText },
    docx: { label: "DOCX", tone: "text-red bg-red/12", icon: FileText },
    text: { label: "TEXT", tone: "text-ink-2 bg-inset", icon: FileText },
    log: { label: "LOG", tone: "text-ink-2 bg-inset", icon: FileText },
    csv: { label: "CSV", tone: "text-emerald-400 bg-emerald-400/12", icon: Braces },
    xlsx: { label: "XLSX", tone: "text-emerald-400 bg-emerald-400/12", icon: Braces },
    json: { label: "JSON", tone: "text-emerald-400 bg-emerald-400/12", icon: Braces },
    url: { label: "URL", tone: "text-blue-400 bg-blue-400/12", icon: Globe },
    advisory: { label: "ADVISORY", tone: "text-blue-400 bg-blue-400/12", icon: ShieldAlert },
    github: { label: "REPO", tone: "text-ink-2 bg-inset", icon: Github },
    attack: { label: "ATT&CK", tone: "text-violet-400 bg-violet-400/12", icon: Crosshair },
    kev: { label: "KEV", tone: "text-amber-400 bg-amber-400/12", icon: ShieldAlert },
    cve: { label: "CVE", tone: "text-amber-400 bg-amber-400/12", icon: ShieldAlert },
};

export default function SourceList({
    sources,
    onChanged,
}: {
    sources: KnowledgeSource[];
    onChanged: () => void;
}) {
    const [pending, setPending] = useState<number | null>(null);

    const remove = async (s: KnowledgeSource) => {
        if (!window.confirm(`Remove "${s.title}" and its ${s.chunk_count} chunks from the knowledge base?`)) return;
        setPending(s.id);
        try {
            const token = localStorage.getItem("token");
            await fetch(API_ENDPOINTS.deleteSource(s.id), {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });
            onChanged();
        } finally {
            setPending(null);
        }
    };

    return (
        <div className="flex min-h-[240px] flex-1 flex-col rounded-card border border-line bg-surface shadow-card">
            <div className="flex items-center gap-2 border-b border-line px-5 py-3.5">
                <Database size={15} className="text-ink-3" />
                <h3 className="text-[13.5px] font-medium text-ink">Knowledge sources</h3>
                {sources.length > 0 && (
                    <span className="ml-auto rounded-full bg-inset px-1.5 py-0.5 font-mono text-[11px] text-ink-3 shadow-hairline tabular-nums">
                        {sources.length}
                    </span>
                )}
            </div>

            {sources.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-1.5 px-4 py-10 text-center">
                    <span className="mb-1 flex size-9 items-center justify-center rounded-control bg-inset text-ink-3 shadow-hairline">
                        <Database size={16} />
                    </span>
                    <p className="text-[13.5px] font-medium text-ink">No sources indexed yet</p>
                    <p className="text-[12px] text-ink-3">Use a channel above to grow the knowledge base.</p>
                </div>
            ) : (
                <div className="custom-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto p-1.5">
                    {sources.map((s) => {
                        const m = META[s.source_type] ?? META.text;
                        const Icon = m.icon;
                        const link = s.ref?.startsWith("http") ? s.ref : null;
                        return (
                            <div key={s.id} className="group flex items-center justify-between gap-3 rounded-control px-3 py-2.5 transition-colors hover:bg-hover">
                                <div className="flex min-w-0 items-center gap-3">
                                    <span className={`flex size-8 shrink-0 items-center justify-center rounded-[8px] ${m.tone}`}>
                                        <Icon size={14} />
                                    </span>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <span className={`rounded-[4px] px-1 py-px font-mono text-[9px] font-semibold tracking-wide ${m.tone}`}>
                                                {m.label}
                                            </span>
                                            {link ? (
                                                <a href={link} target="_blank" rel="noreferrer" className="truncate text-[13px] font-medium text-ink hover:text-accent-ink">
                                                    {s.title}
                                                </a>
                                            ) : (
                                                <span className="truncate text-[13px] font-medium text-ink">{s.title}</span>
                                            )}
                                        </div>
                                        <p className="font-mono text-[11px] text-ink-3">
                                            {s.origin} · {s.chunk_count} chunk{s.chunk_count === 1 ? "" : "s"}
                                            {s.created_at ? ` · ${new Date(s.created_at).toLocaleDateString()}` : ""}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => remove(s)}
                                    disabled={pending === s.id}
                                    className="shrink-0 rounded-control p-1.5 text-ink-3 opacity-0 transition-all hover:bg-red-tint hover:text-red group-hover:opacity-100 disabled:opacity-40"
                                    title="Remove source"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
