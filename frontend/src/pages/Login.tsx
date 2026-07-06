import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Shield, Fingerprint, Lock, ShieldAlert, Key } from "lucide-react";

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, register, isMfaRequired, mfaReasons, clearMfaPrompt, token } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("User");
  const [mfaCode, setMfaCode] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (token) {
      navigate("/dashboard", { replace: true });
    }
  }, [token, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      if (isRegister) {
        await register(username, email, password, role);
        setIsRegister(false);
        setEmail("");
        setPassword("");
        setUsername("");
        setRole("User");
        setError("");
      } else {
        const fingerprint = window.navigator.userAgent.replace(/\s/g, "");
        await login(username, password, fingerprint);
        navigate("/dashboard", { replace: true });
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Credentials matching failed. Access denied.");
    }
  };

  const handleMfaVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (mfaCode === "123456" || mfaCode === "000000") {
      clearMfaPrompt();
      navigate("/dashboard", { replace: true });
    } else {
      setError("Invalid multi-factor code. Try 123456 for simulated verification.");
    }
  };

  return (
    <div className="min-h-screen bg-[#050308] flex items-center justify-center p-4 relative text-slate-200">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.14),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(236,72,153,0.12),_transparent_26%)]" />
      <div className="relative z-10 w-full max-w-3xl rounded-[2rem] border border-slate-800/70 bg-[#07050f]/95 p-8 shadow-[0_0_80px_rgba(0,0,0,0.45)] backdrop-blur-xl">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[1.5rem] border border-slate-900/70 bg-[#090713]/95 p-7 shadow-[0_0_40px_rgba(0,0,0,0.35)]">
            <div className="inline-flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-cyber-violet/10 text-cyber-violet">
                <Shield className="h-7 w-7" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.35em] text-slate-500">Aegis Fusion</p>
                <h1 className="mt-2 text-3xl font-bold text-white font-cyber">Adaptive Identity Gateway</h1>
              </div>
            </div>
            <p className="mt-5 text-sm leading-7 text-slate-400">Authenticate with decentralized DID binding, behavior-aware MFA, and an enterprise SOC-ready access surface.</p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl border border-slate-800/70 bg-[#050611]/90 p-4 text-[11px] text-slate-400">
                <p className="uppercase tracking-[0.25em] text-slate-500">Security posture</p>
                <p className="mt-3 text-white font-semibold">High Assurance</p>
              </div>
              <div className="rounded-3xl border border-slate-800/70 bg-[#050611]/90 p-4 text-[11px] text-slate-400">
                <p className="uppercase tracking-[0.25em] text-slate-500">Network seed</p>
                <p className="mt-3 text-white font-semibold">Decentralized</p>
              </div>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-cyber-cyan/20 bg-[#04030a]/95 p-7 shadow-[0_0_40px_rgba(6,182,212,0.12)]">
            <div className="mb-6 flex items-center gap-3 text-slate-300">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-3xl bg-cyber-cyan/10 text-cyber-cyan">
                <Fingerprint className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.35em] text-slate-500">Behavioral MFA</p>
                <h2 className="text-xl font-semibold text-white">Adaptive validation</h2>
              </div>
            </div>

            {error && (
              <div className="mb-4 rounded-3xl border border-red-800/70 bg-red-950/20 p-4 text-slate-100">
                <div className="flex items-start gap-2 text-sm text-red-300">
                  <ShieldAlert className="mt-0.5 h-4 w-4" />
                  <span>{error}</span>
                </div>
              </div>
            )}

            {isMfaRequired ? (
              <form onSubmit={handleMfaVerify} className="space-y-4">
                <div className="rounded-3xl border border-red-800/70 bg-red-950/10 p-4 text-[11px] text-red-200">
                  <div className="flex items-center gap-2 font-semibold text-red-200">
                    <Fingerprint className="h-4 w-4" />
                    <span>Zero Trust anomaly triggered</span>
                  </div>
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-slate-400">
                    {mfaReasons.map((reason, index) => (
                      <li key={index}>{reason}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300">MFA Code</label>
                  <div className="relative mt-2">
                    <Key className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-500" />
                    <input
                      type="text"
                      required
                      value={mfaCode}
                      onChange={(e) => setMfaCode(e.target.value)}
                      placeholder="123456"
                      className="w-full rounded-3xl border border-slate-800/80 bg-[#02030b] px-12 py-3 text-sm text-white focus:border-cyber-pink focus:outline-none"
                    />
                  </div>
                </div>

                <button className="w-full rounded-3xl bg-cyber-pink px-4 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-pink-500">
                  Verify Multi-Factor ID
                </button>
                <button
                  type="button"
                  onClick={clearMfaPrompt}
                  className="w-full rounded-3xl border border-slate-800/80 bg-[#02030b] px-4 py-3 text-sm text-slate-400 transition hover:text-white"
                >
                  Cancel
                </button>
              </form>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300">Username</label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter username"
                    className="w-full rounded-3xl border border-slate-800/80 bg-[#02030b] px-4 py-3 text-sm text-white focus:border-cyber-cyan focus:outline-none"
                  />
                </div>

                {isRegister && (
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300">Email address</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@organization.com"
                      className="w-full rounded-3xl border border-slate-800/80 bg-[#02030b] px-4 py-3 text-sm text-white focus:border-cyber-cyan focus:outline-none"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300">Password</label>
                  <div className="relative mt-2">
                    <Lock className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-slate-500" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••"
                      className="w-full rounded-3xl border border-slate-800/80 bg-[#02030b] px-4 py-3 pr-12 text-sm text-white focus:border-cyber-cyan focus:outline-none"
                    />
                  </div>
                </div>

                {isRegister && (
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300">Assign role</label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full rounded-3xl border border-slate-800/80 bg-[#02030b] px-4 py-3 text-sm text-white focus:border-cyber-cyan focus:outline-none"
                    >
                      {['User', 'SOC Analyst', 'Security Analyst', 'Auditor', 'Compliance Officer', 'Admin'].map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                )}

                <button className="w-full rounded-3xl bg-gradient-to-r from-purple-800 to-indigo-800 px-4 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white transition hover:from-purple-700 hover:to-indigo-700">
                  {isRegister ? "Register security profile" : "Verify identity gateway"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsRegister(!isRegister);
                    setError("");
                  }}
                  className="w-full rounded-3xl border border-slate-800/80 bg-[#02030b] px-4 py-3 text-sm text-slate-400 transition hover:text-white"
                >
                  {isRegister ? "Already registered? Sign in" : "Need a security credential? Register"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
export default Login;
