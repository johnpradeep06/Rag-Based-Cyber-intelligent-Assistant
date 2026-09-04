"use client";

import { useState } from "react";
import { Github } from "lucide-react";
import { API_ENDPOINTS } from "@/lib/api";
import { useIngest } from "./useIngest";
import IngestProgress from "./IngestProgress";
import type { KnowledgeSource } from "@/lib/ingestStream";

export default function GithubIngest({ onSource }: { onSource: (s: KnowledgeSource) => void }) {
    const [repo, setRepo] = useState("");
    const [branch, setBranch] = useState("main");
    const ingest = useIngest(onSource);

    const valid = /github\.com\/[^/]+\/[^/]+/i.test(repo);

    const submit = async () => {
        if (!valid) return;
        await ingest.run(API_ENDPOINTS.ingestGithub, {
            json: { repo_url: repo.trim(), branch: branch.trim() || "main" },
        });
    };

    return (
        <div>
            <label className="mb-1.5 block text-[12.5px] font-medium text-ink-2">Repository URL</label>
            <div className="flex gap-2">
                <div className="flex flex-1 items-center gap-2 rounded-control border border-line bg-field px-3 focus-within:border-line-strong">
                    <Github size={14} className="shrink-0 text-ink-3" />
                    <input
                        value={repo}
                        onChange={(e) => setRepo(e.target.value)}
                        placeholder="https://github.com/owner/repo"
                        className="min-w-0 flex-1 bg-transparent py-2.5 text-[13.5px] text-ink outline-none placeholder:text-ink-3"
                    />
                </div>
                <input
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    placeholder="main"
                    className="w-24 rounded-control border border-line bg-field px-3 py-2.5 text-[13.5px] text-ink outline-none focus:border-line-strong"
                />
                <button
                    onClick={submit}
                    disabled={ingest.busy || !valid}
                    className="shrink-0 rounded-control bg-accent px-4 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    Clone &amp; index
                </button>
            </div>
            <p className="mt-2 text-[11px] text-ink-3">Indexes docs, configs and detection rules (.md .rst .yaml .py .yar …). Large binaries skipped.</p>
            <IngestProgress {...ingest} />
        </div>
    );
}
