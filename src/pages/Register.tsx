import React, { useState } from 'react';
import { Shield, Lock, Mail, AlertTriangle, UserPlus } from 'lucide-react';

interface RegisterProps {
    onRegister: (token: string, user: any) => void;
    onNavigateToLogin: () => void;
}

export default function Register({ onRegister, onNavigateToLogin }: RegisterProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        if (password.length < 6) {
            setError("Password must be at least 6 characters long");
            return;
        }

        setLoading(true);

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Registration failed');
            }

            onRegister(data.token, data.user);
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
                    <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-xl mb-4">
                        <UserPlus size={32} />
                    </div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">
                        Analyst <span className="text-indigo-500">Registration</span>
                    </h1>
                    <p className="text-zinc-400 mt-2 text-sm text-center">
                        Create a new account to access the Sentinel SOC.
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
                                className="block w-full pl-10 pr-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-zinc-100 sm:text-sm transition-colors"
                                placeholder="new.analyst@sentinel.soc"
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
                                className="block w-full pl-10 pr-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-zinc-100 sm:text-sm transition-colors"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-1.5" htmlFor="confirmPassword">
                            Confirm Password
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Lock className="text-zinc-500" size={18} />
                            </div>
                            <input
                                id="confirmPassword"
                                type="password"
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="block w-full pl-10 pr-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-zinc-100 sm:text-sm transition-colors"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-zinc-100 bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-zinc-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Registering...' : 'Create Account'}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <p className="text-sm text-zinc-400">
                        Already have an account?{' '}
                        <button
                            onClick={onNavigateToLogin}
                            className="text-indigo-500 hover:text-indigo-400 font-medium transition-colors"
                        >
                            Sign In
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}
