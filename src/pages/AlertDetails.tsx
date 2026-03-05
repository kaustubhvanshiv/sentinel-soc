import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ArrowLeft, Shield, Clock, MapPin, Terminal, CheckCircle, AlertOctagon, Info } from 'lucide-react';
import { format } from 'date-fns';

export default function AlertDetails({ id, onBack }: { id: number, onBack: () => void }) {
  const [alert, setAlert] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAlert = async () => {
      try {
        const res = await axios.get(`/api/alerts/${id}`);
        setAlert(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAlert();
  }, [id]);

  const updateStatus = async (status: string) => {
    try {
      await axios.patch(`/api/alerts/${id}`, { status });
      setAlert({ ...alert, status });
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-full">Loading Incident Data...</div>;
  if (!alert) return <div>Alert not found.</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors group"
        >
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          Back to Alerts
        </button>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => updateStatus('Investigating')}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
              alert.status === 'Investigating' ? 'bg-yellow-500/10 border-yellow-500/50 text-yellow-500' : 'border-zinc-800 text-zinc-400 hover:bg-zinc-800'
            }`}
          >
            Investigate
          </button>
          <button 
            onClick={() => updateStatus('Resolved')}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
              alert.status === 'Resolved' ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-500' : 'border-zinc-800 text-zinc-400 hover:bg-zinc-800'
            }`}
          >
            Mark Resolved
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Details */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    alert.severity === 'Critical' ? 'bg-red-500 text-white' : 'bg-orange-500 text-white'
                  }`}>
                    {alert.severity}
                  </span>
                  <span className="text-zinc-500 text-xs font-mono">INCIDENT-{alert.id.toString().padStart(6, '0')}</span>
                </div>
                <h1 className="text-3xl font-bold tracking-tight">{alert.rule_triggered}</h1>
              </div>
              <div className="p-4 bg-zinc-800/50 rounded-2xl border border-zinc-800">
                <AlertOctagon size={32} className={alert.severity === 'Critical' ? 'text-red-500' : 'text-orange-500'} />
              </div>
            </div>

            <p className="text-zinc-400 text-lg leading-relaxed mb-8">
              {alert.description}
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-6 border-y border-zinc-800">
              <DetailItem icon={Clock} label="Detected At" value={format(new Date(alert.timestamp), 'HH:mm:ss')} subValue={format(new Date(alert.timestamp), 'MMM dd, yyyy')} />
              <DetailItem icon={Shield} label="Source IP" value={alert.source_ip} subValue="External Network" />
              <DetailItem icon={MapPin} label="Location" value="United States" subValue="Ashburn, VA" />
              <DetailItem icon={CheckCircle} label="Status" value={alert.status} subValue="Current Phase" />
            </div>
          </div>

          {/* Related Logs */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal size={20} className="text-emerald-500" />
                <h3 className="font-semibold">Evidence & Related Logs</h3>
              </div>
              <span className="text-xs text-zinc-500 font-mono">{alert.logs?.length || 0} Events Found</span>
            </div>
            <div className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-zinc-800/20">
                    <tr>
                      <th className="px-6 py-3 text-[10px] font-bold text-zinc-500 uppercase">Time</th>
                      <th className="px-6 py-3 text-[10px] font-bold text-zinc-500 uppercase">Service</th>
                      <th className="px-6 py-3 text-[10px] font-bold text-zinc-500 uppercase">Raw Log</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800 font-mono text-[11px]">
                    {alert.logs?.map((log: any) => (
                      <tr key={log.id} className="hover:bg-zinc-800/20">
                        <td className="px-6 py-3 text-zinc-400 whitespace-nowrap">{format(new Date(log.timestamp), 'HH:mm:ss.SSS')}</td>
                        <td className="px-6 py-3 text-emerald-500">{log.service.toUpperCase()}</td>
                        <td className="px-6 py-3 text-zinc-300 break-all">{log.raw_log}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: IP Intelligence */}
        <div className="space-y-8">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
            <h3 className="font-semibold mb-6 flex items-center gap-2">
              <Info size={18} className="text-blue-400" />
              Threat Intelligence
            </h3>
            <div className="space-y-6">
              <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-xl">
                <p className="text-xs text-red-400 font-bold uppercase mb-1">Risk Score</p>
                <p className="text-3xl font-bold text-red-500">88/100</p>
                <p className="text-[10px] text-zinc-500 mt-2">High probability of malicious intent based on historical patterns.</p>
              </div>
              
              <div className="space-y-4">
                <IntelligenceRow label="First Seen" value="2 days ago" />
                <IntelligenceRow label="Total Attacks" value="142 events" />
                <IntelligenceRow label="Known Proxies" value="None detected" />
                <IntelligenceRow label="ISP" value="DigitalOcean, LLC" />
              </div>

              <button className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-sm font-medium transition-colors">
                View Full IP Profile
              </button>
            </div>
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
            <h3 className="font-semibold mb-4">Recommended Actions</h3>
            <ul className="space-y-3">
              <ActionItem text="Block source IP on Edge Firewall" />
              <ActionItem text="Reset credentials for affected users" />
              <ActionItem text="Enable MFA for all admin accounts" />
              <ActionItem text="Scan system for persistent backdoors" />
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailItem({ icon: Icon, label, value, subValue }: any) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 text-zinc-500">
        <Icon size={14} />
        <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-sm font-bold text-zinc-200">{value}</p>
      <p className="text-[10px] text-zinc-500">{subValue}</p>
    </div>
  );
}

function IntelligenceRow({ label, value }: any) {
  return (
    <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
      <span className="text-xs text-zinc-500">{label}</span>
      <span className="text-xs font-medium text-zinc-300">{value}</span>
    </div>
  );
}

function ActionItem({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-3 text-xs text-zinc-400">
      <div className="mt-1 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
      {text}
    </li>
  );
}
