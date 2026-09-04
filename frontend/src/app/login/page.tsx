'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Loader2, ArrowRight } from 'lucide-react';
import { API_ENDPOINTS } from '@/lib/api';

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        const formData = new FormData();
        formData.append('username', username);
        formData.append('password', password);

        try {
            const res = await fetch(API_ENDPOINTS.token, {
                method: 'POST',
                body: formData,
            });

            if (!res.ok) {
                throw new Error('Login failed. Check credentials.');
            }

            const data = await res.json();
            localStorage.setItem('token', data.access_token);

            // Fetch user role
            const userRes = await fetch(API_ENDPOINTS.me, {
                headers: {
                    'Authorization': `Bearer ${data.access_token}`
                }
            });
            const userData = await userRes.json();
            localStorage.setItem('role', userData.role);

            router.push('/');
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-canvas font-sans">
            <div className="z-10 w-full max-w-sm rounded-window border border-line bg-surface p-8 shadow-card">
                <div className="mb-8 flex flex-col items-center">
                    <div className="mb-5 flex size-12 items-center justify-center rounded-[14px] bg-accent text-white shadow-raised">
                        <Shield size={24} strokeWidth={2.3} />
                    </div>
                    <h2 className="text-xl font-semibold tracking-tight text-ink">Welcome back</h2>
                    <p className="mt-1 text-[13.5px] text-ink-3">Sign in to Sentinel to continue</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-5">
                    {error && (
                        <div className="rounded-control border border-red/30 bg-red-tint p-2.5 text-center">
                            <p className="text-[12.5px] font-medium text-red">{error}</p>
                        </div>
                    )}

                    <div className="space-y-3.5">
                        <div>
                            <label className="mb-1.5 block text-[12.5px] font-medium text-ink-2">Username</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full rounded-control border border-line bg-field px-3 py-2.5 text-[14px] text-ink outline-none transition-colors placeholder:text-ink-3 focus:border-line-strong"
                                placeholder="Enter your username"
                                required
                            />
                        </div>
                        <div>
                            <label className="mb-1.5 block text-[12.5px] font-medium text-ink-2">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full rounded-control border border-line bg-field px-3 py-2.5 text-[14px] text-ink outline-none transition-colors placeholder:text-ink-3 focus:border-line-strong"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading || !username || !password}
                        className="flex w-full items-center justify-center gap-2 rounded-control bg-ink px-4 py-2.5 text-[13.5px] font-semibold text-canvas transition-opacity hover:opacity-90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        {isLoading ? <Loader2 size={16} className="animate-spin" /> : (
                            <>
                                Log in
                                <ArrowRight size={16} />
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-7 text-center">
                    <p className="text-[13px] text-ink-3">
                        Don&apos;t have an account?{' '}
                        <a href="/register" className="font-medium text-ink underline underline-offset-4 hover:text-ink-2">
                            Sign up
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
}
