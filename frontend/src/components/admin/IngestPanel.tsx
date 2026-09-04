"use client";

import { useState } from "react";
import { Upload, Globe, Braces, Github, Rss } from "lucide-react";
import type { KnowledgeSource } from "@/lib/ingestStream";
import FileIngest from "./FileIngest";
import UrlIngest from "./UrlIngest";
import ApiIngest from "./ApiIngest";
import GithubIngest from "./GithubIngest";
import FeedIngest from "./FeedIngest";

const TABS = [
    { id: "file", label: "Upload", icon: Upload },
    { id: "url", label: "URL", icon: Globe },
    { id: "api", label: "API", icon: Braces },
    { id: "github", label: "GitHub", icon: Github },
    { id: "feed", label: "Feeds", icon: Rss },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function IngestPanel({ onIngested }: { onIngested: (s: KnowledgeSource) => void }) {
    const [tab, setTab] = useState<TabId>("file");

    return (
        <div className="rounded-card border border-line bg-surface shadow-card">
            <div className="flex gap-1 border-b border-line p-1.5">
                {TABS.map((t) => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={`flex flex-1 items-center justify-center gap-1.5 rounded-control px-2 py-2 text-[12.5px] font-medium transition-colors ${
                            tab === t.id ? "bg-hover-2 text-ink" : "text-ink-3 hover:bg-hover hover:text-ink-2"
                        }`}
                    >
                        <t.icon size={14} />
                        <span className="hidden sm:inline">{t.label}</span>
                    </button>
                ))}
            </div>

            <div className="p-5">
                {tab === "file" && <FileIngest onSource={onIngested} />}
                {tab === "url" && <UrlIngest onSource={onIngested} />}
                {tab === "api" && <ApiIngest onSource={onIngested} />}
                {tab === "github" && <GithubIngest onSource={onIngested} />}
                {tab === "feed" && <FeedIngest onSource={onIngested} />}
            </div>
        </div>
    );
}
