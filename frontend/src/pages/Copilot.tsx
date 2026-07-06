import React, { useState } from "react";
import axios from "axios";
import { Send, Bot, ShieldCheck, ClipboardList, RefreshCw } from "lucide-react";

interface Message {
  sender: "user" | "copilot";
  text: string;
  mitreTactics?: string[];
  actions?: string[];
}

export const Copilot: React.FC = () => {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: "copilot",
      text: "Hello! I am your AI Security Copilot. I analyze system logs, threat vectors, decentralized DIDs, and regulatory compliance standards. Ask me anything about our SOC incidents or safety parameters."
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    const userText = query;
    setMessages((prev) => [...prev, { sender: "user", text: userText }]);
    setQuery("");
    setIsTyping(true);

    try {
      const response = await axios.post("/api/copilot/query", { query: userText });
      const data = response.data;
      
      setMessages((prev) => [
        ...prev,
        {
          sender: "copilot",
          text: data.response,
          mitreTactics: data.mitre_tactics,
          actions: data.suggested_action_plan
        }
      ]);
    } catch {
      // Offline fallback
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            sender: "copilot",
            text: "Offline response: AI engine is currently unreachable. Make sure the FastAPI service is active on port 8000.",
            actions: ["Check AI docker container", "Inspect system routing"]
          }
        ]);
      }, 500);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="glass-panel rounded-xl h-[calc(100vh-12rem)] flex flex-col overflow-hidden">
      {/* Panel Header */}
      <div className="p-4 border-b border-cyber-border bg-[#090610] flex items-center space-x-3">
        <Bot className="h-6 w-6 text-cyber-cyan animate-bounce" />
        <div>
          <h3 className="text-sm font-bold font-cyber text-white">AI SEC DEFENSE COPILOT</h3>
          <p className="text-[10px] text-slate-400 font-mono">SOC incident summaries & mitigation recommendations</p>
        </div>
      </div>

      {/* Message List */}
      <div className="flex-1 p-6 overflow-y-auto space-y-4">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-xl p-4 rounded-xl text-xs font-mono space-y-3 ${
              msg.sender === "user" 
                ? "bg-cyber-violet/30 border border-cyber-violet text-white" 
                : "bg-slate-950/80 border border-slate-900 text-slate-300"
            }`}>
              <div className="flex items-center space-x-2 border-b border-slate-900 pb-1.5 font-bold">
                {msg.sender === "copilot" ? (
                  <>
                    <Bot className="h-4 w-4 text-cyber-cyan" />
                    <span className="text-cyber-cyan font-cyber">AEGIS AI SECURITY</span>
                  </>
                ) : (
                  <span className="text-cyber-violet">ANALYST</span>
                )}
              </div>

              <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>

              {/* MITRE Mapping */}
              {msg.mitreTactics && msg.mitreTactics.length > 0 && (
                <div className="p-2 bg-red-950/20 border border-red-900/40 rounded space-y-1">
                  <span className="text-cyber-pink font-bold text-[9px] block">MAPPED MITRE TACTICS:</span>
                  <div className="flex flex-wrap gap-1">
                    {msg.mitreTactics.map((t, i) => (
                      <span key={i} className="px-1.5 py-0.5 bg-red-950/60 text-red-300 rounded text-[9px] border border-red-800">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommended Action Items */}
              {msg.actions && msg.actions.length > 0 && (
                <div className="p-2.5 bg-black/60 border border-slate-900 rounded space-y-1">
                  <span className="text-cyber-cyan font-bold text-[9px] flex items-center space-x-1">
                    <ClipboardList className="h-3.5 w-3.5" />
                    <span>SUGGESTED RESPONSE PLAYBOOK:</span>
                  </span>
                  <ul className="list-disc list-inside text-slate-400 text-[10px] space-y-0.5">
                    {msg.actions.map((act, i) => (
                      <li key={i}>{act}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-slate-950/80 border border-slate-900 p-4 rounded-xl text-xs font-mono text-slate-400 flex items-center space-x-2">
              <RefreshCw className="h-4 w-4 animate-spin text-cyber-cyan" />
              <span>Analyzing threat databases and compiling mitigation rules...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-cyber-border bg-[#090610] flex space-x-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask a security question, e.g., 'Draft a GDPR remediation report' or 'Explain how our smart contract preserves custody'"
          className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyber-cyan"
        />
        <button
          type="submit"
          className="p-2 bg-cyber-cyan/20 border border-cyber-cyan hover:bg-cyber-cyan/30 text-cyber-cyan rounded-lg transition-all shadow-cyan"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
};
export default Copilot;
