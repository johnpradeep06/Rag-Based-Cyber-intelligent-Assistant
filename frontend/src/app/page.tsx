"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ChatInterface from "../components/ChatInterface";

export default function Home() {
    const router = useRouter();
    const [role, setRole] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const storedRole = localStorage.getItem('role');

        if (!token) {
            router.push('/login');
        } else {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setRole(storedRole);
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setLoading(false);
        }
    }, [router]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        router.push('/login');
    };

    if (loading) return <div className="flex h-[100dvh] items-center justify-center bg-canvas text-ink-2">Loading…</div>;

    return (
        <main className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-canvas">
            {/* Top Right Controls */}
            <div className="absolute top-3 right-3 z-50 flex items-center gap-2">
                {role === 'admin' && (
                    <button
                        onClick={() => router.push('/campus_admin')}
                        className="rounded-control border border-line bg-surface px-3 py-1.5 text-[12.5px] font-medium text-ink-2 shadow-btn transition-colors hover:bg-hover hover:text-ink"
                    >
                        Admin dashboard
                    </button>
                )}
                <button
                    onClick={handleLogout}
                    className="rounded-control border border-line bg-surface px-3 py-1.5 text-[12.5px] font-medium text-ink-3 shadow-btn transition-colors hover:bg-hover hover:text-red"
                >
                    Log out
                </button>
            </div>

            <div className="h-full w-full flex-1">
                <ChatInterface />
            </div>
        </main>
    );
}
