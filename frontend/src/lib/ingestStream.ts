// SSE client for the /ingest/* endpoints. Same data:-frame parsing as chatStream.ts;
// kept separate so the working chat reader isn't touched.

export type KnowledgeSource = {
    id: number;
    source_type: string;
    title: string;
    origin: string;
    ref: string;
    chunk_count: number;
    created_at?: string;
};

type IngestHandlers = {
    onStep?: (label: string) => void;
    onProgress?: (done: number, total: number, label: string) => void;
    onSource?: (source: KnowledgeSource) => void;
    onError?: (message: string) => void;
    onComplete?: () => void;
};

export async function ingestStream(
    url: string,
    init: { body?: BodyInit; json?: unknown },
    token: string | null,
    handlers: IngestHandlers,
    signal?: AbortSignal,
): Promise<void> {
    let res: Response;
    try {
        res = await fetch(url, {
            method: "POST",
            headers: {
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                ...(init.json !== undefined ? { "Content-Type": "application/json" } : {}),
            },
            body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
            signal,
        });
    } catch (err) {
        if ((err as Error)?.name !== "AbortError") handlers.onError?.("Could not reach the server.");
        return;
    }

    if (res.status === 401) return handlers.onError?.("Not authorized.");
    if (!res.ok || !res.body) return handlers.onError?.(`Request failed (${res.status})`);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
        for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const frames = buffer.split("\n\n");
            buffer = frames.pop() ?? "";
            for (const frame of frames) {
                const line = frame.trim();
                if (!line.startsWith("data:")) continue;
                let evt: { type: string; [k: string]: unknown };
                try {
                    evt = JSON.parse(line.slice(5).trim());
                } catch {
                    continue;
                }
                switch (evt.type) {
                    case "step":
                        handlers.onStep?.(evt.label as string);
                        break;
                    case "progress":
                        handlers.onProgress?.(
                            evt.done as number,
                            evt.total as number,
                            evt.label as string,
                        );
                        break;
                    case "source":
                        handlers.onSource?.(evt as unknown as KnowledgeSource);
                        break;
                    case "error":
                        handlers.onError?.((evt.message as string) ?? "Ingestion failed");
                        break;
                    case "complete":
                        handlers.onComplete?.();
                        break;
                }
            }
        }
    } catch (err) {
        if ((err as Error)?.name !== "AbortError") {
            handlers.onError?.(String((err as Error)?.message ?? err));
        }
    }
}
