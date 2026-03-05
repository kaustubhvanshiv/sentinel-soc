import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { AlertCircle, Clock, Shield, Filter, Search, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

const SEVERITY_COLORS = {
  Critical: 'bg-red-500/10 text-red-500 border-red-500/20',
  High: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  Medium: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  Low: 'bg-blue-500/10 text-blue-500 border-blue-500/20'
};

export default function Alerts({ onAlertClick }: { onAlertClick: (id: number) => void }) {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const res = await axios.get('/api/alerts');
        setAlerts(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 5000);
    return () => clearInterval(interval);
  }, []);

  const filteredAlerts = filter === 'All' 
    ? alerts 
    : alerts.filter(a => a.severity === filter);

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Security Alerts</h1>
          <p className="text-zinc-500 text-sm">Real-time threat detection and incident management</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
            <input 
              type="text" 
              placeholder="Search by IP or Rule..." 
              className="bg-zinc-900 border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-emerald-500 transition-colors w-64"
            />
          </div>
          <div className="flex bg-zinc-900 border border-zinc-800 rounded-lg p-1">
            {['All', 'Critical', 'High', 'Medium'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                  filter === f ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-800/20">
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Severity</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Rule Triggered</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Source IP</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Timestamp</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {filteredAlerts.map((alert) => (
                <tr 
                  key={alert.id} 
                  className="hover:bg-zinc-800/30 transition-colors cursor-pointer group"
                  onClick={() => onAlertClick(alert.id)}
                >
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${SEVERITY_COLORS[alert.severity as keyof typeof SEVERITY_COLORS]}`}>
                      {alert.severity.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-zinc-200">{alert.rule_triggered}</p>
                    <p className="text-xs text-zinc-500 truncate max-w-[200px]">{alert.description}</p>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-zinc-400">
                    {alert.source_ip}
                  </td>
                  <td className="px-6 py-4 text-xs text-zinc-500">
                    {format(new Date(alert.timestamp), 'MMM dd, HH:mm:ss')}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`flex items-center gap-1.5 text-xs ${
                      alert.status === 'Open' ? 'text-red-400' : 
                      alert.status === 'Investigating' ? 'text-yellow-400' : 'text-emerald-400'
                    }`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${
                        alert.status === 'Open' ? 'bg-red-400' : 
                        alert.status === 'Investigating' ? 'bg-yellow-400' : 'bg-emerald-400'
                      }`} />
                      {alert.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button className="p-2 hover:bg-zinc-700 rounded-lg text-zinc-500 group-hover:text-emerald-400 transition-colors">
                      <ChevronRight size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredAlerts.length === 0 && !loading && (
          <div className="p-12 text-center">
            <div className="inline-flex p-4 bg-zinc-800 rounded-full mb-4">
              <Shield className="text-zinc-600" size={32} />
            </div>
            <p className="text-zinc-400 font-medium">No alerts found matching your filters.</p>
            <p className="text-zinc-600 text-sm">System is currently monitoring for threats.</p>
          </div>
        )}
      </div>
    </div>
  );
}
