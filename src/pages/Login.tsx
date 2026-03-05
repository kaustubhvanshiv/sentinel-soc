import React, { useState } from 'react';
import { Shield, Lock, Mail, AlertTriangle } from 'lucide-react';

interface LoginProps {
    onLogin: (token: string, user: any) => void;
    onNavigateToRegister: () => void;
}

export default function Login({ onLogin, onNavigateToRegister }: LoginProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Login failed');
            }

            onLogin(data.token, data.user);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-zinc-950 flex flex-col justify-center items-center p-4">
            <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-xl p-8">
                <div className="flex flex-col items-center mb-8">
                    <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl mb-4">
                        <Shield size={32} />
                    </div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">
                        SENTINEL<span className="text-emerald-500">SOC</span>
                    </h1>
                    <p className="text-zinc-400 mt-2 text-sm text-center">
                        Sign in to access the Security Operations Center dashboard.
                    </p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3">
                        <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={18} />
                        <p className="text-sm text-red-400">{error}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-1.5" htmlFor="email">
                            Email Address
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Mail className="text-zinc-500" size={18} />
                            </div>
                            <input
                                id="email"
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="block w-full pl-10 pr-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 text-zinc-100 sm:text-sm transition-colors"
                                placeholder="analyst@sentinel.soc"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-1.5" htmlFor="password">
                            Password
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Lock className="text-zinc-500" size={18} />
                            </div>
                            <input
                                id="password"
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="block w-full pl-10 pr-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 text-zinc-100 sm:text-sm transition-colors"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-zinc-950 bg-emerald-500 hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 focus:ring-offset-zinc-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Authenticating...' : 'Sign In'}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <p className="text-sm text-zinc-400">
                        Don't have an account?{' '}
                        <button
                            onClick={onNavigateToRegister}
                            className="text-emerald-500 hover:text-emerald-400 font-medium transition-colors"
                        >
                            Request Access
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}
