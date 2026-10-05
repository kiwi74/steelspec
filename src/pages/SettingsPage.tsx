import { Link, useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { theme as C } from "../lib/theme";
import { useAuth } from "../lib/AuthContext";
import AppShell from "../components/AppShell";
import { btnGhost, panel } from "../lib/ui";

// The existing settings screen, moved into the product shell. It shows what the
// account actually holds and signs you out — it has not grown a billing or
// account-management surface, and the profile fields remain read-only here
// exactly as they were.
export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const fields: [string, string][] = [
    ["Email", user?.email || "—"],
    ["Full name", profile?.full_name || "—"],
    ["Company", profile?.company_name || "—"],
  ];

  return (
    <AppShell>
      <div style={{ padding: "20px 0 24px" }}>
        <h1 style={{ fontSize: 21, fontWeight: 700 }}>Settings</h1>
        <p style={{ fontSize: 13, color: C.grey, marginTop: 2 }}>Workspace preferences.</p>
      </div>

      <div style={{ ...panel, padding: 32 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 420 }}>
          {fields.map(([label, value]) => (
            <div key={label}>
              <div style={{ fontSize: 11, color: C.grey, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{value}</div>
            </div>
          ))}
          <button onClick={handleSignOut} style={{ ...btnGhost, marginTop: 8, width: "fit-content" }}>
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </div>

      <p style={{ fontSize: 12, color: C.grey, marginTop: 16 }}>
        Plan, invoices and report downloads stay on the{" "}
        <Link to="/dashboard" style={{ color: C.rust, fontWeight: 600, textDecoration: "none" }}>dashboard</Link>.
      </p>
    </AppShell>
  );
}
