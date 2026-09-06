"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
    ArrowUp, Square, Menu, Plus, MessageSquare, X, Search as SearchIcon, Shield, Waypoints,
    KeyRound, LockKeyhole, Mail, ShieldAlert, Network, Quote as QuoteIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { API_ENDPOINTS } from "@/lib/api";
import { streamAsk, type Source, type Step } from "@/lib/chatStream";
import ThinkingState from "@/components/primitives/ThinkingState";
import StreamingText from "@/components/primitives/StreamingText";
import Sources from "@/components/primitives/Sources";
import LoadingState from "@/components/primitives/LoadingState";
import SearchList from "@/components/primitives/SearchList";
import SelectionActions from "@/components/primitives/SelectionActions";

type Message = {
    role: "user" | "assistant";
    content: string;
    reasoning?: string;
    sources?: Source[];
    steps?: Step[];
    streaming?: boolean;
    error?: boolean;
};

type ChatSession = {
    id: number;
    title: string;
    created_at: string;
};

const SUGGESTED_QUERIES = [
    { text: "What is password spraying and how is it detected?", icon: KeyRound, label: "Password spraying", color: "text-blue-400" },
    { text: "Explain double extortion ransomware and how tactics have evolved.", icon: LockKeyhole, label: "Ransomware", color: "text-rose-400" },
    { text: "How does a phishing attack work and what are the common indicators?", icon: Mail, label: "Phishing", color: "text-amber-400" },
    { text: "What are the phases of a data breach?", icon: ShieldAlert, label: "Data breaches", color: "text-violet-400" },
    { text: "What is Ransomware-as-a-Service (RaaS)?", icon: Network, label: "RaaS", color: "text-emerald-400" },
];

const PLACEHOLDERS = [
    "Ask about threats, techniques & defenses…",
    "What is password spraying?",
    "How does ransomware spread across a network?",
    "Common indicators of a phishing email?",
];

/** Split a user message into its leading blockquote (from "Quote" on a selection)
 *  and the question body, so the bubble can render the excerpt as a real quote. */
function splitQuote(content: string): { quote: string | null; body: string } {
    if (!content.startsWith(">")) return { quote: null, body: content };
    const lines = content.split("\n");
    const quoted: string[] = [];
    let i = 0;
    for (; i < lines.length; i++) {
        if (!lines[i].startsWith(">")) break;
        quoted.push(lines[i].replace(/^>\s?/, ""));
    }
    while (i < lines.length && lines[i].trim() === "") i++;
    return { quote: quoted.join("\n").trim(), body: lines.slice(i).join("\n").trim() };
}

function upsertStep(steps: Step[], next: Step): Step[] {
    const i = steps.findIndex((s) => s.id === next.id);
    if (i === -1) return [...steps, next];
    const copy = [...steps];
    copy[i] = next;
    return copy;
}

export default function ChatInterface() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [quote, setQuote] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [searchOpen, setSearchOpen] = useState(false);
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const prevMessageCountRef = useRef(0); // only jump on new messages, never mid-stream
    const [showJumpButton, setShowJumpButton] = useState(false);
    const abortRef = useRef<AbortController | null>(null);
    const taRef = useRef<HTMLTextAreaElement>(null);
    const router = useRouter();

    // auto-grow the composer (ChatGPT-style) up to a max height
    useEffect(() => {
        const el = taRef.current;
        if (!el) return;
        el.style.height = "auto";
        el.style.height = `${Math.min(el.scrollHeight, 224)}px`;
    }, [input]);

    const [currentPlaceholder, setCurrentPlaceholder] = useState("");
    const [placeholderIndex, setPlaceholderIndex] = useState(0);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        const timeoutContext = setTimeout(() => {
            const fullText = PLACEHOLDERS[placeholderIndex];
            if (!isDeleting) {
                setCurrentPlaceholder(fullText.substring(0, currentPlaceholder.length + 1));
                if (currentPlaceholder.length === fullText.length) {
                    setTimeout(() => setIsDeleting(true), 1800);
                }
            } else {
                setCurrentPlaceholder(fullText.substring(0, currentPlaceholder.length - 1));
                if (currentPlaceholder.length === 0) {
                    setIsDeleting(false);
                    setPlaceholderIndex((prev) => (prev + 1) % PLACEHOLDERS.length);
                }
            }
        }, isDeleting ? 30 : 55);
        return () => clearTimeout(timeoutContext);
    }, [currentPlaceholder, isDeleting, placeholderIndex]);

    useEffect(() => {
        if (window.innerWidth < 768) setSidebarOpen(false);
    }, []);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
                e.preventDefault();
                setSearchOpen((v) => !v);
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    // Never auto-follow while text streams in — the user reads from the top and
    // scrolls themself. We only jump once when a new message is appended.
    const scrollToBottom = (behavior: ScrollBehavior = "auto") => {
        const el = scrollRef.current;
        if (!el) return;
        el.scrollTo({ top: el.scrollHeight, behavior });
    };

    const onMessagesScroll = () => {
        const el = scrollRef.current;
        if (!el) return;
        const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
        setShowJumpButton(distanceFromBottom >= 96);
    };

    useEffect(() => {
        if (messages.length > prevMessageCountRef.current) {
            requestAnimationFrame(() => scrollToBottom());
        }
        prevMessageCountRef.current = messages.length;
    }, [messages.length]);

    const jumpToBottom = () => {
        setShowJumpButton(false);
        scrollToBottom("smooth");
    };

    const fetchSessions = useCallback(async () => {
        try {
            const token = localStorage.getItem("token");
            if (!token) {
                router.push("/login");
                return;
            }
            const res = await fetch(API_ENDPOINTS.sessions, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.status === 401) {
                localStorage.removeItem("token");
                localStorage.removeItem("role");
                router.push("/login");
                return;
            }
            if (res.ok) setSessions(await res.json());
        } catch (error) {
            console.error("Failed to fetch sessions", error);
        }
    }, [router]);

    const loadSession = async (sessionId: number) => {
        setCurrentSessionId(sessionId);
        setSearchOpen(false);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(API_ENDPOINTS.sessionMessages(sessionId), {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.status === 401) {
                localStorage.removeItem("token");
                localStorage.removeItem("role");
                router.push("/login");
                return;
            }
            if (res.ok) {
                const data = await res.json();
                setMessages(
                    data.map((m: Message & { sources?: Source[] }) => ({
                        role: m.role,
                        content: m.content,
                        reasoning: m.reasoning ?? undefined,
                        sources: m.sources ?? undefined,
                    })),
                );
            }
        } catch (error) {
            console.error("Failed to load session", error);
        } finally {
            if (window.innerWidth < 768) setSidebarOpen(false);
        }
    };

    useEffect(() => { fetchSessions(); }, [fetchSessions]);

    const patchLast = (fn: (m: Message) => Partial<Message>) =>
        setMessages((prev) => {
            if (!prev.length) return prev;
            const copy = [...prev];
            const last = copy[copy.length - 1];
            copy[copy.length - 1] = { ...last, ...fn(last) };
            return copy;
        });

    const handleSubmit = async (e?: React.FormEvent, overrideInput?: string) => {
        e?.preventDefault();
        const textToSubmit = overrideInput !== undefined ? overrideInput : input;
        if (!textToSubmit.trim() || isLoading) return;

        // a pinned excerpt rides along as a markdown blockquote so the model sees it
        const attached = overrideInput === undefined ? quote : null;
        const userMessage = attached
            ? `> ${attached.replace(/\n+/g, "\n> ")}\n\n${textToSubmit.trim()}`
            : textToSubmit.trim();
        setInput("");
        setQuote(null);
        setShowJumpButton(false);
        setMessages((prev) => [
            ...prev,
            { role: "user", content: userMessage },
            { role: "assistant", content: "", steps: [], reasoning: "", streaming: true },
        ]);
        setIsLoading(true);

        const token = localStorage.getItem("token");
        let activeSessionId = currentSessionId;

        try {
            if (!activeSessionId) {
                const createRes = await fetch(API_ENDPOINTS.sessions, {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (createRes.status === 401) {
                    localStorage.removeItem("token");
                    localStorage.removeItem("role");
                    router.push("/login");
                    return;
                }
                if (!createRes.ok) throw new Error("Failed to create session");
                activeSessionId = (await createRes.json()).id as number;
                setCurrentSessionId(activeSessionId);
            }

            const ac = new AbortController();
            abortRef.current = ac;

            await streamAsk(
                API_ENDPOINTS.sessionAskStream(activeSessionId),
                userMessage,
                token,
                {
                    onStep: (s) => patchLast((m) => ({ steps: upsertStep(m.steps ?? [], s) })),
                    onReasoning: (d) => patchLast((m) => ({ reasoning: (m.reasoning ?? "") + d })),
                    onSources: (srcs) => patchLast(() => ({ sources: srcs })),
                    onDelta: (t) => patchLast((m) => ({ content: m.content + t })),
                    onError: (msg) => {
                        if (msg === "unauthorized") {
                            localStorage.removeItem("token");
                            localStorage.removeItem("role");
                            router.push("/login");
                            return;
                        }
                        patchLast((m) => ({
                            content: m.content || `Something went wrong: ${msg}`,
                            error: true,
                        }));
                    },
                },
                ac.signal,
            );
        } catch (error) {
            console.error(error);
            patchLast(() => ({
                content: "Sorry, I had trouble connecting to the server. Please check your backend connection.",
                error: true,
            }));
        } finally {
            abortRef.current = null;
            setIsLoading(false);
            patchLast(() => ({ streaming: false }));
            fetchSessions();
        }
    };

    const stop = () => abortRef.current?.abort();

    const newChat = () => {
        stop();
        setMessages([]);
        setCurrentSessionId(null);
        if (window.innerWidth < 768) setSidebarOpen(false);
    };

    return (
        <div className="flex h-full w-full overflow-hidden bg-canvas font-sans text-ink">
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-30 bg-black/50 md:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed inset-y-0 left-0 z-40 flex w-[264px] transform flex-col border-r border-line
                    bg-page transition-all duration-300 ease-out md:relative md:translate-x-0
                    ${sidebarOpen ? "" : "-translate-x-full md:w-0 md:overflow-hidden md:border-none md:opacity-0"}`}
            >
                <div className="flex h-full w-[264px] flex-col p-3">
                    <div className="mb-2 flex items-center justify-between px-1 md:hidden">
                        <span className="text-[13px] font-semibold text-ink">Chats</span>
                        <button
                            onClick={() => setSidebarOpen(false)}
                            className="rounded-control p-1 text-ink-3 transition-colors hover:bg-hover hover:text-ink"
                            title="Close sidebar"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    <div className="mb-3 flex items-center gap-2.5 px-1.5 pt-1">
                        <span className="flex size-7 items-center justify-center rounded-[8px] bg-accent text-white">
                            <Shield size={15} strokeWidth={2.4} />
                        </span>
                        <span className="text-[14px] font-semibold tracking-tight text-ink">Sentinel</span>
                        <span className="ml-auto rounded-full bg-inset px-1.5 py-0.5 font-mono text-[9.5px] tracking-wide text-ink-3 uppercase shadow-hairline">
                            RAG
                        </span>
                    </div>

                    <button
                        onClick={newChat}
                        className="flex items-center gap-2.5 rounded-control border border-line bg-surface px-3 py-2.5
                            text-[14px] font-medium text-ink shadow-btn transition-colors hover:bg-hover"
                    >
                        <Plus size={16} />
                        New chat
                    </button>

                    <button
                        onClick={() => setSearchOpen(true)}
                        className="mt-2 flex items-center gap-2.5 rounded-control px-3 py-2 text-[14px]
                            text-ink-2 transition-colors hover:bg-hover hover:text-ink"
                    >
                        <SearchIcon size={16} />
                        Search chats
                        <kbd className="ml-auto rounded-[5px] bg-inset px-1.5 py-0.5 font-mono text-[10px] text-ink-3 shadow-hairline">
                            ⌘K
                        </kbd>
                    </button>

                    <button
                        onClick={() => router.push("/graph")}
                        className="flex items-center gap-2.5 rounded-control px-3 py-2 text-[14px]
                            text-ink-2 transition-colors hover:bg-hover hover:text-ink"
                    >
                        <Waypoints size={16} />
                        Knowledge graph
                    </button>

                    <div className="custom-scrollbar mt-5 flex-1 overflow-y-auto pr-1">
                        <div className="px-2 py-1.5 text-[11px] font-semibold tracking-wide text-ink-3 uppercase">
                            Recent
                        </div>
                        {sessions.length === 0 ? (
                            <div className="px-2 py-2 text-[13.5px] text-ink-3">No previous chats</div>
                        ) : (
                            sessions.map((session) => (
                                <button
                                    key={session.id}
                                    onClick={() => loadSession(session.id)}
                                    className={`mb-0.5 flex w-full items-center gap-2.5 rounded-control px-2.5 py-2 text-left
                                        text-[13.5px] transition-colors ${currentSessionId === session.id
                                            ? "bg-hover-2 font-medium text-ink"
                                            : "text-ink-2 hover:bg-hover hover:text-ink"
                                        }`}
                                >
                                    <MessageSquare
                                        size={14}
                                        className={currentSessionId === session.id ? "text-accent-ink" : "text-ink-3"}
                                    />
                                    <span className="truncate">{session.title}</span>
                                </button>
                            ))
                        )}
                    </div>

                    <div className="mt-2 border-t border-line pt-3">
                        <div className="flex items-center gap-2.5 rounded-control px-2 py-2">
                            <div className="flex size-8 items-center justify-center rounded-full bg-inset text-[13px] font-semibold text-ink-2 shadow-hairline">
                                U
                            </div>
                            <div className="text-[13.5px] font-medium text-ink-2">Analyst</div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main */}
            <div className="relative flex h-full w-full flex-1 flex-col overflow-hidden">
                <div className="sticky top-0 z-20 flex items-center gap-2.5 p-3">
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="rounded-control p-2 text-ink-3 transition-colors hover:bg-hover hover:text-ink"
                        title="Toggle sidebar"
                    >
                        <Menu size={18} />
                    </button>
                    <span className={`items-center gap-2 ${sidebarOpen ? "flex md:hidden" : "flex"}`}>
                        <Shield size={15} strokeWidth={2.4} className="text-accent-ink" />
                        <span className="text-[14px] font-semibold tracking-tight text-ink">Sentinel</span>
                        <span className="hidden text-[13px] text-ink-3 sm:inline">· Cyber Security Intelligence</span>
                    </span>
                </div>

                {messages.length > 0 && (
                    <div className="relative min-h-0 w-full flex-1">
                        <div
                            ref={scrollRef}
                            onScroll={onMessagesScroll}
                            style={{ overflowAnchor: "none" }}
                            className="custom-scrollbar flex h-full w-full flex-col items-center overflow-y-auto"
                        >
                            <div
                                className="flex w-full max-w-3xl flex-col gap-8 px-4 pt-4 pb-6 md:px-0"
                                data-selectable
                            >
                                {messages.map((msg, idx) => (
                                    <div
                                        key={idx}
                                        className={`flex w-full ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                                    >
                                        {msg.role === "user" ? (
                                            (() => {
                                                const { quote: q, body } = splitQuote(msg.content);
                                                return (
                                                    <div className="max-w-[85%] overflow-hidden rounded-window rounded-br-md border border-line bg-surface shadow-card">
                                                        {q && (
                                                            <div className="flex gap-2 border-b border-line bg-inset px-3.5 py-2.5">
                                                                <QuoteIcon size={12} className="mt-1 shrink-0 text-accent-ink" />
                                                                <p className="line-clamp-3 text-[13px] leading-[1.5] text-ink-3 italic">
                                                                    {q}
                                                                </p>
                                                            </div>
                                                        )}
                                                        <div className="px-4 py-2.5 text-[15.5px] leading-[1.65] whitespace-pre-wrap text-ink">
                                                            {body}
                                                        </div>
                                                    </div>
                                                );
                                            })()
                                        ) : (
                                            <div className="flex w-full">
                                                <div className="flex w-full min-w-0 flex-col gap-3">
                                                    {(msg.steps?.length || msg.reasoning) ? (
                                                        <ThinkingState
                                                            steps={msg.steps ?? []}
                                                            reasoning={msg.reasoning}
                                                            working={!!msg.streaming && !msg.content}
                                                        />
                                                    ) : null}

                                                    {msg.streaming && !msg.content && !msg.steps?.length && (
                                                        <LoadingState variant="Drive" label="Fathoming..." />
                                                    )}

                                                    {msg.content && (
                                                        <div className={msg.error ? "text-red" : undefined}>
                                                            <StreamingText text={msg.content} streaming={msg.streaming} />
                                                        </div>
                                                    )}

                                                    {msg.sources?.length && !msg.streaming ? (
                                                        <Sources items={msg.sources} />
                                                    ) : null}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                                <div ref={messagesEndRef} className="h-2" />
                            </div>
                        </div>

                        {showJumpButton && (
                            <button
                                onClick={jumpToBottom}
                                className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 py-2 text-[12.5px] font-medium text-ink-2 shadow-overlay transition-colors hover:bg-hover hover:text-ink"
                                style={{ animation: "fade-up 180ms cubic-bezier(0.23,1,0.32,1) both" }}
                                title="Jump to latest"
                            >
                                <ArrowUp size={13} className="rotate-180" />
                                {isLoading ? "New replies" : "Jump to latest"}
                            </button>
                        )}
                    </div>
                )}

                {/* Composer */}
                <div
                    className={`z-10 flex w-full shrink-0 flex-col items-center px-4 transition-all duration-500 md:px-0 ${messages.length === 0 ? "mt-[-6vh] flex-1 justify-center" : "justify-end bg-canvas pt-3 pb-5"
                        }`}
                >
                    <div className="relative flex w-full max-w-3xl flex-col items-center">
                        {messages.length === 0 && (
                            <div className="mb-8 flex flex-col items-center">
                                <span className="mb-4 flex size-11 items-center justify-center rounded-[13px] bg-accent text-white shadow-raised">
                                    <Shield size={22} strokeWidth={2.3} />
                                </span>
                                <h2 className="text-center text-[26px] font-semibold tracking-tight text-ink md:text-[30px]">
                                    How can I help you today?
                                </h2>
                                <p className="mt-1.5 text-center text-[14px] text-ink-3">
                                    Ask about attacks, techniques and defenses — grounded in your indexed sources.
                                </p>
                            </div>
                        )}

                        <div className="w-full overflow-hidden rounded-window border border-line bg-surface shadow-card transition-colors focus-within:border-line-strong">
                            {quote && (
                                <div
                                    className="flex items-start gap-2.5 border-b border-line bg-inset py-2.5 pr-2 pl-3.5"
                                    style={{ animation: "fade-up 220ms cubic-bezier(0.23,1,0.32,1) both" }}
                                >
                                    <QuoteIcon size={13} className="mt-[3px] shrink-0 text-accent-ink" />
                                    <p className="line-clamp-2 flex-1 text-[13px] leading-[1.5] text-ink-2">{quote}</p>
                                    <button
                                        onClick={() => setQuote(null)}
                                        className="shrink-0 rounded-control p-1 text-ink-3 transition-colors hover:bg-hover hover:text-ink"
                                        title="Remove excerpt"
                                    >
                                        <X size={13} />
                                    </button>
                                </div>
                            )}
                            <textarea
                                ref={taRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSubmit();
                                    }
                                    if (e.key === "Escape" && quote) setQuote(null);
                                }}
                                placeholder={quote ? "Ask about this excerpt…" : currentPlaceholder + (isDeleting ? "" : "▏")}
                                className="custom-scrollbar block max-h-[224px] min-h-[54px] w-full resize-none bg-transparent px-4 py-3.5 text-[16px] leading-[1.6] text-ink outline-none placeholder:text-ink-3"
                                rows={1}
                            />
                            <div className="flex items-center justify-between px-3 pb-3">
                                <span className="hidden pl-1 text-[11.5px] text-ink-3 sm:flex sm:items-center sm:gap-1.5">
                                    <kbd className="rounded-[4px] bg-inset px-1.5 py-0.5 font-mono text-[10px] shadow-hairline">⏎</kbd>
                                    send
                                    <kbd className="ml-1 rounded-[4px] bg-inset px-1.5 py-0.5 font-mono text-[10px] shadow-hairline">⇧⏎</kbd>
                                    new line
                                </span>
                                {isLoading ? (
                                    <button
                                        onClick={stop}
                                        className="flex size-8 items-center justify-center rounded-full bg-ink text-canvas transition-transform hover:scale-105"
                                        title="Stop"
                                    >
                                        <Square size={13} fill="currentColor" />
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => handleSubmit()}
                                        disabled={!input.trim()}
                                        className={`flex size-8 items-center justify-center rounded-full transition-all ${input.trim()
                                                ? "bg-accent text-white hover:opacity-90"
                                                : "cursor-not-allowed bg-inset text-ink-3"
                                            }`}
                                        title="Send"
                                    >
                                        <ArrowUp size={16} />
                                    </button>
                                )}
                            </div>
                        </div>

                        {messages.length === 0 && (
                            <div className="mt-6 flex w-full flex-wrap items-center justify-center gap-2">
                                {SUGGESTED_QUERIES.map((query, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => handleSubmit(undefined, query.text)}
                                        className="flex items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-2 text-[13px]
                                            font-medium text-ink-2 shadow-btn transition-colors hover:bg-hover hover:text-ink"
                                    >
                                        <query.icon size={15} className={query.color} />
                                        {query.label}
                                    </button>
                                ))}
                            </div>
                        )}

                        {messages.length > 0 && (
                            <p className="mt-2.5 text-center text-[11.5px] text-ink-3">
                                Sentinel can make mistakes. Verify findings against primary sources.
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Search palette */}
            {searchOpen && (
                <div
                    className="fixed inset-0 z-[70] flex items-start justify-center bg-black/40 pt-[15vh]"
                    onClick={() => setSearchOpen(false)}
                >
                    <div className="w-full max-w-md px-4" onClick={(e) => e.stopPropagation()}>
                        <SearchList
                            items={sessions.map((s) => ({ id: s.id, label: s.title }))}
                            onSelect={(id) => loadSession(id)}
                        />
                    </div>
                </div>
            )}

            <SelectionActions
                onQuote={(t) => {
                    setQuote(t.replace(/\s+/g, " ").trim());
                    taRef.current?.focus();
                }}
                onExplain={(t) => handleSubmit(undefined, `Explain this: "${t}"`)}
            />
        </div>
    );
}
