// SSE client for POST /sessions/{id}/ask/stream.
// EventSource can't send an Authorization header, so we read the ReadableStream
// off a normal fetch() and parse the `data: {...}\n\n` frames ourselves.

export type Step = { id: string; label: string; state: "active" | "done" };

export type Source = {
  id: string;
  title: string;
  snippet?: string;
  url?: string;
  page?: number | null;
  kind: "doc" | "web";
  source_type?: string;
};

type Handlers = {
  onStep?: (step: Step) => void;
  onReasoning?: (delta: string) => void;
  onSources?: (sources: Source[]) => void;
  onDelta?: (text: string) => void;
  onDone?: () => void;
  onError?: (message: string) => void;
};

export async function streamAsk(
  url: string,
  question: string,
  token: string | null,
  handlers: Handlers,
  signal?: AbortSignal,
): Promise<void> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ question }),
      signal,
    });
  } catch (err) {
    if ((err as Error)?.name !== "AbortError") {
      handlers.onError?.("Could not reach the server.");
    }
    return;
  }

  if (res.status === 401) return handlers.onError?.("unauthorized");
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
            handlers.onStep?.(evt as unknown as Step);
            break;
          case "reasoning":
            handlers.onReasoning?.(evt.delta as string);
            break;
          case "sources":
            handlers.onSources?.(evt.sources as Source[]);
            break;
          case "delta":
            handlers.onDelta?.(evt.text as string);
            break;
          case "error":
            handlers.onError?.((evt.message as string) ?? "stream error");
            break;
          case "done":
            handlers.onDone?.();
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
