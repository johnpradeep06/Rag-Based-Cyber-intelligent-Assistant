"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { 
    Search, 
    ZoomIn, 
    ZoomOut, 
    RotateCcw, 
    Layers, 
    Sparkles, 
    Play, 
    Pause, 
    ExternalLink, 
    Copy, 
    Check, 
    X,
    FileText,
    Shield,
    Database,
    Globe,
    Terminal,
    AlertOctagon,
    GitBranch,
    Radio
} from "lucide-react";
import { API_ENDPOINTS } from "@/lib/api";

/* ─────────────────────────────────────────────────────────
 * KNOWLEDGE GRAPH — Next-Gen Interactive Spatial Topology
 * 
 * Features:
 * - Orbital neural topology with smooth force-physics simulation
 * - Free canvas pan & zoom navigation + recenter
 * - Sci-Fi Sentinel HUD with coordinate grid & telemetry rings
 * - Vector icons per node type with luminous bloom
 * - Synaptic animated data streams along links
 * - Live search & category spotlight filtering
 * - Interactive node inspector card with full metadata
 * ───────────────────────────────────────────────────────── */

type SourceNode = {
    id: number;
    title: string;
    source_type: string;
    origin: string;
    chunk_count: number;
    created_at?: string | null;
};

type Kind = "core" | "group" | "source";

type N = {
    id: string;
    kind: Kind;
    type?: string;
    label: string;
    full: string;
    r: number;
    color: string;
    glow: string;
    bg: string;
    chunks?: number;
    count?: number;
    origin?: string;
    createdAt?: string | null;
    x: number;
    y: number;
    vx: number;
    vy: number;
    fx: number | null;
    fy: number | null;
};

type L = { s: string; t: string; color: string };

const TYPE_CONFIG: Record<string, { label: string; color: string; glow: string; bg: string }> = {
    attack: { 
        label: "MITRE ATT&CK", 
        color: "#c084fc", 
        glow: "rgba(192, 132, 252, 0.6)", 
        bg: "rgba(192, 132, 252, 0.18)" 
    },
    kev: { 
        label: "CISA KEV", 
        color: "#f59e0b", 
        glow: "rgba(245, 158, 11, 0.6)", 
        bg: "rgba(245, 158, 11, 0.18)" 
    },
    advisory: { 
        label: "Advisories", 
        color: "#38bdf8", 
        glow: "rgba(56, 189, 248, 0.6)", 
        bg: "rgba(56, 189, 248, 0.18)" 
    },
    url: { 
        label: "Web pages", 
        color: "#06b6d4", 
        glow: "rgba(6, 182, 212, 0.6)", 
        bg: "rgba(6, 182, 212, 0.18)" 
    },
    github: { 
        label: "Repositories", 
        color: "#94a3b8", 
        glow: "rgba(148, 163, 184, 0.5)", 
        bg: "rgba(148, 163, 184, 0.16)" 
    },
    json: { 
        label: "JSON / API", 
        color: "#10b981", 
        glow: "rgba(16, 185, 129, 0.6)", 
        bg: "rgba(16, 185, 129, 0.18)" 
    },
    csv: { 
        label: "Spreadsheets", 
        color: "#10b981", 
        glow: "rgba(16, 185, 129, 0.6)", 
        bg: "rgba(16, 185, 129, 0.18)" 
    },
    xlsx: { 
        label: "Spreadsheets", 
        color: "#10b981", 
        glow: "rgba(16, 185, 129, 0.6)", 
        bg: "rgba(16, 185, 129, 0.18)" 
    },
    pdf: { 
        label: "PDF documents", 
        color: "#f43f5e", 
        glow: "rgba(244, 63, 94, 0.6)", 
        bg: "rgba(244, 63, 94, 0.18)" 
    },
    docx: { 
        label: "Word documents", 
        color: "#fb7185", 
        glow: "rgba(251, 113, 133, 0.6)", 
        bg: "rgba(251, 113, 133, 0.18)" 
    },
    text: { 
        label: "Text / Markdown", 
        color: "#cbd5e1", 
        glow: "rgba(203, 213, 225, 0.4)", 
        bg: "rgba(203, 213, 225, 0.14)" 
    },
    log: { 
        label: "Logs", 
        color: "#cbd5e1", 
        glow: "rgba(203, 213, 225, 0.4)", 
        bg: "rgba(203, 213, 225, 0.14)" 
    },
};

const getTypeMeta = (t: string) => TYPE_CONFIG[t] ?? { 
    label: t.toUpperCase(), 
    color: "#60a5fa", 
    glow: "rgba(96, 165, 250, 0.5)", 
    bg: "rgba(96, 165, 250, 0.15)" 
};

const cleanText = (s: string) => s.replace(/\s+/g, " ").trim();
const truncateText = (s: string, n = 24) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

// SVG path renderers for node icons
function renderNodeIcon(type: string | undefined, kind: Kind, size = 16) {
    const half = size / 2;
    if (kind === "core") {
        return (
            <g transform={`translate(${-half} ${-half})`} className="pointer-events-none text-white">
                <path
                    d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V13H5V8.26l7-3.89v8.62z"
                    fill="currentColor"
                    transform={`scale(${size / 24})`}
                />
            </g>
        );
    }

    const s = size / 24;
    let path = "";

    switch (type) {
        case "attack":
            // Shield
            path = "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z";
            break;
        case "kev":
            // Alert Octagon
            path = "M7.86 2h8.28L22 7.86v8.28L16.14 22H7.86L2 16.14V7.86L7.86 2zM12 8v4M12 16h.01";
            break;
        case "advisory":
            // Broadcast / Radio
            path = "M4.9 19.1C1 15.2 1 8.8 4.9 4.9M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5M12 12h.01M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5M19.1 4.9C23 8.8 23 15.2 19.1 19.1";
            break;
        case "url":
            // Globe
            path = "M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 0c2.5 3 4 6.5 4 10s-1.5 7-4 10m0-20c-2.5 3-4 6.5-4 10s1.5 7 4 10M2 12h20";
            break;
        case "github":
            // Git Branch
            path = "M6 3v12M18 6a3 3 0 1 0-3 3M6 18a3 3 0 1 0 3-3M18 9a9 9 0 0 1-9 9";
            break;
        case "json":
        case "csv":
        case "xlsx":
            // Database
            path = "M21 5c0 1.66-4 3-9 3s-9-1.34-9-3 4-3 9-3 9 1.34 9 3zM3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5M3 12c0 1.66 4 3 9 3s9-1.34 9-3";
            break;
        case "pdf":
        case "docx":
            // File Text
            path = "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8";
            break;
        default:
            // Terminal / Code
            path = "M4 17l6-6-6-6M12 19h8";
            break;
    }

    return (
        <g transform={`translate(${-half} ${-half}) scale(${s})`} className="pointer-events-none">
            <path
                d={path}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </g>
    );
}

function buildGraph(sources: SourceNode[]): { nodes: N[]; links: L[] } {
    const nodes: N[] = [];
    const links: L[] = [];

    // 1. Core Sentinel Hub
    nodes.push({
        id: "core",
        kind: "core",
        label: "Sentinel Core",
        full: "Knowledge Base Neural Hub",
        r: 34,
        color: "#3b82f6",
        glow: "rgba(59, 130, 246, 0.7)",
        bg: "rgba(59, 130, 246, 0.25)",
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        fx: 0,
        fy: 0,
    });

    // Group sources by type
    const byType = new Map<string, SourceNode[]>();
    for (const s of sources) {
        const arr = byType.get(s.source_type) ?? [];
        arr.push(s);
        byType.set(s.source_type, arr);
    }

    let gi = 0;
    const totalGroups = Math.max(1, byType.size);
    const groupOrbitRadius = Math.min(220, Math.max(140, totalGroups * 26));

    for (const [type, rows] of byType) {
        const meta = getTypeMeta(type);
        const gid = `g:${type}`;
        const ang = (gi / totalGroups) * Math.PI * 2 - Math.PI / 2;

        const gx = Math.cos(ang) * groupOrbitRadius;
        const gy = Math.sin(ang) * groupOrbitRadius;

        nodes.push({
            id: gid,
            kind: "group",
            type,
            label: meta.label,
            full: `${meta.label} (${rows.length} indexed)`,
            r: 20,
            color: meta.color,
            glow: meta.glow,
            bg: meta.bg,
            count: rows.length,
            x: gx,
            y: gy,
            vx: 0,
            vy: 0,
            fx: null,
            fy: null,
        });

        links.push({ s: "core", t: gid, color: meta.color });

        // Source leaf nodes
        const leafSpread = Math.min(1.4, 0.35 + rows.length * 0.15);
        rows.forEach((row, k) => {
            const sid = `s:${row.id}`;
            const offsetAng = ang + (rows.length > 1 ? (k / (rows.length - 1) - 0.5) * leafSpread : 0);
            const leafDist = groupOrbitRadius + 110 + (k % 2 === 0 ? 0 : 35);

            const lx = Math.cos(offsetAng) * leafDist;
            const ly = Math.sin(offsetAng) * leafDist;

            // Radius scales dynamically with chunk density
            const r = Math.min(16, Math.max(8, 7 + Math.log2((row.chunk_count || 1) + 1) * 1.8));

            nodes.push({
                id: sid,
                kind: "source",
                type,
                label: truncateText(cleanText(row.title), 22),
                full: cleanText(row.title),
                r,
                color: meta.color,
                glow: meta.glow,
                bg: meta.bg,
                chunks: row.chunk_count,
                origin: row.origin,
                createdAt: row.created_at,
                x: lx,
                y: ly,
                vx: 0,
                vy: 0,
                fx: null,
                fy: null,
            });

            links.push({ s: gid, t: sid, color: meta.color });
        });

        gi++;
    }

    return { nodes, links };
}

export default function KnowledgeGraph({ onCount }: { onCount?: (n: number) => void }) {
    const [sources, setSources] = useState<SourceNode[] | null>(null);
    const [error, setError] = useState<string>("");
    const [hover, setHover] = useState<string | null>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterType, setFilterType] = useState<string | null>(null);
    const [showAllLabels, setShowAllLabels] = useState(true);
    const [driftEnabled, setDriftEnabled] = useState(true);
    const [copied, setCopied] = useState(false);

    const wrapRef = useRef<HTMLDivElement>(null);
    const [size, setSize] = useState({ w: 1000, h: 700 });

    const nodesRef = useRef<N[]>([]);
    const linksRef = useRef<L[]>([]);
    const alphaRef = useRef(1);
    const dragRef = useRef<{ id: string; startX: number; startY: number } | null>(null);
    const isPanningRef = useRef(false);
    const panStartRef = useRef({ x: 0, y: 0 });
    const rafRef = useRef(0);

    // Camera transform: scale + center offset
    const viewRef = useRef({ s: 1, cx: 0, cy: 0, targetS: 1, targetCx: 0, targetCy: 0 });
    const [, forceTick] = useState(0);

    // Fetch data
    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const token = localStorage.getItem("token");
                const res = await fetch(API_ENDPOINTS.sourcesGraph, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!res.ok) throw new Error(`Request failed (${res.status})`);
                const data: SourceNode[] = await res.json();
                if (mounted) {
                    setSources(data);
                    onCount?.(data.length);
                }
            } catch (e) {
                if (mounted) setError((e as Error).message || "Could not load knowledge graph");
            }
        })();
        return () => { mounted = false; };
    }, [onCount]);

    // Container resize observer
    useEffect(() => {
        const el = wrapRef.current;
        if (!el) return;
        const ro = new ResizeObserver(([entry]) => {
            const { width, height } = entry.contentRect;
            setSize({ w: Math.max(360, width), h: Math.max(360, height) });
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    // Graph data compilation
    const rawGraph = useMemo(() => (sources ? buildGraph(sources) : { nodes: [], links: [] }), [sources]);

    useEffect(() => {
        nodesRef.current = rawGraph.nodes;
        linksRef.current = rawGraph.links;
        alphaRef.current = 1;

        // Auto-fit initial camera view nicely
        if (rawGraph.nodes.length > 1) {
            let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
            for (const n of rawGraph.nodes) {
                minX = Math.min(minX, n.x); maxX = Math.max(maxX, n.x);
                minY = Math.min(minY, n.y); maxY = Math.max(maxY, n.y);
            }
            const spanX = Math.max(200, maxX - minX + 160);
            const spanY = Math.max(200, maxY - minY + 160);
            const fitScale = Math.min(1.2, Math.max(0.45, Math.min(size.w / spanX, size.h / spanY) * 0.85));

            viewRef.current.targetS = fitScale;
            viewRef.current.s = fitScale;
            viewRef.current.targetCx = (minX + maxX) / 2;
            viewRef.current.targetCy = (minY + maxY) / 2;
            viewRef.current.cx = viewRef.current.targetCx;
            viewRef.current.cy = viewRef.current.targetCy;
        }
    }, [rawGraph, size.w, size.h]);

    // Simulation physics loop
    useEffect(() => {
        const byId = () => {
            const m = new Map<string, N>();
            for (const n of nodesRef.current) m.set(n.id, n);
            return m;
        };

        const tick = () => {
            const nodes = nodesRef.current;
            const links = linksRef.current;
            const m = byId();
            let alpha = alphaRef.current;

            if (nodes.length > 0) {
                const drive = driftEnabled ? alpha * 0.85 + 0.035 : alpha * 0.85;

                if (drive > 0.005) {
                    // Center gravity
                    for (const n of nodes) {
                        const pull = n.kind === "core" ? 0.12 : n.kind === "group" ? 0.03 : 0.015;
                        n.vx += (0 - n.x) * pull * drive;
                        n.vy += (0 - n.y) * pull * drive;
                    }

                    // Pairwise repulsion
                    for (let i = 0; i < nodes.length; i++) {
                        for (let j = i + 1; j < nodes.length; j++) {
                            const a = nodes[i], b = nodes[j];
                            let dx = b.x - a.x, dy = b.y - a.y;
                            const d2 = dx * dx + dy * dy || 0.01;
                            const d = Math.sqrt(d2);

                            // Stronger repulsion between groups and core
                            const baseRepulsion = a.kind === "group" && b.kind === "group" ? 3800 : 2600;
                            const rep = Math.min(12, (baseRepulsion * drive) / d2);

                            dx /= d; dy /= d;
                            a.vx -= dx * rep; a.vy -= dy * rep;
                            b.vx += dx * rep; b.vy += dy * rep;

                            // Collision buffering
                            const minD = a.r + b.r + 28;
                            if (d < minD) {
                                const push = (minD - d) * 0.45;
                                a.vx -= dx * push; a.vy -= dy * push;
                                b.vx += dx * push; b.vy += dy * push;
                            }
                        }
                    }

                    // Link springs
                    for (const l of links) {
                        const s = m.get(l.s), t = m.get(l.t);
                        if (!s || !t) continue;
                        const targetRest = t.kind === "group" ? 170 : 100;
                        let dx = t.x - s.x, dy = t.y - s.y;
                        const d = Math.hypot(dx, dy) || 0.01;
                        const k = ((d - targetRest) / d) * 0.07 * drive;
                        dx *= k; dy *= k;
                        s.vx += dx; s.vy += dy;
                        t.vx -= dx; t.vy -= dy;
                    }

                    // Position integration
                    for (const n of nodes) {
                        if (n.fx != null) { 
                            n.x = n.fx; 
                            n.vx = 0; 
                        } else { 
                            n.vx *= 0.84; 
                            n.x += n.vx; 
                        }
                        if (n.fy != null) { 
                            n.y = n.fy; 
                            n.vy = 0; 
                        } else { 
                            n.vy *= 0.84; 
                            n.y += n.vy; 
                        }
                    }

                    alphaRef.current = Math.max(0.015, alpha * 0.985);
                }
            }

            // Smooth camera lerp
            const v = viewRef.current;
            v.s += (v.targetS - v.s) * 0.12;
            v.cx += (v.targetCx - v.cx) * 0.12;
            v.cy += (v.targetCy - v.cy) * 0.12;

            forceTick((prev) => (prev + 1) % 1_000_000);
            rafRef.current = requestAnimationFrame(tick);
        };

        rafRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafRef.current);
    }, [driftEnabled]);

    // Pan & Zoom controls
    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        const v = viewRef.current;
        const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
        const nextS = Math.min(3.5, Math.max(0.2, v.targetS * zoomFactor));
        v.targetS = nextS;
    };

    const handleCanvasPointerDown = (e: React.PointerEvent) => {
        // If clicking on background, initiate pan
        if ((e.target as HTMLElement).tagName === "svg" || (e.target as HTMLElement).id === "graph-bg") {
            isPanningRef.current = true;
            panStartRef.current = { x: e.clientX, y: e.clientY };
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        }
    };

    const handleCanvasPointerMove = (e: React.PointerEvent) => {
        // Handle Pan
        if (isPanningRef.current) {
            const dx = e.clientX - panStartRef.current.x;
            const dy = e.clientY - panStartRef.current.y;
            panStartRef.current = { x: e.clientX, y: e.clientY };

            const v = viewRef.current;
            v.targetCx -= dx / v.s;
            v.targetCy -= dy / v.s;
            return;
        }

        // Handle Node Drag
        if (dragRef.current) {
            const { id } = dragRef.current;
            const svg = wrapRef.current?.querySelector("svg");
            if (!svg) return;
            const rect = svg.getBoundingClientRect();
            const v = viewRef.current;

            const worldX = (((e.clientX - rect.left) / rect.width) * size.w - size.w / 2) / v.s + v.cx;
            const worldY = (((e.clientY - rect.top) / rect.height) * size.h - size.h / 2) / v.s + v.cy;

            const n = nodesRef.current.find((item) => item.id === id);
            if (n) {
                n.fx = worldX;
                n.fy = worldY;
                n.x = worldX;
                n.y = worldY;
                alphaRef.current = 0.4;
            }
        }
    };

    const handleCanvasPointerUp = (e: React.PointerEvent) => {
        if (isPanningRef.current) {
            isPanningRef.current = false;
        }
        if (dragRef.current) {
            const { id } = dragRef.current;
            const n = nodesRef.current.find((item) => item.id === id);
            if (n && n.kind !== "core") {
                n.fx = null;
                n.fy = null;
            }
            dragRef.current = null;
        }
    };

    const handleNodePointerDown = (id: string) => (e: React.PointerEvent) => {
        e.stopPropagation();
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        dragRef.current = { id, startX: e.clientX, startY: e.clientY };
        alphaRef.current = 0.5;
    };

    const recenterCamera = useCallback(() => {
        const nodes = nodesRef.current;
        if (!nodes.length) return;

        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (const n of nodes) {
            minX = Math.min(minX, n.x); maxX = Math.max(maxX, n.x);
            minY = Math.min(minY, n.y); maxY = Math.max(maxY, n.y);
        }
        const spanX = Math.max(200, maxX - minX + 160);
        const spanY = Math.max(200, maxY - minY + 160);
        const fitScale = Math.min(1.4, Math.max(0.35, Math.min(size.w / spanX, size.h / spanY) * 0.85));

        const v = viewRef.current;
        v.targetS = fitScale;
        v.targetCx = (minX + maxX) / 2;
        v.targetCy = (minY + maxY) / 2;
        alphaRef.current = 0.6;
    }, [size.w, size.h]);

    const zoomIn = () => {
        viewRef.current.targetS = Math.min(3.5, viewRef.current.targetS * 1.3);
    };

    const zoomOut = () => {
        viewRef.current.targetS = Math.max(0.2, viewRef.current.targetS / 1.3);
    };

    const focusNode = (node: N) => {
        viewRef.current.targetCx = node.x;
        viewRef.current.targetCy = node.y;
        viewRef.current.targetS = Math.max(1.1, viewRef.current.targetS);
        setSelectedId(node.id);
    };

    const nodes = nodesRef.current;
    const links = linksRef.current;
    const nodeMap = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
    const view = viewRef.current;

    // Connectivity query for hover/selection highlight
    const activeTarget = hover || selectedId;
    const isConnected = useCallback((id: string) => {
        if (!activeTarget) return true;
        if (id === activeTarget) return true;
        return links.some((l) => (l.s === activeTarget && l.t === id) || (l.t === activeTarget && l.s === id));
    }, [activeTarget, links]);

    // Search & Category Filtering
    const presentTypes = useMemo(() => {
        return Array.from(new Set((sources ?? []).map((s) => s.source_type)));
    }, [sources]);

    const totalChunks = useMemo(() => {
        return (sources ?? []).reduce((acc, s) => acc + (s.chunk_count || 0), 0);
    }, [sources]);

    const filteredNodes = useMemo(() => {
        return nodes.map((n) => {
            let matched = true;
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                matched = n.full.toLowerCase().includes(q) || (n.type ? n.type.toLowerCase().includes(q) : false);
            }
            if (filterType && n.kind !== "core") {
                matched = matched && n.type === filterType;
            }
            return { ...n, matched };
        });
    }, [nodes, searchQuery, filterType]);

    const selectedNode = useMemo(() => {
        if (!selectedId) return null;
        return nodeMap.get(selectedId) || null;
    }, [selectedId, nodeMap]);

    const copyText = (txt: string) => {
        navigator.clipboard.writeText(txt);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div ref={wrapRef} className="relative h-full w-full select-none overflow-hidden bg-[#070b14]">
            {/* Ambient Nebula Glow Behind Graph */}
            <div 
                className="pointer-events-none absolute inset-0 opacity-40 transition-opacity duration-700"
                style={{
                    background: "radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.16) 0%, rgba(147, 51, 234, 0.08) 35%, rgba(7, 11, 20, 0) 70%)"
                }}
            />

            {/* Error or Empty State */}
            {error && (
                <div className="absolute inset-0 z-20 flex items-center justify-center p-6">
                    <div className="rounded-xl border border-red-500/30 bg-red-950/40 p-4 text-center text-sm text-red-400 backdrop-blur-md">
                        {error}
                    </div>
                </div>
            )}

            {sources && sources.length === 0 && !error && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 text-center">
                    <div className="flex size-14 items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-500/10 text-blue-400 shadow-lg shadow-blue-500/10">
                        <Sparkles size={24} />
                    </div>
                    <p className="text-[15px] font-semibold text-slate-200">No Knowledge Sources Found</p>
                    <p className="max-w-md text-[13px] text-slate-400">
                        Upload security reports, MITRE mappings, or API feeds in the Knowledge Base to generate the interactive network topology.
                    </p>
                </div>
            )}

            {/* Top Floating Control Deck: Search + Filter Bar */}
            <div className="absolute top-3.5 left-3.5 right-3.5 z-10 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
                {/* Left: Search input + Stats */}
                <div className="flex flex-wrap items-center gap-2 pointer-events-auto">
                    {/* Live Search */}
                    <div className="relative flex items-center">
                        <Search className="absolute left-3 size-4 text-slate-400 pointer-events-none" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Filter knowledge nodes…"
                            className="h-9 w-64 rounded-xl border border-slate-700/60 bg-slate-900/80 pl-9 pr-8 text-[12.5px] text-slate-100 placeholder:text-slate-500 backdrop-blur-md transition-all focus:w-72 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery("")}
                                className="absolute right-2.5 text-slate-400 hover:text-slate-200"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    {/* Telemetry Stats Pill */}
                    {sources && sources.length > 0 && (
                        <div className="flex items-center gap-2.5 rounded-xl border border-slate-700/50 bg-slate-900/70 px-3 py-1.5 text-[12px] text-slate-300 backdrop-blur-md shadow-md">
                            <span className="flex items-center gap-1.5 font-medium text-blue-400">
                                <span className="size-2 animate-pulse rounded-full bg-blue-500" />
                                {sources.length} Sources
                            </span>
                            <span className="text-slate-600">·</span>
                            <span className="text-slate-400">{presentTypes.length} Clusters</span>
                            <span className="text-slate-600">·</span>
                            <span className="font-mono text-[11px] text-slate-400">{totalChunks.toLocaleString()} Chunks</span>
                        </div>
                    )}
                </div>

                {/* Right: Category Filter Pills */}
                {presentTypes.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pointer-events-auto">
                        <button
                            onClick={() => setFilterType(null)}
                            className={`rounded-lg border px-2.5 py-1 text-[11.5px] font-medium transition-all ${
                                filterType === null
                                    ? "border-blue-500/50 bg-blue-600/30 text-blue-300 shadow-sm"
                                    : "border-slate-800 bg-slate-900/60 text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                            } backdrop-blur-md`}
                        >
                            All
                        </button>
                        {presentTypes.map((t) => {
                            const meta = getTypeMeta(t);
                            const isSelected = filterType === t;
                            return (
                                <button
                                    key={t}
                                    onClick={() => setFilterType(isSelected ? null : t)}
                                    className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11.5px] font-medium transition-all ${
                                        isSelected
                                            ? "border-current shadow-sm"
                                            : "border-slate-800/80 bg-slate-900/60 text-slate-400 hover:bg-slate-800/80 hover:text-slate-200"
                                    } backdrop-blur-md`}
                                    style={isSelected ? { color: meta.color, backgroundColor: meta.bg } : {}}
                                >
                                    <span className="size-1.5 rounded-full" style={{ backgroundColor: meta.color }} />
                                    {meta.label}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* SVG Interactive Canvas */}
            <svg
                id="graph-bg"
                width="100%"
                height="100%"
                viewBox={`${-size.w / 2} ${-size.h / 2} ${size.w} ${size.h}`}
                className="touch-none select-none cursor-grab active:cursor-grabbing"
                onWheel={handleWheel}
                onPointerDown={handleCanvasPointerDown}
                onPointerMove={handleCanvasPointerMove}
                onPointerUp={handleCanvasPointerUp}
                onPointerLeave={handleCanvasPointerUp}
            >
                <defs>
                    {/* Glowing bloom filters */}
                    <filter id="glow-core" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur1" />
                        <feGaussianBlur in="SourceGraphic" stdDeviation="14" result="blur2" />
                        <feMerge>
                            <feMergeNode in="blur2" />
                            <feMergeNode in="blur1" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>

                    <filter id="glow-node" x="-40%" y="-40%" width="180%" height="180%">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="blur" />
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>

                    {/* Cyber matrix background grid */}
                    <pattern id="cyber-grid" width="48" height="48" patternUnits="userSpaceOnUse">
                        <circle cx="24" cy="24" r="1.1" fill="rgba(255, 255, 255, 0.07)" />
                        <path d="M 48 0 L 0 0 0 48" fill="none" stroke="rgba(255, 255, 255, 0.02)" strokeWidth="0.8" />
                    </pattern>

                    {/* Core radial gradient */}
                    <radialGradient id="core-grad" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#60a5fa" />
                        <stop offset="60%" stopColor="#2563eb" />
                        <stop offset="100%" stopColor="#1e3a8a" />
                    </radialGradient>
                </defs>

                {/* Cyber Matrix Grid Pattern Layer */}
                <rect
                    x={-size.w * 4}
                    y={-size.h * 4}
                    width={size.w * 8}
                    height={size.h * 8}
                    fill="url(#cyber-grid)"
                    className="pointer-events-none"
                    transform={`translate(${(-view.cx * view.s) % 48} ${(-view.cy * view.s) % 48})`}
                />

                {/* World Space Container (Pan & Zoom) */}
                <g transform={`scale(${view.s}) translate(${-view.cx} ${-view.cy})`}>
                    {/* Concentric Telemetry Orbit Rings */}
                    <g className="pointer-events-none opacity-20">
                        <circle cx="0" cy="0" r="160" fill="none" stroke="#3b82f6" strokeWidth="1" strokeDasharray="5 7" />
                        <circle cx="0" cy="0" r="280" fill="none" stroke="#6366f1" strokeWidth="1" strokeDasharray="3 9" />
                        <circle cx="0" cy="0" r="400" fill="none" stroke="#94a3b8" strokeWidth="0.8" strokeDasharray="2 12" />
                    </g>

                    {/* Synaptic Links */}
                    <g>
                        {links.map((l, i) => {
                            const s = nodeMap.get(l.s), t = nodeMap.get(l.t);
                            if (!s || !t) return null;

                            const isLit = activeTarget && (isConnected(l.s) && isConnected(l.t));
                            const isDim = activeTarget && !isLit;

                            return (
                                <g key={`link-${i}`}>
                                    <line
                                        x1={s.x}
                                        y1={s.y}
                                        x2={t.x}
                                        y2={t.y}
                                        stroke={isLit ? l.color : "#334155"}
                                        strokeWidth={(isLit ? 2.4 : 1.1) / Math.max(0.6, view.s * 0.8)}
                                        strokeOpacity={isLit ? 0.95 : isDim ? 0.08 : 0.35}
                                        strokeDasharray={isLit ? "6 4" : undefined}
                                        className={isLit ? "animate-pulse" : ""}
                                    />
                                    {isLit && (
                                        <line
                                            x1={s.x}
                                            y1={s.y}
                                            x2={t.x}
                                            y2={t.y}
                                            stroke={l.color}
                                            strokeWidth={4 / Math.max(0.6, view.s * 0.8)}
                                            strokeOpacity={0.2}
                                            filter="url(#glow-node)"
                                        />
                                    )}
                                </g>
                            );
                        })}
                    </g>

                    {/* Nodes Render */}
                    <g>
                        {filteredNodes.map((n) => {
                            const isFocused = isConnected(n.id);
                            const isDim = (activeTarget && !isFocused) || !n.matched;
                            const isSelected = selectedId === n.id;
                            const isHovered = hover === n.id;

                            return (
                                <g
                                    key={n.id}
                                    transform={`translate(${n.x} ${n.y})`}
                                    style={{
                                        cursor: "grab",
                                        opacity: isDim ? 0.18 : 1,
                                        transition: "opacity 200ms ease, filter 200ms ease",
                                    }}
                                    onPointerDown={handleNodePointerDown(n.id)}
                                    onClick={() => setSelectedId(isSelected ? null : n.id)}
                                    onPointerEnter={() => setHover(n.id)}
                                    onPointerLeave={() => setHover((h) => (h === n.id ? null : h))}
                                >
                                    {/* CORE NODE */}
                                    {n.kind === "core" && (
                                        <>
                                            {/* Rotating Orbital Halo */}
                                            <circle
                                                r={n.r + 12}
                                                fill="none"
                                                stroke="rgba(59, 130, 246, 0.4)"
                                                strokeWidth="1.5"
                                                strokeDasharray="6 8"
                                                className="animate-spin"
                                                style={{ animationDuration: "24s" }}
                                            />
                                            {/* Glow Bloom */}
                                            <circle
                                                r={n.r + 4}
                                                fill="rgba(59, 130, 246, 0.3)"
                                                filter="url(#glow-core)"
                                            />
                                            {/* Main Core Circle */}
                                            <circle
                                                r={n.r}
                                                fill="url(#core-grad)"
                                                stroke="#93c5fd"
                                                strokeWidth="2.5"
                                            />
                                            {/* Core Icon */}
                                            {renderNodeIcon(undefined, "core", 22)}

                                            {/* Core Label Pill */}
                                            <g transform={`translate(0 ${n.r + 20})`}>
                                                <rect
                                                    x="-56"
                                                    y="-11"
                                                    width="112"
                                                    height="22"
                                                    rx="11"
                                                    fill="rgba(15, 23, 42, 0.85)"
                                                    stroke="rgba(59, 130, 246, 0.5)"
                                                    strokeWidth="1"
                                                />
                                                <text
                                                    y="3.5"
                                                    textAnchor="middle"
                                                    className="fill-slate-100 font-semibold text-[11px] tracking-wide"
                                                >
                                                    {n.label}
                                                </text>
                                            </g>
                                        </>
                                    )}

                                    {/* CATEGORY HUB NODE */}
                                    {n.kind === "group" && (
                                        <>
                                            {/* Outer Halo on hover or focus */}
                                            {(isHovered || isSelected || isFocused) && (
                                                <circle
                                                    r={n.r + 8}
                                                    fill="none"
                                                    stroke={n.color}
                                                    strokeWidth="1.5"
                                                    strokeDasharray="4 4"
                                                    strokeOpacity="0.8"
                                                />
                                            )}
                                            {/* Hub Body Glass */}
                                            <circle
                                                r={n.r}
                                                fill={n.bg}
                                                stroke={n.color}
                                                strokeWidth="2.2"
                                                filter={isHovered ? "url(#glow-node)" : undefined}
                                            />
                                            {/* Category Vector Icon */}
                                            <g style={{ color: n.color }}>
                                                {renderNodeIcon(n.type, "group", 18)}
                                            </g>

                                            {/* Category Pill Tag */}
                                            <g transform={`translate(0 ${n.r + 16})`}>
                                                <rect
                                                    x={-(n.label.length * 3.6 + 18)}
                                                    y="-10"
                                                    width={n.label.length * 7.2 + 36}
                                                    height="20"
                                                    rx="10"
                                                    fill="rgba(15, 23, 42, 0.9)"
                                                    stroke={n.color}
                                                    strokeWidth="0.8"
                                                    strokeOpacity="0.7"
                                                />
                                                <text
                                                    y="3"
                                                    textAnchor="middle"
                                                    className="fill-slate-200 font-medium text-[11px]"
                                                >
                                                    {n.label}
                                                    {n.count != null && (
                                                        <tspan fill={n.color} fontWeight="700">
                                                            {` ${n.count}`}
                                                        </tspan>
                                                    )}
                                                </text>
                                            </g>
                                        </>
                                    )}

                                    {/* SOURCE LEAF NODE */}
                                    {n.kind === "source" && (
                                        <>
                                            {/* Hover / Selected Bloom */}
                                            {(isHovered || isSelected) && (
                                                <circle
                                                    r={n.r + 6}
                                                    fill="none"
                                                    stroke={n.color}
                                                    strokeWidth="2"
                                                    strokeOpacity="0.9"
                                                    filter="url(#glow-node)"
                                                />
                                            )}
                                            {/* Leaf Circle */}
                                            <circle
                                                r={n.r}
                                                fill={isHovered || isSelected ? n.color : n.bg}
                                                stroke={n.color}
                                                strokeWidth={isSelected ? 3 : 1.8}
                                            />
                                            {/* Inner Dot for visual crispness */}
                                            <circle
                                                r={Math.max(2, n.r * 0.35)}
                                                fill={isHovered || isSelected ? "#ffffff" : n.color}
                                            />

                                            {/* Label Card */}
                                            {(showAllLabels || isHovered || isSelected) && (
                                                <g transform={`translate(0 ${n.r + 14})`}>
                                                    <rect
                                                        x={-(n.label.length * 3.3 + 8)}
                                                        y="-9"
                                                        width={n.label.length * 6.6 + 16}
                                                        height="18"
                                                        rx="6"
                                                        fill="rgba(10, 15, 28, 0.88)"
                                                        stroke={isHovered || isSelected ? n.color : "rgba(51, 65, 85, 0.6)"}
                                                        strokeWidth={isHovered || isSelected ? 1 : 0.6}
                                                    />
                                                    <text
                                                        y="3"
                                                        textAnchor="middle"
                                                        fill={isHovered || isSelected ? "#f8fafc" : "#cbd5e1"}
                                                        className="text-[10px] font-normal"
                                                    >
                                                        {n.label}
                                                    </text>
                                                </g>
                                            )}
                                        </>
                                    )}
                                </g>
                            );
                        })}
                    </g>
                </g>
            </svg>

            {/* Bottom-Right Floating Glass Dock: Controls */}
            <div className="absolute bottom-4 right-4 z-10 flex items-center gap-1.5 rounded-2xl border border-slate-700/60 bg-slate-900/80 p-1.5 shadow-2xl backdrop-blur-md">
                <button
                    onClick={zoomIn}
                    title="Zoom In"
                    className="flex size-8 items-center justify-center rounded-xl text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
                >
                    <ZoomIn size={16} />
                </button>
                <button
                    onClick={zoomOut}
                    title="Zoom Out"
                    className="flex size-8 items-center justify-center rounded-xl text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
                >
                    <ZoomOut size={16} />
                </button>
                <div className="h-4 w-px bg-slate-800" />
                <button
                    onClick={recenterCamera}
                    title="Recenter & Fit View"
                    className="flex size-8 items-center justify-center rounded-xl text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
                >
                    <RotateCcw size={15} />
                </button>
                <button
                    onClick={() => setShowAllLabels(!showAllLabels)}
                    title={showAllLabels ? "Hide leaf labels" : "Show leaf labels"}
                    className={`flex size-8 items-center justify-center rounded-xl transition-colors ${
                        showAllLabels ? "bg-blue-600/30 text-blue-400" : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                    }`}
                >
                    <Layers size={15} />
                </button>
                <button
                    onClick={() => setDriftEnabled(!driftEnabled)}
                    title={driftEnabled ? "Pause Gentle Drift" : "Resume Drift"}
                    className={`flex size-8 items-center justify-center rounded-xl transition-colors ${
                        driftEnabled ? "text-emerald-400 hover:bg-slate-800" : "text-slate-400 hover:bg-slate-800"
                    }`}
                >
                    {driftEnabled ? <Pause size={15} /> : <Play size={15} />}
                </button>
            </div>

            {/* Bottom-Left Node Inspector Card (On Click Selection) */}
            {selectedNode && (
                <div className="absolute bottom-4 left-4 z-20 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-700/70 bg-slate-900/90 p-4 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-3 duration-200">
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <span 
                                className="flex size-7 items-center justify-center rounded-lg"
                                style={{ backgroundColor: selectedNode.bg, color: selectedNode.color }}
                            >
                                {renderNodeIcon(selectedNode.type, selectedNode.kind, 16)}
                            </span>
                            <span 
                                className="rounded-md px-2 py-0.5 text-[11px] font-semibold"
                                style={{ backgroundColor: selectedNode.bg, color: selectedNode.color }}
                            >
                                {selectedNode.kind === "core" 
                                    ? "CENTRAL HUB" 
                                    : selectedNode.kind === "group" 
                                        ? "CATEGORY CLUSTER" 
                                        : getTypeMeta(selectedNode.type!).label}
                            </span>
                        </div>
                        <button
                            onClick={() => setSelectedId(null)}
                            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                        >
                            <X size={15} />
                        </button>
                    </div>

                    <div className="mt-3">
                        <h4 className="text-[13.5px] font-semibold leading-snug text-slate-100 break-words">
                            {selectedNode.full}
                        </h4>
                    </div>

                    {selectedNode.kind === "source" && (
                        <div className="mt-3.5 space-y-2 border-t border-slate-800/80 pt-3 text-[12px]">
                            <div className="flex items-center justify-between text-slate-400">
                                <span>Indexed Chunks</span>
                                <span className="font-mono font-medium text-slate-200">
                                    {selectedNode.chunks || 1} chunks
                                </span>
                            </div>
                            {selectedNode.origin && (
                                <div className="flex items-center justify-between gap-2 text-slate-400">
                                    <span className="shrink-0">Origin</span>
                                    <span className="truncate font-mono text-[11px] text-slate-300" title={selectedNode.origin}>
                                        {selectedNode.origin}
                                    </span>
                                </div>
                            )}
                            {selectedNode.createdAt && (
                                <div className="flex items-center justify-between text-slate-400">
                                    <span>Added</span>
                                    <span className="text-[11.5px] text-slate-300">
                                        {new Date(selectedNode.createdAt).toLocaleDateString(undefined, {
                                            month: "short",
                                            day: "numeric",
                                            year: "numeric",
                                        })}
                                    </span>
                                </div>
                            )}

                            <div className="mt-3 flex items-center gap-2 pt-1">
                                <button
                                    onClick={() => copyText(selectedNode.full)}
                                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-700/80 bg-slate-800/80 py-1.5 text-[11.5px] font-medium text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
                                >
                                    {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                                    {copied ? "Copied" : "Copy Title"}
                                </button>
                                <button
                                    onClick={() => focusNode(selectedNode)}
                                    className="flex items-center justify-center rounded-xl border border-blue-500/40 bg-blue-600/30 px-3 py-1.5 text-[11.5px] font-medium text-blue-300 transition-colors hover:bg-blue-600/50"
                                >
                                    Focus
                                </button>
                            </div>
                        </div>
                    )}

                    {selectedNode.kind === "group" && (
                        <div className="mt-3 space-y-2 border-t border-slate-800/80 pt-3 text-[12px]">
                            <div className="flex items-center justify-between text-slate-400">
                                <span>Contained Sources</span>
                                <span className="font-mono font-medium text-slate-200">
                                    {selectedNode.count} document{selectedNode.count === 1 ? "" : "s"}
                                </span>
                            </div>
                            <button
                                onClick={() => focusNode(selectedNode)}
                                className="mt-2 w-full rounded-xl border border-blue-500/40 bg-blue-600/30 py-1.5 text-[11.5px] font-medium text-blue-300 transition-colors hover:bg-blue-600/50"
                            >
                                Focus Cluster
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
