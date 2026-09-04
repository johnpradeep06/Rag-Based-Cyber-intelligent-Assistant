"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Shield, Waypoints } from "lucide-react";
import KnowledgeGraph from "@/components/KnowledgeGraph";

export default function GraphPage() {
    const router = useRouter();
    const [ready, setReady] = useState(false);
    const [count, setCount] = useState<number | null>(null);

    useEffect(() => {
        if (!localStorage.getItem("token")) router.push("/login");
        else setReady(true);
    }, [router]);

    const onCount = useCallback((n: number) => setCount(n), []);

    if (!ready) {
        return <div className="flex h-[100dvh] items-center justify-center bg-canvas text-ink-2">Loading…</div>;
    }

    return (
        <main className="flex h-[100dvh] w-full flex-col overflow-hidden bg-canvas">
            <div className="flex shrink-0 items-center border-b border-line bg-page px-3 py-2.5">
                <div className="flex items-center gap-2 px-1 md:px-3">
                    <button
                        onClick={() => router.back()}
                        className="rounded-control p-2 text-ink-3 transition-colors hover:bg-hover hover:text-ink"
                        title="Back"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <span className="flex size-6 items-center justify-center rounded-[7px] bg-accent text-white">
                        <Shield size={13} strokeWidth={2.4} />
                    </span>
                    <span className="text-[14px] font-semibold tracking-tight text-ink">Sentinel</span>
                    <span className="text-ink-3">/</span>
                    <span className="flex items-center gap-1.5 text-[14px] text-ink-2">
                        <Waypoints size={14} className="text-accent-ink" />
                        Knowledge graph
                    </span>
                </div>
                {count != null && (
                    <span className="ml-auto rounded-full border border-line bg-surface px-3 py-1 text-[12px] text-ink-3 shadow-btn">
                        <span className="font-medium text-ink">{count}</span> source{count === 1 ? "" : "s"}
                    </span>
                )}
            </div>

            <div className="min-h-0 flex-1">
                <KnowledgeGraph onCount={onCount} />
            </div>
        </main>
    );
}
