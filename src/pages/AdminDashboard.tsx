import React, { useState, useEffect } from 'react';
import {
  Shield, Check, X, Clock, AlertTriangle, UserPlus, Key, RefreshCw,
  ChevronDown, Users, Trash2
} from 'lucide-react';

interface User {
  id: number;
  email: string;
  role: string;
  approved: number;
  created_at: string;
}

const token = () => localStorage.getItem('token') ?? '';

async function apiFetch(url: string, opts: RequestInit = {}) {
  const res = await fetch(url, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}`, ...opts.headers }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export default function AdminDashboard() {
  const [users, setUsers]           = useState<User[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [showCreate, setShowCreate] = useState(false);

  // Create form state
  const [newEmail, setNewEmail]     = useState('');
  const [newPass, setNewPass]       = useState('');
  const [newRole, setNewRole]       = useState<'analyst' | 'admin'>('analyst');
  const [creating, setCreating]     = useState(false);
  const [createErr, setCreateErr]   = useState('');

  // Reset password state
  const [resetUserId, setResetUserId]   = useState<number | null>(null);
  const [resetPass, setResetPass]       = useState('');
  const [resetting, setResetting]       = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/api/admin/users');
      setUsers(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  // ── Create user ────────────────────────────────────────────────────────────
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateErr('');
    setCreating(true);
    try {
      await apiFetch('/api/admin/users/create', {
        method: 'POST',
        body: JSON.stringify({ email: newEmail, password: newPass, role: newRole })
      });
      setNewEmail(''); setNewPass(''); setNewRole('analyst'); setShowCreate(false);
      fetchUsers();
    } catch (e: any) {
      setCreateErr(e.message);
    } finally {
      setCreating(false);
    }
  };

  // ── Delete user ────────────────────────────────────────────────────────────
  const handleDelete = async (user: User) => {
    if (!confirm(`Delete ${user.email}? This cannot be undone.`)) return;
    try {
      await apiFetch(`/api/admin/users/${user.id}`, { method: 'DELETE' });
      setUsers(prev => prev.filter(u => u.id !== user.id));
    } catch (e: any) {
      alert(e.message);
    }
  };

  // ── Change role ────────────────────────────────────────────────────────────
  const handleRoleChange = async (user: User, role: string) => {
    try {
      await apiFetch(`/api/admin/users/${user.id}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role })
      });
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role } : u));
    } catch (e: any) {
      alert(e.message);
    }
  };

  // ── Reset password ─────────────────────────────────────────────────────────
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetUserId) return;
    setResetting(true);
    try {
      await apiFetch(`/api/admin/users/${resetUserId}/reset-password`, {
        method: 'PATCH',
        body: JSON.stringify({ password: resetPass })
      });
      setResetUserId(null); setResetPass('');
      alert('Password reset successfully.');
    } catch (e: any) {
      alert(e.message);
    } finally {
      setResetting(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center h-full text-red-400 gap-2">
      <AlertTriangle size={20} /> {error}
    </div>
  );

  const analysts = users.filter(u => u.role === 'analyst');
  const admins   = users.filter(u => u.role === 'admin');

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Admin Panel</h1>
          <p className="text-zinc-500 text-sm mt-1">Manage SOC analyst accounts and access</p>
        </div>
        <button
          onClick={() => { setShowCreate(!showCreate); setCreateErr(''); }}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-sm rounded-lg transition-colors"
        >
          <UserPlus size={16} />
          Create Account
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Users', value: users.length, color: 'text-zinc-200' },
          { label: 'Admins',      value: admins.length, color: 'text-indigo-400' },
          { label: 'Analysts',    value: analysts.length, color: 'text-emerald-400' },
        ].map(s => (
          <div key={s.label} className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
            <p className="text-xs text-zinc-500 uppercase tracking-widest">{s.label}</p>
            <p className={`text-3xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Create user form */}
      {showCreate && (
        <div className="bg-zinc-900/70 border border-emerald-500/30 rounded-2xl p-6">
          <h3 className="font-semibold text-emerald-400 mb-4 flex items-center gap-2">
            <UserPlus size={18} /> Create New Account
          </h3>
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              type="email" required placeholder="Email address"
              value={newEmail} onChange={e => setNewEmail(e.target.value)}
              className="md:col-span-2 bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500"
            />
            <input
              type="password" required placeholder="Password (min 6 chars)" minLength={6}
              value={newPass} onChange={e => setNewPass(e.target.value)}
              className="bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500"
            />
            <div className="flex gap-2">
              <select
                value={newRole} onChange={e => setNewRole(e.target.value as any)}
                className="flex-1 bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500"
              >
                <option value="analyst">Analyst</option>
                <option value="admin">Admin</option>
              </select>
              <button
                type="submit" disabled={creating}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-sm rounded-lg transition-colors disabled:opacity-50"
              >
                {creating ? '...' : 'Create'}
              </button>
            </div>
            {createErr && (
              <p className="md:col-span-4 text-sm text-red-400 flex items-center gap-2">
                <AlertTriangle size={14} /> {createErr}
              </p>
            )}
          </form>
        </div>
      )}

      {/* Reset password modal */}
      {resetUserId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="font-semibold text-white mb-1">Reset Password</h3>
            <p className="text-xs text-zinc-500 mb-4">
              {users.find(u => u.id === resetUserId)?.email}
            </p>
            <form onSubmit={handleResetPassword} className="space-y-3">
              <input
                type="password" required placeholder="New password" minLength={6}
                value={resetPass} onChange={e => setResetPass(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500"
              />
              <div className="flex gap-2">
                <button type="submit" disabled={resetting}
                  className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-sm rounded-lg transition-colors disabled:opacity-50"
                >
                  {resetting ? 'Resetting...' : 'Reset'}
                </button>
                <button type="button" onClick={() => { setResetUserId(null); setResetPass(''); }}
                  className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium text-sm rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-zinc-800 flex items-center gap-2">
          <Users size={18} className="text-emerald-500" />
          <h3 className="font-semibold text-zinc-200">All Users ({users.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-800/20 border-b border-zinc-800">
                {['Email', 'Role', 'Created', 'Actions'].map(h => (
                  <th key={h} className="px-6 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {users.map(user => (
                <tr key={user.id} className="hover:bg-zinc-800/30 transition-colors">
                  {/* Email */}
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-zinc-200">{user.email}</p>
                  </td>

                  {/* Role selector */}
                  <td className="px-6 py-4">
                    <select
                      value={user.role}
                      onChange={e => handleRoleChange(user, e.target.value)}
                      disabled={user.email === 'admin@sentinel.soc'}
                      className={`text-xs font-bold px-2 py-1 rounded-lg border focus:outline-none transition-colors ${
                        user.role === 'admin'
                          ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      } disabled:opacity-60 disabled:cursor-not-allowed`}
                    >
                      <option value="analyst">ANALYST</option>
                      <option value="admin">ADMIN</option>
                    </select>
                  </td>

                  {/* Created at */}
                  <td className="px-6 py-4 text-xs text-zinc-500">
                    {new Date(user.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { setResetUserId(user.id); setResetPass(''); }}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                        title="Reset password"
                      >
                        <Key size={12} /> Reset Pwd
                      </button>
                      {user.email !== 'admin@sentinel.soc' && (
                        <button
                          onClick={() => handleDelete(user)}
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Delete user"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
