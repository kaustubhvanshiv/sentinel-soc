import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Terminal, Search, Filter, Download, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

export default function Logs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [serviceFilter, setServiceFilter] = useState('All');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/logs', {
        params: {
          service: serviceFilter === 'All' ? undefined : serviceFilter.toLowerCase(),
          limit: 100
        }
      });
      setLogs(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [serviceFilter]);

  const filteredLogs = logs.filter(log => 
    log.source_ip.includes(search) || 
    log.raw_log.toLowerCase().includes(search.toLowerCase()) ||
    (log.username && log.username.includes(search))
  );

  return (
    <div className="space-y-6 h-full flex flex-col animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Log Explorer</h1>
          <p className="text-zinc-500 text-sm">Query and analyze raw system telemetry</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchLogs}
            className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 transition-colors"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
            <input 
              type="text" 
              placeholder="Search logs..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-emerald-500 transition-colors w-64"
            />
          </div>
          <select 
            value={serviceFilter}
            onChange={(e) => setServiceFilter(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-emerald-500 transition-colors text-zinc-300"
          >
            <option>All Services</option>
            <option>SSH</option>
            <option>HTTP</option>
            <option>Auth</option>
          </select>
          <button className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-medium transition-colors">
            <Download size={16} />
            Export
          </button>
        </div>
      </div>

      <div className="flex-1 bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col">
        <div className="overflow-x-auto flex-1 custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead className="sticky top-0 z-10 bg-zinc-900 border-b border-zinc-800">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider w-48">Timestamp</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider w-32">Service</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider w-40">Source IP</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider w-32">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Message</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 font-mono text-[11px]">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-zinc-800/30 transition-colors group">
                  <td className="px-6 py-3 text-zinc-500">
                    {format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss.SSS')}
                  </td>
                  <td className="px-6 py-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      log.service === 'ssh' ? 'bg-indigo-500/10 text-indigo-400' : 
                      log.service === 'http' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-500/10 text-zinc-400'
                    }`}>
                      {log.service.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-zinc-300">{log.source_ip}</td>
                  <td className="px-6 py-3">
                    <span className={log.status === '200' ? 'text-emerald-500' : log.status === '401' || log.status === '403' ? 'text-red-500' : 'text-zinc-400'}>
                      {log.status}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-zinc-400 group-hover:text-zinc-200 transition-colors truncate max-w-md">
                    {log.raw_log}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredLogs.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center h-64 text-zinc-500">
              <Terminal size={48} className="mb-4 opacity-20" />
              <p>No logs found matching criteria.</p>
            </div>
          )}
        </div>
        
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/50 flex items-center justify-between text-xs text-zinc-500">
          <div>Showing {filteredLogs.length} of {logs.length} indexed logs</div>
          <div className="flex items-center gap-2">
            <button className="p-1 hover:bg-zinc-800 rounded border border-zinc-800 disabled:opacity-50" disabled><ChevronLeft size={16} /></button>
            <span className="px-2">Page 1</span>
            <button className="p-1 hover:bg-zinc-800 rounded border border-zinc-800 disabled:opacity-50" disabled><ChevronRight size={16} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}
