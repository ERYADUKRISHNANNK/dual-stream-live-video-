import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

interface User {
  id: string;
  username: string;
  role: string;
  didAddress?: string;
  rsaPublicKey?: string;
  privateKey?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  biometrics: { keystrokeHold: number; mouseJitter: number };
  walletAddress: string | null;
  isMfaRequired: boolean;
  mfaReasons: string[];
  login: (username: string, password: string, fingerprint: string) => Promise<void>;
  register: (username: string, email: string, password: string, role: string) => Promise<void>;
  logout: () => void;
  connectWallet: () => Promise<void>;
  clearMfaPrompt: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  
  // Continuous Authentication telemetry metrics
  const [biometrics, setBiometrics] = useState({ keystrokeHold: 100.0, mouseJitter: 1.0 });
  const [isMfaRequired, setIsMfaRequired] = useState(false);
  const [mfaReasons, setMfaReasons] = useState<string[]>([]);

  // 1. Biometric Telemetry Monitors
  useEffect(() => {
    // Keystroke hold timer
    let keyPressStart = 0;
    const holdTimes: number[] = [];

    const handleKeyDown = () => {
      if (keyPressStart === 0) keyPressStart = Date.now();
    };

    const handleKeyUp = () => {
      if (keyPressStart !== 0) {
        const hold = Date.now() - keyPressStart;
        holdTimes.push(hold);
        keyPressStart = 0;

        // Keep rolling average of last 10 keystrokes
        if (holdTimes.length > 10) holdTimes.shift();
        const avg = holdTimes.reduce((a, b) => a + b, 0) / holdTimes.length;
        setBiometrics((prev) => ({ ...prev, keystrokeHold: Math.round(avg) }));
      }
    };

    // Mouse movement velocity jitter calculation
    let lastMouseTime = Date.now();
    let lastX = 0;
    let lastY = 0;
    const velocities: number[] = [];

    const handleMouseMove = (e: MouseEvent) => {
      const now = Date.now();
      const dt = now - lastMouseTime;
      if (dt > 50) {
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const velocity = dist / dt;

        velocities.push(velocity);
        if (velocities.length > 20) velocities.shift();

        // Calculate variance / jitter in velocity
        const mean = velocities.reduce((a, b) => a + b, 0) / velocities.length;
        const variance = velocities.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / velocities.length;
        
        setBiometrics((prev) => ({ ...prev, mouseJitter: parseFloat((1.0 + variance * 100).toFixed(2)) }));

        lastX = e.clientX;
        lastY = e.clientY;
        lastMouseTime = now;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  // 2. Set API headers globally on biometrics updates
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      axios.defaults.headers.common["x-biometrics-keystroke-hold"] = biometrics.keystrokeHold;
      axios.defaults.headers.common["x-biometrics-mouse-jitter"] = biometrics.mouseJitter;
      axios.defaults.headers.common["x-browser-fingerprint"] = window.navigator.userAgent.replace(/\s/g, "");
    }
  }, [token, biometrics]);

  // 2b. Axios response interceptor - attempt refresh on 401 once
  useEffect(() => {
    let isRefreshing = false;
    let failedQueue: Array<() => void> = [];

    const processQueue = (error?: any, newToken?: string) => {
      failedQueue.forEach((cb) => cb());
      failedQueue = [];
    };

    const interceptor = axios.interceptors.response.use(
      (res) => res,
      async (err) => {
        const originalRequest = err.config;
        if (err.response && err.response.status === 401 && !originalRequest._retry) {
          if (isRefreshing) {
            return new Promise((resolve) => {
              failedQueue.push(() => resolve(axios(originalRequest)));
            });
          }

          originalRequest._retry = true;
          isRefreshing = true;
          try {
            const rt = refreshToken || localStorage.getItem("refreshToken");
            if (!rt) throw new Error("No refresh token");
            const resp = await axios.post("/api/auth/refresh", { refreshToken: rt });
            const data = resp.data;
            setToken(data.token);
            setRefreshToken(data.refreshToken);
            localStorage.setItem("token", data.token);
            localStorage.setItem("refreshToken", data.refreshToken);
            axios.defaults.headers.common["Authorization"] = `Bearer ${data.token}`;
            processQueue(null, data.token);
            return axios(originalRequest);
          } catch (e) {
            processQueue(e as any, null as any);
            // give up - logout locally
            setUser(null);
            setToken(null);
            setRefreshToken(null);
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            localStorage.removeItem("refreshToken");
            return Promise.reject(e);
          } finally {
            isRefreshing = false;
          }
        }
        return Promise.reject(err);
      }
    );

    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, [refreshToken]);

  // Load state on startup
  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    const savedUser = localStorage.getItem("user");
    const savedRefresh = localStorage.getItem("refreshToken");
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
      if (savedRefresh) setRefreshToken(savedRefresh);
    }
  }, []);

  const login = async (username: string, password: string, fingerprint: string) => {
    try {
      const response = await axios.post("/api/auth/login", { username, password, fingerprint });
      const data = response.data;
      
      setUser(data.user);
      setToken(data.token);
      if (data.refreshToken) {
        setRefreshToken(data.refreshToken);
        localStorage.setItem("refreshToken", data.refreshToken);
      }
      if (data.user.didAddress) setWalletAddress(data.user.didAddress);

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
    } catch (error: any) {
      if (error.response && error.response.data && error.response.data.requireMfa) {
        setIsMfaRequired(true);
        setMfaReasons(error.response.data.reasons || ["MFA validation required."]);
      }
      throw error;
    }
  };

  const register = async (username: string, email: string, password: string, role: string) => {
    await axios.post("/api/auth/register", { username, email, password, role });
  };

  const logout = () => {
    // Attempt server-side revoke of refresh token (best-effort)
    const rt = refreshToken || localStorage.getItem("refreshToken");
    if (rt) {
      axios.post("/api/auth/logout", { refreshToken: rt }).catch(() => { /* ignore */ });
    }

    setUser(null);
    setToken(null);
    setRefreshToken(null);
    setWalletAddress(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("refreshToken");
    delete axios.defaults.headers.common["Authorization"];
  };

  const connectWallet = async () => {
    try {
      // Connect using MetaMask simulation or actual provider
      const win: any = window;
      if (win.ethereum) {
        const accounts = await win.ethereum.request({ method: "eth_requestAccounts" });
        const address = accounts[0];
        setWalletAddress(address);

        // Submit address update to backend
        const response = await axios.post("/api/auth/wallet", {
          walletAddress: address,
          didUri: `did:ethr:${address}`
        });

        if (user) {
          const updated = { ...user, didAddress: address };
          setUser(updated);
          localStorage.setItem("user", JSON.stringify(updated));
        }
        console.log("Wallet connected, transaction:", response.data.txHash);
      } else {
        // Fallback to simulated wallet generation
        const mockAddress = "0x" + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
        setWalletAddress(mockAddress);
        
        await axios.post("/api/auth/wallet", {
          walletAddress: mockAddress,
          didUri: `did:ethr:${mockAddress}`
        });

        if (user) {
          const updated = { ...user, didAddress: mockAddress };
          setUser(updated);
          localStorage.setItem("user", JSON.stringify(updated));
        }
        console.log("MetaMask not found. Simulated Web3 Wallet Linked.");
      }
    } catch (err: any) {
      console.error("Wallet connection failed:", err.message);
      throw err;
    }
  };

  const clearMfaPrompt = () => {
    setIsMfaRequired(false);
    setMfaReasons([]);
  };

  return (
    <AuthContext.Provider value={{ user, token, biometrics, walletAddress, isMfaRequired, mfaReasons, login, register, logout, connectWallet, clearMfaPrompt }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider.");
  return context;
};
