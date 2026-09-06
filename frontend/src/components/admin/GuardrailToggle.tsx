"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, ShieldOff } from "lucide-react";
import { API_ENDPOINTS } from "@/lib/api";

export default function GuardrailToggle() {
    const [enabled, setEnabled] = useState<boolean | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem("token");
        fetch(API_ENDPOINTS.adminSettings, { headers: { Authorization: `Bearer ${token}` } })
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => d && setEnabled(!!d.guardrails_enabled))
            .catch(() => setEnabled(null));
    }, []);

    const toggle = async () => {
        if (enabled === null || saving) return;
        const next = !enabled;
        setSaving(true);
        setEnabled(next); // optimistic
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(API_ENDPOINTS.adminSettings, {
                method: "PATCH",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ guardrails_enabled: next }),
            });
            if (!res.ok) throw new Error();
            const d = await res.json();
            setEnabled(!!d.guardrails_enabled);
        } catch {
            setEnabled(!next); // revert on failure
        } finally {
            setSaving(false);
        }
    };

    const on = enabled === true;

    return (
        <div className="rounded-card border border-line bg-surface p-5 shadow-card">
            <h3 className="mb-1 flex items-center gap-2 text-[13.5px] font-medium text-ink">
                {on ? (
                    <ShieldCheck size={15} className="text-green" />
                ) : (
                    <ShieldOff size={15} className="text-ink-3" />
                )}
                Guardrails
            </h3>
            <p className="mb-4 text-[12.5px] leading-relaxed text-ink-3">
                Prompt-injection filtering and an operational-misuse classifier on every
                question. Turning this off removes one model call per turn (faster replies).
            </p>

            <div className="flex items-center justify-between">
                <span className={`text-[12.5px] font-medium ${on ? "text-green" : "text-ink-3"}`}>
                    {enabled === null ? "…" : on ? "Enabled" : "Disabled"}
                </span>
                <button
                    role="switch"
                    aria-checked={on}
                    aria-label="Toggle guardrails"
                    disabled={enabled === null || saving}
                    onClick={toggle}
                    className={`relative inline-flex h-[22px] w-[38px] shrink-0 items-center rounded-full border transition-colors disabled:opacity-50 ${
                        on ? "border-green/40 bg-green/25" : "border-line bg-inset"
                    }`}
                >
                    <span
                        className={`inline-block size-[16px] rounded-full bg-white shadow-btn transition-transform ${
                            on ? "translate-x-[18px]" : "translate-x-[3px]"
                        }`}
                    />
                </button>
            </div>
        </div>
    );
}
