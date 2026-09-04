"use client";

import { useRef, useState } from "react";
import { UploadCloud, FileText, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { API_ENDPOINTS } from "@/lib/api";
import { useIngest } from "./useIngest";
import IngestProgress from "./IngestProgress";
import type { KnowledgeSource } from "@/lib/ingestStream";

const ACCEPT = ".pdf,.docx,.csv,.xlsx,.json,.log,.txt,.md";
const FORMATS = ["PDF", "DOCX", "CSV", "XLSX", "JSON", "LOG", "MD"];

export default function FileIngest({ onSource }: { onSource: (s: KnowledgeSource) => void }) {
    const [files, setFiles] = useState<File[]>([]);
    const [dragging, setDragging] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const ingest = useIngest(onSource);

    const add = (list: FileList | null) => {
        if (list?.length) setFiles((f) => [...f, ...Array.from(list)]);
    };

    const submit = async () => {
        if (!files.length) return;
        const fd = new FormData();
        files.forEach((f) => fd.append("files", f));
        await ingest.run(API_ENDPOINTS.ingestFile, { body: fd });
        setFiles([]);
    };

    return (
        <div>
            <div className="mb-3 flex flex-wrap gap-1">
                {FORMATS.map((f) => (
                    <span key={f} className="rounded-[5px] bg-inset px-1.5 py-0.5 font-mono text-[10px] tracking-wide text-ink-3 shadow-hairline">
                        {f}
                    </span>
                ))}
            </div>

            <div
                className={cn(
                    "flex min-h-[160px] cursor-pointer flex-col items-center justify-center rounded-card border border-dashed p-6 text-center transition-colors",
                    dragging ? "border-accent bg-accent-tint" : "border-line-strong bg-inset hover:bg-hover",
                )}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={(e) => { e.preventDefault(); setDragging(false); }}
                onDrop={(e) => { e.preventDefault(); setDragging(false); add(e.dataTransfer.files); }}
                onClick={() => inputRef.current?.click()}
            >
                <input ref={inputRef} type="file" multiple accept={ACCEPT} className="hidden"
                    onChange={(e) => add(e.target.files)} />
                <div className="mb-2.5 flex size-11 items-center justify-center rounded-[13px] bg-surface text-accent-ink shadow-hairline">
                    <UploadCloud size={20} />
                </div>
                <p className="text-[14px] font-medium text-ink">Drag &amp; drop, or click to browse</p>
                <p className="text-[12px] text-ink-3">Reports, advisories, playbooks, sheets — up to 50&nbsp;MB each</p>
            </div>

            {files.length > 0 && (
                <div className="mt-3 flex flex-col gap-1.5">
                    {files.map((f, i) => (
                        <div key={i} className="flex items-center gap-2.5 rounded-control border border-line bg-inset px-3 py-2">
                            <FileText size={14} className="shrink-0 text-ink-3" />
                            <span className="flex-1 truncate text-[12.5px] text-ink">{f.name}</span>
                            <span className="font-mono text-[11px] text-ink-3">{(f.size / 1024 / 1024).toFixed(2)} MB</span>
                            <button
                                onClick={(e) => { e.stopPropagation(); setFiles((x) => x.filter((_, j) => j !== i)); }}
                                className="rounded p-0.5 text-ink-3 transition-colors hover:bg-hover hover:text-ink"
                            >
                                <X size={13} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <div className="mt-4 flex justify-end">
                <button
                    onClick={submit}
                    disabled={!files.length || ingest.busy}
                    className="flex items-center gap-2 rounded-control bg-accent px-4 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    <UploadCloud size={15} />
                    Index {files.length || ""} file{files.length === 1 ? "" : "s"}
                </button>
            </div>

            <IngestProgress {...ingest} />
        </div>
    );
}
