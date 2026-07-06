import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import DashboardLayout from "./components/DashboardLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Vault from "./pages/Vault";
import Forensics from "./pages/Forensics";
import Compliance from "./pages/Compliance";
import Copilot from "./pages/Copilot";
import Admin from "./pages/Admin";

const SecureRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAuth();
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <DashboardLayout>{children}</DashboardLayout>;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/dashboard" element={<SecureRoute><Dashboard /></SecureRoute>} />
          <Route path="/vault" element={<SecureRoute><Vault /></SecureRoute>} />
          <Route path="/forensics" element={<SecureRoute><Forensics /></SecureRoute>} />
          <Route path="/compliance" element={<SecureRoute><Compliance /></SecureRoute>} />
          <Route path="/copilot" element={<SecureRoute><Copilot /></SecureRoute>} />
          <Route path="/admin" element={<SecureRoute><Admin /></SecureRoute>} />

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
