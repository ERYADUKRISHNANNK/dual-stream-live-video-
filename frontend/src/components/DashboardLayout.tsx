import React from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import {
  Shield,
  HardDrive,
  Binary,
  ClipboardCheck,
  Bot,
  Cpu,
  LogOut,
  Wallet,
  Activity,
  Fingerprint
} from "lucide-react";

export const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout, walletAddress, biometrics } = useAuth();
  const location = useLocation();

  const navigation = [
    { name: "SOC Console", path: "/dashboard", icon: Shield },
    { name: "Secure Vault", path: "/vault", icon: HardDrive },
    { name: "Forensics", path: "/forensics", icon: Binary },
    { name: "Compliance", path: "/compliance", icon: ClipboardCheck },
    { name: "AI Copilot", path: "/copilot", icon: Bot }
  ];

  if (user?.role === "Admin" || user?.role === "Super Admin") {
    navigation.push({ name: "System Settings", path: "/admin", icon: Cpu });
  }

  return (
    <div className="flex min-h-screen bg-[#04030b] text-slate-100">
      <aside className="w-72 border-r border-slate-900/80 bg-[#07050e] shadow-[10px_0_60px_rgba(0,0,0,0.35)] flex flex-col justify-between overflow-hidden">
        <div>
          <div className="px-6 py-7 border-b border-slate-900/60 space-y-2">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-cyber-violet" />
              <div>
                <h1 className="text-sm font-bold uppercase tracking-[0.3em] text-white font-cyber">Aegis Nexus</h1>
                <p className="text-[10px] uppercase text-slate-400 tracking-[0.18em]">Enterprise SOC Command</p>
              </div>
            </div>
          </div>

          <nav className="px-4 py-5 space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = location.pathname === item.path;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`group flex items-center gap-3 rounded-3xl px-4 py-3 text-sm transition-all duration-300 ${
                    active
                      ? "bg-cyber-cyan/10 text-cyber-cyan shadow-[0_10px_40px_rgba(6,182,212,0.15)]"
                      : "text-slate-400 hover:bg-slate-900/70 hover:text-white"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="font-cyber leading-none">{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-5 space-y-4 bg-gradient-to-t from-[#090610]/95 to-transparent border-t border-slate-900/50">
          <div className="rounded-3xl bg-[#080811]/80 p-4 border border-slate-800/80 shadow-[inset_0_0_20px_rgba(0,0,0,0.2)]">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyber-violet/15 text-cyber-cyan">
                {user?.username?.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-xs uppercase text-slate-400">Operator</p>
                <p className="text-sm font-semibold text-white truncate">{user?.username}</p>
              </div>
            </div>
            <div className="mt-3 text-[10px] text-slate-400 space-y-1">
              <p>{user?.role || "Analyst"}</p>
              <p>DID: {walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-6)}` : "not linked"}</p>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800/80 bg-[#080811]/80 p-4 space-y-3 text-[10px] text-slate-300">
            <div className="flex items-center justify-between text-slate-400 uppercase tracking-[0.18em]">
              <span>Biometrics</span>
              <span className="text-cyber-cyan">Live</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-2xl bg-[#05060f]/90 p-3 border border-slate-800/80 text-slate-300">
                <p className="text-[9px] uppercase tracking-[0.18em] text-slate-500">Keystroke</p>
                <p className="font-semibold text-white">{biometrics.keystrokeHold} ms</p>
              </div>
              <div className="rounded-2xl bg-[#05060f]/90 p-3 border border-slate-800/80 text-slate-300">
                <p className="text-[9px] uppercase tracking-[0.18em] text-slate-500">Jitter</p>
                <p className="font-semibold text-white">{biometrics.mouseJitter}</p>
              </div>
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full rounded-3xl bg-red-950/70 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-red-200 hover:bg-red-900 transition"
          >
            <span className="inline-flex items-center gap-2 justify-center">
              <LogOut className="h-4 w-4" />
              Disengage
            </span>
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="border-b border-slate-900/70 bg-[#080811]/85 backdrop-blur-xl px-8 py-4 flex items-center justify-between"
        >
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Aegis Nexus SOC</p>
            <h2 className="text-xl font-bold text-white font-cyber">Enterprise Threat Command</h2>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <div className="inline-flex items-center gap-2 rounded-3xl bg-[#0e0d17]/80 px-4 py-2 border border-slate-800">
              <Activity className="h-4 w-4 text-cyber-neonGreen animate-pulse" />
              <span>Operational</span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-3xl bg-[#0e0d17]/80 px-4 py-2 border border-slate-800">
              <span className="text-slate-400">Threat Index</span>
              <span className="font-semibold text-cyber-cyan">14</span>
            </div>
          </div>
        </motion.header>

        <section className="flex-1 overflow-y-auto px-8 py-7 relative">
          <div className="pointer-events-none absolute top-4 right-4 h-72 w-72 rounded-full bg-cyber-cyan/10 blur-3xl" />
          <div className="pointer-events-none absolute bottom-8 left-8 h-64 w-64 rounded-full bg-cyber-violet/10 blur-3xl" />
          {children}
        </section>
      </main>
    </div>
  );
};
export default DashboardLayout;
