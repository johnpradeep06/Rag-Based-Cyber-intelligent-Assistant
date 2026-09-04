"use client";

import { useCallback, useRef, useState } from "react";
import { ingestStream, type KnowledgeSource } from "@/lib/ingestStream";

export type IngestPhase = "idle" | "running" | "done" | "error";

export type IngestState = {
    phase: IngestPhase;
    step: string;
    progress: { done: number; total: number } | null;
    error: string;
    added: KnowledgeSource[];
};

const INITIAL: IngestState = { phase: "idle", step: "", progress: null, error: "", added: [] };

export function useIngest(onSource?: (s: KnowledgeSource) => void) {
    const [state, setState] = useState<IngestState>(INITIAL);
    const abortRef = useRef<AbortController | null>(null);

    const reset = useCallback(() => setState(INITIAL), []);

    const run = useCallback(
        async (url: string, init: { json?: unknown; body?: BodyInit }) => {
            const ac = new AbortController();
            abortRef.current = ac;
            setState({ ...INITIAL, phase: "running", step: "Starting…" });
            const token = localStorage.getItem("token");
            await ingestStream(
                url,
                init,
                token,
                {
                    onStep: (label) => setState((s) => ({ ...s, step: label, progress: null })),
                    onProgress: (done, total, label) =>
                        setState((s) => ({ ...s, step: label, progress: { done, total } })),
                    onSource: (src) => {
                        setState((s) => ({ ...s, added: [...s.added, src] }));
                        onSource?.(src);
                    },
                    onError: (message) => setState((s) => ({ ...s, phase: "error", error: message })),
                    onComplete: () =>
                        setState((s) => (s.phase === "error" ? s : { ...s, phase: "done", step: "Done" })),
                },
                ac.signal,
            );
            abortRef.current = null;
        },
        [onSource],
    );

    const cancel = useCallback(() => abortRef.current?.abort(), []);

    return { ...state, run, reset, cancel, busy: state.phase === "running" };
}
