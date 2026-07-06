import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { ShieldAlert, UploadCloud, Binary, Activity, Clock } from "lucide-react";
import GlobeScene from "../components/GlobeScene";

interface TimelineItem {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: string;
  severity: string;
  user: string;
}

export const Dashboard: React.FC = () => {
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [health, setHealth] = useState<any>(null);
  const [wsLogs, setWsLogs] = useState<any[]>([]);

  const data = [
    { name: "00:00", uploads: 4, blocked: 0 },
    { name: "04:00", uploads: 12, blocked: 1 },
    { name: "08:00", uploads: 23, blocked: 2 },
    { name: "12:00", uploads: 42, blocked: 5 },
    { name: "16:00", uploads: 31, blocked: 0 },
    { name: "20:00", uploads: 19, blocked: 1 }
  ];

  const pieData = [
    { name: "Ransomware Blocked", value: 3, color: "#ec4899" },
    { name: "PII Leaks Prevented", value: 8, color: "#8b5cf6" },
    { name: "Trojan Backdoors", value: 2, color: "#06b6d4" },
    { name: "Steganography Detections", value: 4, color: "#f59e0b" }
  ];

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const timelineRes = await axios.get("/api/forensics/timeline");
        setTimeline(timelineRes.data);

        const healthRes = await axios.get("/api/admin/system-health");
        setHealth(healthRes.data);
      } catch {
        console.warn("Unable to connect to live services APIs. Operating in simulated dashboard feed.");
      }
    };

    fetchStats();

    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const socket = new WebSocket(`${wsProtocol}//${window.location.host}`);

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setWsLogs((prev) => [data, ...prev].slice(0, 10));

        if (data.type === "THREAT_ALERT" || data.type === "UPLOAD_SUCCESS") {
          fetchStats();
        }
      } catch {
        console.error("Websocket parsing error.");
      }
    };

    return () => {
      socket.close();
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1.7fr_0.9fr]">
        <div className="glass-panel rounded-3xl p-6 border border-slate-900/80 shadow-[0_20px_80px_rgba(0,0,0,0.15)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">SOC Overview</p>
              <h1 className="mt-2 text-3xl font-bold font-cyber text-white">Command Center Intelligence</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-400">Live telemetry, threat scoring, and blockchain-backed integrity across your enterprise perimeter.</p>
            </div>

            <div className="inline-flex items-center gap-3 rounded-3xl border border-cyber-cyan/20 bg-[#04030c]/80 px-5 py-3 text-[11px] uppercase tracking-[0.25em] text-cyber-cyan">
              <Clock className="h-4 w-4 animate-spin" />
              Live tracking enabled
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl bg-[#090815]/90 p-5 border border-slate-900/70">
              <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">threat intercepts</p>
              <h2 className="mt-3 text-4xl font-bold text-white">{timeline.filter((t) => t.type === "THREAT").length || 4}</h2>
              <p className="mt-2 text-[11px] text-slate-400">Blocks from the SOC matrix in the last 24 hours.</p>
            </div>
            <div className="rounded-3xl bg-[#090815]/90 p-5 border border-slate-900/70">
              <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">encrypted files</p>
              <h2 className="mt-3 text-4xl font-bold text-cyber-cyan">{health?.stats?.fileCount || 17}</h2>
              <p className="mt-2 text-[11px] text-slate-400">Files secured via IPFS + blockchain anchor.</p>
            </div>
            <div className="rounded-3xl bg-[#090815]/90 p-5 border border-slate-900/70">
              <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">trust index</p>
              <h2 className="mt-3 text-4xl font-bold text-cyber-neonGreen">98.3%</h2>
              <p className="mt-2 text-[11px] text-slate-400">Real-time zero trust posture for the SOC.</p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl overflow-hidden border border-slate-900/80 shadow-[0_20px_70px_rgba(0,0,0,0.12)]">
          <GlobeScene />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_0.9fr]">
        <div className="glass-panel rounded-3xl p-6 border border-slate-900/80 shadow-[0_20px_80px_rgba(0,0,0,0.15)]">
          <div className="flex items-center justify-between gap-3 mb-5">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">ingress analytics</p>
              <h2 className="text-xl font-bold text-white font-cyber">Agent Activity Timeline</h2>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#04030c]/80 px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-slate-400 border border-slate-900/70">
              <Activity className="h-4 w-4 text-cyber-neonGreen" />
              High fidelity
            </div>
          </div>
          <div className="h-80 rounded-3xl bg-[#04030c]/80 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorUploads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorBlocked" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ec4899" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#191826" />
                <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: "10px", fontFamily: "JetBrains Mono" }} />
                <YAxis stroke="#64748b" style={{ fontSize: "10px", fontFamily: "JetBrains Mono" }} />
                <Tooltip contentStyle={{ backgroundColor: "#07060f", borderColor: "#8b5cf6" }} />
                <Area type="monotone" dataKey="uploads" name="Verified Uploads" stroke="#06b6d4" fillOpacity={1} fill="url(#colorUploads)" />
                <Area type="monotone" dataKey="blocked" name="Blocked Threats" stroke="#ec4899" fillOpacity={1} fill="url(#colorBlocked)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel rounded-3xl p-6 border border-slate-900/80 shadow-[0_20px_80px_rgba(0,0,0,0.15)]">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-bold text-white font-cyber uppercase tracking-[0.2em]">Threat vector distribution</h2>
            <span className="text-[11px] text-slate-400">MITRE aligned</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={48} outerRadius={82} paddingAngle={6} dataKey="value">
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "#07060f", borderColor: "#8b5cf6" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-5 space-y-3 text-[11px] font-mono text-slate-300">
            {pieData.map((item, index) => (
              <div key={index} className="flex items-center justify-between rounded-3xl bg-[#04030c]/80 px-4 py-3 border border-slate-900/70">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span>{item.name}</span>
                </div>
                <span className="font-semibold text-white">{item.value} blocked</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="glass-panel rounded-3xl p-6 border border-slate-900/80 shadow-[0_20px_80px_rgba(0,0,0,0.15)]">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-bold text-white font-cyber uppercase tracking-[0.2em]">Live Threat Telemetry</h2>
            <span className="rounded-full bg-cyber-cyan/10 px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-cyber-cyan border border-cyber-cyan/20">Streaming</span>
          </div>
          <div className="h-72 overflow-y-auto space-y-4 pr-2 font-mono text-[11px] text-slate-300">
            {wsLogs.length === 0 ? (
              <div className="text-slate-500 h-full flex items-center justify-center">Awaiting adversary vector stream...</div>
            ) : (
              wsLogs.map((log, idx) => (
                <div key={idx} className="rounded-3xl border border-slate-900/70 bg-[#04030c]/85 p-4">
                  <div className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-[0.2em] text-slate-500">
                    <span className="text-cyber-pink">{log.type}</span>
                    <span>{new Date(log.payload?.timestamp || Date.now()).toLocaleTimeString()}</span>
                  </div>
                  <pre className="mt-3 text-[11px] leading-6 text-slate-300 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(log.payload, null, 2)}</pre>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="glass-panel rounded-3xl p-6 border border-slate-900/80 shadow-[0_20px_80px_rgba(0,0,0,0.15)]">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-bold text-white font-cyber uppercase tracking-[0.2em]">Decision Timeline</h2>
            <span className="rounded-full bg-cyber-violet/10 px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-cyber-violet border border-cyber-violet/20">Audit</span>
          </div>
          <div className="h-72 overflow-y-auto space-y-4 pr-2 text-[11px] font-mono text-slate-300">
            {timeline.length === 0 ? (
              <div className="text-slate-500 h-full flex items-center justify-center">Analyzing audit logs...</div>
            ) : (
              timeline.map((item, idx) => (
                <div key={idx} className="rounded-3xl border border-slate-900/70 bg-[#04030c]/85 p-4">
                  <div className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-[0.2em] text-slate-500">
                    <span>{item.title}</span>
                    <span>{new Date(item.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <p className="mt-3 text-slate-300 text-[12px] leading-6">{item.description}</p>
                  <div className="mt-3 flex items-center gap-3 text-[10px] uppercase tracking-[0.18em] text-slate-400">
                    <span className={item.severity === "CRITICAL" ? "text-cyber-pink" : item.severity === "WARNING" ? "text-cyber-gold" : "text-cyber-cyan"}>{item.severity}</span>
                    <span>{item.user}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
export default Dashboard;
