import React, { useState, useEffect } from 'react';
import { Shield, Check, X, Clock, AlertTriangle } from 'lucide-react';

interface User {
    id: number;
    email: string;
    role: string;
    approved: number;
    created_at: string;
}

export default function AdminDashboard() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchUsers = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/admin/users', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch users. Ensure you have admin privileges.');
            }

            const data = await response.json();
            setUsers(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleApprove = async (id: number) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/admin/users/${id}/approve`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Failed to approve user');

            // Update local state
            setUsers(users.map(u => u.id === id ? { ...u, approved: 1 } : u));
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleReject = async (id: number) => {
        if (!confirm('Are you sure you want to reject and delete this user request?')) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/admin/users/${id}/reject`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Failed to reject user');

            // Update local state
            setUsers(users.filter(u => u.id !== id));
        } catch (err: any) {
            alert(err.message);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-full text-red-500 gap-2">
                <AlertTriangle size={20} />
                <span>{error}</span>
            </div>
        );
    }

    const pendingUsers = users.filter(u => u.approved === 0);
    const activeUsers = users.filter(u => u.approved === 1);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-white mb-1">Admin Panel</h2>
                    <p className="text-zinc-500">Manage SOC analyst access and permissions</p>
                </div>
            </div>

            {pendingUsers.length > 0 && (
                <section className="bg-amber-500/5 border border-amber-500/20 rounded-xl overflow-hidden">
                    <div className="p-4 border-b border-amber-500/20 bg-amber-500/10 flex items-center gap-3">
                        <Clock className="text-amber-500" size={20} />
                        <h3 className="font-semibold text-amber-500">Pending Approvals ({pendingUsers.length})</h3>
                    </div>
                    <div className="divide-y divide-zinc-800/50">
                        {pendingUsers.map(user => (
                            <div key={user.id} className="p-4 flex items-center justify-between hover:bg-zinc-800/30 transition-colors">
                                <div>
                                    <p className="text-sm font-medium text-zinc-200">{user.email}</p>
                                    <p className="text-xs text-zinc-500 mt-0.5">Requested: {new Date(user.created_at).toLocaleString()}</p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleApprove(user.id)}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 text-sm font-medium hover:text-white rounded transition-colors"
                                    >
                                        <Check size={16} /> Approve
                                    </button>
                                    <button
                                        onClick={() => handleReject(user.id)}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-rose-500/10 text-rose-500 hover:bg-rose-500 text-sm font-medium hover:text-white rounded transition-colors"
                                    >
                                        <X size={16} /> Reject
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            <section className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl overflow-hidden">
                <div className="p-4 border-b border-zinc-800/50 flex items-center gap-3">
                    <Shield className="text-emerald-500" size={20} />
                    <h3 className="font-semibold text-zinc-200">Active Analysts ({activeUsers.length})</h3>
                </div>
                <div className="divide-y divide-zinc-800/50">
                    {activeUsers.length === 0 ? (
                        <div className="p-4 text-center text-zinc-500 text-sm">No active users</div>
                    ) : (
                        activeUsers.map(user => (
                            <div key={user.id} className="p-4 flex items-center justify-between hover:bg-zinc-800/30 transition-colors">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-medium text-zinc-200">{user.email}</p>
                                        {user.role === 'admin' && (
                                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-indigo-500/20 text-indigo-400 rounded-full">
                                                Admin
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-zinc-500 mt-1">Joined: {new Date(user.created_at).toLocaleDateString()}</p>
                                </div>
                                {user.role !== 'admin' && (
                                    <button
                                        onClick={() => handleReject(user.id)}
                                        className="p-2 text-zinc-500 hover:text-rose-500 hover:bg-rose-500/10 rounded transition-colors"
                                        title="Revoke Access"
                                    >
                                        <X size={18} />
                                    </button>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </section>
        </div>
    );
}
