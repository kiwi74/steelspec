import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { theme as C } from "../lib/theme";

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        background: C.bg, fontFamily: "Inter,-apple-system,sans-serif",
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: "50%", border: `3px solid ${C.border}`,
          borderTopColor: C.rust, animation: "spin 1s linear infinite",
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/signup?mode=signin" replace />;
  }

  return <>{children}</>;
}