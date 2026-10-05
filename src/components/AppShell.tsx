import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Folder, Home, LogOut, Menu, Settings as SettingsIcon, X } from "lucide-react";
import { theme as C } from "../lib/theme";
import { useAuth } from "../lib/AuthContext";

// The signed-in product shell. It carries the primary navigation and, when the
// route is inside a project, the project's own section navigation.
//
// It reuses the dashboard's existing classes (ss-dash-layout / ss-dash-sidebar /
// ss-dash-main) so the chrome, the responsive behaviour and the mobile drawer
// are the ones already in index.css — this is the same shell, not a second one.

// Only the identifying fields the projects row actually carries. The shell
// names the project; it never asserts a state for it.
export interface ProjectContext {
  id: string;
  name: string | null;
  engineer_reference: string | null;
  client: string | null;
}

// Primary navigation. These three are the destinations that exist as real
// routes today. Billing is deliberately not a primary product destination yet.
const PRIMARY = [
  { to: "/dashboard", label: "Dashboard", icon: Home },
  { to: "/projects", label: "Projects", icon: Folder },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
];

// The project sections. Every one of these routes exists; whether a section has
// anything to show yet is that screen's business, and each screen says so.
const PROJECT_SECTIONS = [
  { path: "overview", label: "Overview" },
  { path: "documents", label: "Documents" },
  { path: "analysis", label: "Analysis" },
  { path: "review", label: "Review" },
  { path: "fabrication", label: "Fabrication" },
];

const navItemStyle = (active: boolean): CSSProperties => ({
  display: "flex", alignItems: "center", gap: 11, padding: "9px 12px", borderRadius: 8,
  color: active ? C.rust : C.ink2, fontSize: 13.5, fontWeight: active ? 600 : 500, cursor: "pointer",
  border: "none", background: active ? C.rustBg : "none", width: "100%", textAlign: "left",
  textDecoration: "none",
});

const groupLabel: CSSProperties = {
  fontSize: 10, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase",
  color: C.greyLight, padding: "14px 12px 6px",
};

export default function AppShell({ children, project }: { children: ReactNode; project?: ProjectContext | null }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const { user, profile, signOut, loading: authLoading } = useAuth();

  const initials = (profile?.full_name || user?.email || "??")
    .split(/\s+/).map((s) => s[0]).slice(0, 2).join("").toUpperCase();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div style={{ fontFamily: "Inter,-apple-system,sans-serif", background: C.bg, color: C.ink, fontSize: 14, minHeight: "100vh" }}>
      {/* Mobile top bar */}
      <div className="ss-dash-mobile-toggle" style={{
        position: "fixed", top: 0, left: 0, right: 0, height: 56, zIndex: 60,
        background: C.card, borderBottom: `1px solid ${C.border}`,
        alignItems: "center", justifyContent: "space-between", padding: "0 16px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div style={{ width: 26, height: 26, background: C.rust, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14, color: "#f5ede4" }}>S</div>
          <span style={{ fontWeight: 700, fontSize: 12, letterSpacing: 2 }}>STEELSPEC</span>
        </div>
        <button onClick={() => setSidebarOpen((v) => !v)} style={{ background: "none", border: "none", padding: 6, cursor: "pointer", color: C.ink }} aria-label="Toggle navigation">
          {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 55 }} className="ss-dash-mobile-toggle" />
      )}

      <div className="ss-dash-layout">
        {/* SIDEBAR */}
        <aside className={"ss-dash-sidebar" + (sidebarOpen ? " open" : "")} style={{ background: C.card, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "20px 20px 24px" }}>
            <div style={{ width: 30, height: 30, background: C.rust, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 17, color: "#f5ede4" }}>S</div>
            <span style={{ fontWeight: 700, fontSize: 13, letterSpacing: 2.5 }}>STEELSPEC</span>
          </div>

          <div style={{ padding: "0 12px", flex: 1, overflowY: "auto" }}>
            <div style={groupLabel}>Workspace</div>
            {PRIMARY.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} onClick={() => setSidebarOpen(false)} style={({ isActive }) => navItemStyle(isActive)}>
                <Icon size={17} strokeWidth={1.7} />{label}
              </NavLink>
            ))}

            {project && (
              <>
                <div style={groupLabel}>Project</div>
                <div style={{ padding: "0 12px 8px" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {project.name || "Untitled project"}
                  </div>
                  <div style={{ fontSize: 11, color: C.grey, fontFamily: C.mono, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 1 }}>
                    {project.engineer_reference || "—"}
                  </div>
                </div>
                {PROJECT_SECTIONS.map((s) => (
                  <NavLink
                    key={s.path}
                    to={`/projects/${project.id}/${s.path}`}
                    onClick={() => setSidebarOpen(false)}
                    style={({ isActive }) => ({ ...navItemStyle(isActive), paddingLeft: 20, fontSize: 13 })}
                  >
                    {s.label}
                  </NavLink>
                ))}
              </>
            )}
          </div>

          <div style={{ padding: 16, borderTop: `1px solid ${C.borderLight}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 8, borderRadius: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: C.rustBg, color: C.rust, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, border: `1px solid ${C.rustBorder}`, flexShrink: 0 }}>{initials}</div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{authLoading && !profile ? "Loading profile…" : profile?.full_name || "Your account"}</div>
                <div style={{ fontSize: 11, color: C.grey, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{authLoading && !profile ? "" : profile?.company_name || user?.email}</div>
              </div>
              <button onClick={handleSignOut} title="Sign out" style={{ background: "none", border: "none", color: C.grey, cursor: "pointer", padding: 4, flexShrink: 0 }}>
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </aside>

        {/* MAIN */}
        <main className="ss-dash-main">
          <style>{`@media (max-width: 860px) { .ss-dash-main { padding-top: 72px !important; } }`}</style>
          {children}
        </main>
      </div>
    </div>
  );
}
