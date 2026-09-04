"use client";

import { useState } from "react";
import { Braces } from "lucide-react";
import { API_ENDPOINTS } from "@/lib/api";
import { useIngest } from "./useIngest";
import IngestProgress from "./IngestProgress";
import type { KnowledgeSource } from "@/lib/ingestStream";

export default function ApiIngest({ onSource }: { onSource: (s: KnowledgeSource) => void }) {
    const [url, setUrl] = useState("");
    const [jsonPath, setJsonPath] = useState("");
    const [titleKey, setTitleKey] = useState("");
    const [headers, setHeaders] = useState("");
    const [headerErr, setHeaderErr] = useState("");
    const ingest = useIngest(onSource);

    const submit = async () => {
        if (!/^https?:\/\//i.test(url)) return;
        let parsedHeaders: Record<string, string> | undefined;
        if (headers.trim()) {
            try {
                parsedHeaders = JSON.parse(headers);
            } catch {
                setHeaderErr("Headers must be valid JSON");
                return;
            }
        }
        setHeaderErr("");
        await ingest.run(API_ENDPOINTS.ingestApi, {
            json: {
                url: url.trim(),
                json_path: jsonPath.trim(),
                title_key: titleKey.trim() || null,
                headers: parsedHeaders ?? null,
            },
        });
    };

    return (
        <div className="space-y-3">
            <div>
                <label className="mb-1.5 block text-[12.5px] font-medium text-ink-2">Endpoint URL (returns JSON)</label>
                <div className="flex items-center gap-2 rounded-control border border-line bg-field px-3 focus-within:border-line-strong">
                    <Braces size={14} className="shrink-0 text-ink-3" />
                    <input
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://services.nvd.nist.gov/rest/json/cves/2.0?…"
                        className="min-w-0 flex-1 bg-transparent py-2.5 text-[13.5px] text-ink outline-none placeholder:text-ink-3"
                    />
                </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="mb-1.5 block text-[12.5px] font-medium text-ink-2">JSON path to the list</label>
                    <input
                        value={jsonPath}
                        onChange={(e) => setJsonPath(e.target.value)}
                        placeholder="vulnerabilities"
                        className="w-full rounded-control border border-line bg-field px-3 py-2.5 font-mono text-[12.5px] text-ink outline-none focus:border-line-strong"
                    />
                </div>
                <div>
                    <label className="mb-1.5 block text-[12.5px] font-medium text-ink-2">Title field (optional)</label>
                    <input
                        value={titleKey}
                        onChange={(e) => setTitleKey(e.target.value)}
                        placeholder="cveID"
                        className="w-full rounded-control border border-line bg-field px-3 py-2.5 font-mono text-[12.5px] text-ink outline-none focus:border-line-strong"
                    />
                </div>
            </div>
            <div>
                <label className="mb-1.5 block text-[12.5px] font-medium text-ink-2">Headers (optional, JSON)</label>
                <textarea
                    value={headers}
                    onChange={(e) => setHeaders(e.target.value)}
                    rows={2}
                    placeholder={'{ "Authorization": "Bearer …" }'}
                    className="w-full resize-none rounded-control border border-line bg-field px-3 py-2 font-mono text-[12px] text-ink outline-none focus:border-line-strong"
                />
                {headerErr && <p className="mt-1 text-[11px] text-red">{headerErr}</p>}
            </div>
            <div className="flex justify-end">
                <button
                    onClick={submit}
                    disabled={ingest.busy || !/^https?:\/\//i.test(url)}
                    className="rounded-control bg-accent px-4 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    Pull &amp; index
                </button>
            </div>
            <IngestProgress {...ingest} />
        </div>
    );
}
