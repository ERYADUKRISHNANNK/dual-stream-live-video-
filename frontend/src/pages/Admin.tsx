import React, { useEffect, useState } from "react";
import axios from "axios";
import { Cpu, Users, Eye, Edit3, ShieldAlert } from "lucide-react";

interface UserItem {
  _id: string;
  username: string;
  email: string;
  role: string;
  whitelistedIps: string[];
  active: boolean;
}

export const Admin: React.FC = () => {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [ipInput, setIpInput] = useState("");
  const [roleSelect, setRoleSelect] = useState("");
  const [healthData, setHealthData] = useState<any>(null);

  const fetchAdminData = async () => {
    try {
      const usersRes = await axios.get("/api/admin/users");
      setUsers(usersRes.data);

      const healthRes = await axios.get("/api/admin/system-health");
      setHealthData(healthRes.data);
    } catch {
      // Mock Fallback
      setUsers([
        { _id: "1", username: "yadu", email: "yadu@yadu.com", role: "Super Admin", whitelistedIps: ["127.0.0.1"], active: true },
        { _id: "2", username: "analyst", email: "analyst@aegis.com", role: "SOC Analyst", whitelistedIps: [], active: true }
      ]);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleRoleUpdate = async (userId: string, role: string) => {
    try {
      await axios.post("/api/admin/update-role", { userId, role });
      alert("User role updated successfully.");
      fetchAdminData();
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to update role.");
    }
  };

  const handleIpWhitelistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    const ips = ipInput.split(",").map(ip => ip.trim()).filter(ip => ip.length > 0);

    try {
      await axios.post("/api/admin/update-ip", { userId: editingUser._id, whitelistedIps: ips });
      alert("IP Whitelisting rules modified successfully.");
      setEditingUser(null);
      setIpInput("");
      fetchAdminData();
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to update IP Whitelist.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-bold font-cyber text-white">System Administration Panel</h2>
        <p className="text-xs text-slate-400 font-mono">Manage users, security policies, IP boundaries, and node configurations</p>
      </div>

      {/* Stats Cards */}
      {healthData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono text-xs">
          <div className="glass-panel p-6 rounded-xl space-y-2">
            <h4 className="text-slate-400">HARDHAT CONTRACT COORDINATES</h4>
            <div className="space-y-1">
              <div className="text-[10px] text-slate-500 truncate">Registry: {healthData.blockchain.fileRegistryAddress}</div>
              <div className="text-[10px] text-slate-500 truncate">DID Store: {healthData.blockchain.didAddress}</div>
            </div>
          </div>
          <div className="glass-panel p-6 rounded-xl space-y-2">
            <h4 className="text-slate-400">EVM LEDGER NODE MODE</h4>
            <div className="text-cyber-cyan font-bold text-sm uppercase">{healthData.blockchain.mode}</div>
          </div>
          <div className="glass-panel p-6 rounded-xl space-y-2">
            <h4 className="text-slate-400">IPFS INSTANCE STATUS</h4>
            <div className="text-cyber-neonGreen font-bold text-sm uppercase">{healthData.ipfs.status} ({healthData.ipfs.gateway})</div>
          </div>
        </div>
      )}

      {/* Users Directory */}
      <div className="glass-panel p-6 rounded-xl space-y-4">
        <h4 className="text-sm font-bold font-cyber text-white">USER DIRECTORY & ACCESS ROLES</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono text-slate-300">
            <thead>
              <tr className="text-slate-500 text-left border-b border-slate-900">
                <th className="pb-2">USERNAME</th>
                <th className="pb-2">EMAIL</th>
                <th className="pb-2">CURRENT ROLE</th>
                <th className="pb-2">IP WHITELISTS</th>
                <th className="pb-2 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-950">
              {users.map((u) => (
                <tr key={u._id} className="hover:bg-slate-900/30">
                  <td className="py-3 text-slate-200 font-semibold">{u.username}</td>
                  <td className="py-3 text-slate-400">{u.email}</td>
                  <td className="py-3">
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleUpdate(u._id, e.target.value)}
                      className="bg-slate-950 border border-slate-800 p-1 rounded text-white focus:outline-none focus:border-cyber-violet"
                    >
                      {["User", "Guest", "SOC Analyst", "Security Analyst", "Auditor", "Compliance Officer", "Admin", "Super Admin"].map((role) => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-3 text-slate-400">
                    {u.whitelistedIps.length === 0 ? "NONE (Open)" : u.whitelistedIps.join(", ")}
                  </td>
                  <td className="py-3 text-right">
                    <button
                      onClick={() => {
                        setEditingUser(u);
                        setIpInput(u.whitelistedIps.join(", "));
                      }}
                      className="p-1 hover:bg-slate-800 rounded text-cyber-cyan"
                      title="Edit IP boundaries"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Editing Whitelist Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="glass-panel p-6 rounded-xl w-full max-w-md space-y-4 border-neon-cyan">
            <div className="flex justify-between items-center">
              <h3 className="text-md font-bold font-cyber text-white">IP BOUNDARY BOUNDS</h3>
              <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            
            <p className="text-[10px] text-slate-400 font-mono">
              Modify network constraints for user: <span className="text-cyber-cyan font-bold">{editingUser.username}</span>
            </p>

            <form onSubmit={handleIpWhitelistSubmit} className="space-y-4 font-mono text-xs">
              <div>
                <label className="block text-slate-400 mb-1">WHITELISTS IPS (Comma separated)</label>
                <input
                  type="text"
                  placeholder="e.g. 192.168.1.1, 10.0.0.1"
                  value={ipInput}
                  onChange={(e) => setIpInput(e.target.value)}
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded text-white focus:outline-none focus:border-cyber-cyan"
                />
                <span className="text-[9px] text-slate-500 mt-1 block">Leave empty to allow all IP ingress locations.</span>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-cyber-cyan/30 hover:bg-cyber-cyan/50 border border-cyber-cyan text-white font-cyber rounded text-xs transition-all shadow-cyan"
              >
                APPLY IP BOUNDS
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default Admin;
