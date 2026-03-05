import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Globe, Shield, AlertTriangle, ExternalLink, Search } from 'lucide-react';
import { format } from 'date-fns';

export default function Intelligence() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get('/api/intelligence');
        setData(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">IP Intelligence</h1>
          <p className="text-zinc-500 text-sm">Global threat database and reputation monitoring</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
          <input 
            type="text" 
            placeholder="Search IP reputation..." 
            className="bg-zinc-900 border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-emerald-500 transition-colors w-64"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-800/20 border-b border-zinc-800">
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">IP Address</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Country</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Attack Count</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">First Seen</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Last Seen</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Reputation</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {data.map((item) => (
                <tr key={item.ip} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="px-6 py-4 font-mono text-sm text-zinc-200">{item.ip}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-zinc-400">
                      <Globe size={14} className="text-zinc-500" />
                      {item.country}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-bold text-red-400">{item.attack_count}</span>
                  </td>
                  <td className="px-6 py-4 text-xs text-zinc-500">
                    {format(new Date(item.first_seen), 'MMM dd, yyyy')}
                  </td>
                  <td className="px-6 py-4 text-xs text-zinc-500">
                    {format(new Date(item.last_seen), 'MMM dd, yyyy')}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      item.attack_count > 50 ? 'bg-red-500/10 text-red-500' : 
                      item.attack_count > 10 ? 'bg-orange-500/10 text-orange-400' : 'bg-yellow-500/10 text-yellow-500'
                    }`}>
                      {item.attack_count > 50 ? 'MALICIOUS' : item.attack_count > 10 ? 'SUSPICIOUS' : 'CLEAN'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 transition-colors">
                      <ExternalLink size={14} />
                      Whois
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.length === 0 && !loading && (
            <div className="p-12 text-center text-zinc-500">
              No threat intelligence data available yet.
            </div>
          )}
        </div>
      </div>

      {/* Global Threat Map Placeholder */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8 flex flex-col items-center justify-center min-h-[400px]">
        <div className="relative w-full max-w-2xl aspect-video bg-zinc-800/30 rounded-xl border border-zinc-700/50 flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="w-full h-full bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:20px_20px]" />
          </div>
          <div className="text-center space-y-4">
            <Globe size={64} className="text-emerald-500/20 mx-auto animate-pulse" />
            <p className="text-zinc-500 font-medium">Interactive Threat Map Visualization</p>
            <p className="text-xs text-zinc-600 uppercase tracking-widest">Real-time Global Attack Vectors</p>
          </div>
          
          {/* Mock Attack Lines */}
          <div className="absolute top-1/4 left-1/4 w-1 h-1 bg-red-500 rounded-full shadow-[0_0_10px_#ef4444]" />
          <div className="absolute top-1/2 left-1/2 w-1 h-1 bg-emerald-500 rounded-full shadow-[0_0_10px_#10b981]" />
          <div className="absolute bottom-1/3 right-1/4 w-1 h-1 bg-orange-500 rounded-full shadow-[0_0_10px_#f97316]" />
        </div>
      </div>
    </div>
  );
}
