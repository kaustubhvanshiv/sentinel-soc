import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, PieChart, Pie, Cell 
} from 'recharts';
import { 
  Activity, AlertCircle, ShieldAlert, Database, 
  ArrowUpRight, ArrowDownRight, TrendingUp 
} from 'lucide-react';

const COLORS = {
  Critical: '#ef4444',
  High: '#f97316',
  Medium: '#eab308',
  Low: '#22c55e',
  Info: '#3b82f6'
};

export default function Dashboard({ onAlertClick }: { onAlertClick: (id: number) => void }) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await axios.get('/api/stats');
        setStats(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !stats) return <div className="flex items-center justify-center h-full">Loading SOC Metrics...</div>;

  const severityData = stats.severityDist.map((s: any) => ({
    name: s.severity,
    value: s.count
  }));

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Logs Ingested" 
          value={stats.totalLogs.toLocaleString()} 
          icon={Database} 
          trend="+12.5%" 
          color="emerald"
        />
        <StatCard 
          title="Active Alerts" 
          value={stats.activeAlerts} 
          icon={AlertCircle} 
          trend="+2" 
          color="red"
        />
        <StatCard 
          title="Avg. Response Time" 
          value="4.2m" 
          icon={Activity} 
          trend="-15%" 
          color="blue"
        />
        <StatCard 
          title="System Integrity" 
          value="99.9%" 
          icon={ShieldAlert} 
          trend="Stable" 
          color="indigo"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Attack Timeline */}
        <div className="lg:col-span-2 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">Attack Timeline (24h)</h3>
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <div className="w-3 h-3 rounded-full bg-emerald-500/20 border border-emerald-500" />
              Alert Frequency
            </div>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.timeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="hour" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }}
                  itemStyle={{ color: '#10b981' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#10b981" 
                  strokeWidth={3} 
                  dot={{ r: 4, fill: '#10b981', strokeWidth: 0 }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Severity Distribution */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-6">Severity Distribution</h3>
          <div className="h-[300px] flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={severityData}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {severityData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS] || '#3f3f46'} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-bold">{stats.activeAlerts}</span>
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest">Total Alerts</span>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {severityData.map((s: any) => (
              <div key={s.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[s.name as keyof typeof COLORS] }} />
                  <span className="text-zinc-400">{s.name}</span>
                </div>
                <span className="font-mono">{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Suspicious IPs */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-6">Top Threat Actors (IPs)</h3>
          <div className="space-y-4">
            {stats.topIps.map((ip: any) => (
              <div key={ip.ip} className="flex items-center justify-between p-3 rounded-xl bg-zinc-800/30 border border-zinc-800/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-zinc-800 rounded-lg">
                    <TrendingUp size={16} className="text-red-400" />
                  </div>
                  <div>
                    <p className="text-sm font-mono font-medium">{ip.ip}</p>
                    <p className="text-[10px] text-zinc-500 uppercase">External Source</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-red-400">{ip.attack_count}</p>
                  <p className="text-[10px] text-zinc-500 uppercase">Events</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity Feed */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-6">System Health</h3>
          <div className="space-y-6">
            <HealthItem label="Log Ingestion Engine" status="Healthy" load="12%" />
            <HealthItem label="Detection Rule Processor" status="Active" load="24%" />
            <HealthItem label="Database Storage" status="Optimal" load="8%" />
            <HealthItem label="API Gateway" status="Healthy" load="4%" />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, trend, color }: any) {
  const colorClasses = {
    emerald: 'text-emerald-400 bg-emerald-500/10',
    red: 'text-red-400 bg-red-500/10',
    blue: 'text-blue-400 bg-blue-500/10',
    indigo: 'text-indigo-400 bg-indigo-500/10',
  };

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 hover:border-zinc-700 transition-colors group">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-xl ${colorClasses[color as keyof typeof colorClasses]}`}>
          <Icon size={24} />
        </div>
        <div className="flex items-center gap-1 text-xs font-medium text-emerald-400">
          {trend}
          {trend.startsWith('+') ? <ArrowUpRight size={14} /> : trend.startsWith('-') ? <ArrowDownRight size={14} /> : null}
        </div>
      </div>
      <h4 className="text-zinc-500 text-sm font-medium">{title}</h4>
      <p className="text-3xl font-bold mt-1 tracking-tight group-hover:text-white transition-colors">{value}</p>
    </div>
  );
}

function HealthItem({ label, status, load }: any) {
  return (
    <div className="flex items-center justify-between">
      <div className="space-y-1">
        <p className="text-sm font-medium">{label}</p>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-[10px] text-zinc-500 uppercase tracking-widest">{status}</span>
        </div>
      </div>
      <div className="text-right">
        <p className="text-xs font-mono text-zinc-400">{load}</p>
        <div className="w-24 h-1.5 bg-zinc-800 rounded-full mt-1 overflow-hidden">
          <div className="h-full bg-emerald-500" style={{ width: load }} />
        </div>
      </div>
    </div>
  );
}
