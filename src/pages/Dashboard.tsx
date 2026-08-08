import { useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  Home, Folder, Upload, FileText, CreditCard, Settings,
  BarChart3, Clock, Download, Lock, Check, X, Menu, LogOut,
} from "lucide-react";
import { theme as C } from "../lib/theme";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";

// === TYPES (mirror the Supabase schema) ===
type ProjectStatus = "processing" | "review" | "done" | "failed";

interface Project {
  id: string;
  name: string | null;
  engineer_reference: string | null;
  client: string | null;
  status: ProjectStatus;
  total_members: number;
  total_weight_tonnes: number;
  source_format: string | null;
  created_at: string;
}

interface Invoice {
  id: string;
  project_id: string | null;
  total_cents: number;
  status: string;
  payment_method: string | null;
  created_at: string;
  projects: { name: string | null } | null;
}

const BADGE: Record<ProjectStatus, [string, string, string]> = {
  done: [C.green, C.greenBg, "Complete"],
  processing: [C.amber, C.amberBg, "Processing"],
  review: [C.blue, C.blueBg, "Needs review"],
  failed: ["#c44", "#fbeaea", "Failed"],
};

type View = "dashboard" | "projects" | "upload" | "reports" | "billing" | "settings";

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-NZ", { day: "2-digit", month: "short", year: "numeric" });

// === SHARED UI ===
function Badge({ status }: { status: ProjectStatus }) {
  const [fg, bg, label] = BADGE[status];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, color: fg, background: bg }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: fg }} />{label}
    </span>
  );
}

function StatCard({ icon, label, val, sub }: { icon: ReactNode; label: string; val: string; sub: ReactNode }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "18px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontSize: 12, color: C.grey, fontWeight: 500 }}>{label}</span>
        <span style={{ width: 34, height: 34, borderRadius: 8, background: C.rustBg, color: C.rust, display: "flex", alignItems: "center", justifyContent: "center" }}>{icon}</span>
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.8, fontVariantNumeric: "tabular-nums" }}>{val}</div>
      <div style={{ fontSize: 11.5, color: C.grey, marginTop: 3 }}>{sub}</div>
    </div>
  );
}

function fmtTag(f: string) {
  return <span style={{ padding: "3px 10px", fontSize: 10, fontWeight: 600, letterSpacing: 1, borderRadius: 4, background: C.rustBg, color: C.rust, border: `1px solid ${C.rustBorder}` }}>.{f}</span>;
}

function EmptyState({ message }: { message: string }) {
  return <div style={{ padding: "44px 20px", textAlign: "center", color: C.grey, fontSize: 13 }}>{message}</div>;
}

function ProjectsTable({ rows, onOpen, compact }: { rows: Project[]; onOpen: (p: Project) => void; compact?: boolean }) {
  if (!rows.length) return <EmptyState message="No projects yet — upload your first file to get started." />;
  const th: React.CSSProperties = { textAlign: "left", padding: "10px 20px", fontSize: 10.5, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", color: C.greyLight, borderBottom: `1px solid ${C.borderLight}`, whiteSpace: "nowrap" };
  const td: React.CSSProperties = { padding: "13px 20px", borderBottom: `1px solid ${C.borderLight}`, verticalAlign: "middle" };
  return (
    <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
      <thead><tr>
        <th style={th}>Project</th><th style={th}>Client</th>{!compact && <th style={th}>Format</th>}
        <th style={th}>Members</th><th style={th}>Tonnage</th><th style={th}>Status</th><th style={{ ...th, textAlign: "right" }}>Date</th>
      </tr></thead>
      <tbody>
        {rows.map((p) => (
          <tr key={p.id} onClick={() => onOpen(p)} style={{ cursor: "pointer" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = C.bg)}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
            <td style={td}>
              <div style={{ fontWeight: 600 }}>{p.name || "Untitled project"}</div>
              <div style={{ fontSize: 11.5, color: C.grey, fontFamily: C.mono, marginTop: 1 }}>{p.engineer_reference || "—"}</div>
            </td>
            <td style={{ ...td, color: C.ink2 }}>{p.client || "—"}</td>
            {!compact && <td style={td}>{p.source_format ? fmtTag(p.source_format) : "—"}</td>}
            <td style={{ ...td, fontFamily: C.mono, fontSize: 12 }}>{p.status === "processing" ? "—" : p.total_members}</td>
            <td style={{ ...td, fontFamily: C.mono, fontSize: 12 }}>{p.status === "processing" ? "—" : `${p.total_weight_tonnes.toFixed(2)}t`}</td>
            <td style={td}><Badge status={p.status} /></td>
            <td style={{ ...td, textAlign: "right", color: C.grey, fontSize: 12 }}>{fmtDate(p.created_at)}</td>
          </tr>
        ))}
      </tbody>
    </table></div>
  );
}

const ACCEPTED_EXTENSIONS = [".ifc", ".dwg", ".dxf"];

function UploadZone({ big, onFileSelected }: { big?: boolean; onFileSelected: (file: File) => void }) {
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validate = (file: File | undefined) => {
    if (!file) return;
    const isValid = ACCEPTED_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext));
    if (!isValid) {
      setError(`"${file.name}" isn't supported. Upload an .IFC, .DWG, or .DXF file.`);
      return;
    }
    setError(null);
    onFileSelected(file);
  };

  return (
    <div>
      <input
        id="ss-dash-file-input"
        type="file"
        accept=".ifc,.dwg,.dxf"
        onChange={(e) => { validate(e.target.files?.[0]); e.target.value = ""; }}
        style={{ display: "none" }}
      />
      <div onClick={() => document.getElementById("ss-dash-file-input")?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); validate(e.dataTransfer.files?.[0]); }}
        style={{
          margin: big ? 0 : 20, padding: big ? "52px 24px" : "34px 20px",
          border: `1.5px dashed ${error ? "#c44" : drag ? C.rust : C.border}`, borderRadius: 10, textAlign: "center", cursor: "pointer",
          background: drag ? C.rustBg : `repeating-linear-gradient(45deg,transparent,transparent 20px,rgba(196,99,58,.012) 20px,rgba(196,99,58,.012) 21px)`,
          transition: "all .25s",
        }}>
        <div style={{ width: 46, height: 46, margin: "0 auto 12px", borderRadius: 10, border: `2px solid ${drag ? C.rust : C.border}`, color: drag ? C.rust : C.grey, display: "flex", alignItems: "center", justifyContent: "center", transition: "all .25s" }}>
          <Upload size={20} />
        </div>
        <div style={{ fontSize: 14.5, fontWeight: 600, marginBottom: 4 }}>Drop your structural file here</div>
        <div style={{ fontSize: 12.5, color: C.grey, marginBottom: 14 }}>or click to browse — we'll extract every member and connection</div>
        <div style={{ display: "flex", gap: 7, justifyContent: "center" }}>{fmtTag("IFC")}{fmtTag("DWG")}{fmtTag("DXF")}</div>
      </div>
      {error && (
        <div style={{ margin: big ? "12px 0 0" : "12px 20px 0", padding: "10px 14px", background: "rgba(204,68,68,0.06)", border: "1px solid rgba(204,68,68,0.25)", borderRadius: 8, color: "#c44", fontSize: 12.5, textAlign: "left" }}>
          {error}
        </div>
      )}
    </div>
  );
}

// === MAIN DASHBOARD ===
export default function Dashboard() {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();

  const [view, setView] = useState<View>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [modal, setModal] = useState<Project | null>(null);

  const [projects, setProjects] = useState<Project[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingInvoices, setLoadingInvoices] = useState(true);

  const [uploading, setUploading] = useState(false);
  const [uploadStage, setUploadStage] = useState("Uploading file...");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [payModal, setPayModal] = useState<{ name: string; ref: string } | null>(null);
  const [payProcessing, setPayProcessing] = useState(false);
  const [paySuccess, setPaySuccess] = useState(false);

  // === DATA FETCHING ===
  const fetchProjects = useCallback(async () => {
    setLoadingProjects(true);
    const { data, error } = await supabase
      .from("projects")
      .select("id, name, engineer_reference, client, status, total_members, total_weight_tonnes, source_format, created_at")
      .order("created_at", { ascending: false });
    if (!error && data) setProjects(data as Project[]);
    setLoadingProjects(false);
  }, []);

  const fetchInvoices = useCallback(async () => {
    setLoadingInvoices(true);
    const { data, error } = await supabase
      .from("invoices")
      .select("id, project_id, total_cents, status, payment_method, created_at, projects(name)")
      .order("created_at", { ascending: false });
    if (!error && data) setInvoices(data as unknown as Invoice[]);
    setLoadingInvoices(false);
  }, []);

  useEffect(() => {
    fetchProjects();
    fetchInvoices();
  }, [fetchProjects, fetchInvoices]);

  // === UPLOAD FLOW: real file → Supabase Storage + a real project row ===
  const handleFileSelected = async (file: File) => {
    if (!user) return;
    setSelectedFile(file);
    setUploading(true);
    setUploadError(null);
    setUploadStage("Creating project...");

    const ext = file.name.split(".").pop()?.toUpperCase() ?? "";
    const sourceFormat = ["IFC", "DWG", "DXF"].includes(ext) ? ext : null;
    const displayName = file.name.replace(/\.[^/.]+$/, "");

    // 1. Create the project row
    const { data: project, error: insertError } = await supabase
      .from("projects")
      .insert({
        user_id: user.id,
        name: displayName,
        source_file: file.name,
        source_format: sourceFormat,
        status: "processing",
      })
      .select()
      .single();

    if (insertError || !project) {
      setUploadError(insertError?.message ?? "Couldn't create the project. Please try again.");
      setUploading(false);
      return;
    }

    // 2. Upload the actual file to Storage, scoped under the user's folder
    setUploadStage("Uploading file...");
    const storagePath = `${user.id}/${project.id}/${file.name}`;
    const { error: uploadErr } = await supabase.storage.from("uploads").upload(storagePath, file);

    if (uploadErr) {
      setUploadError(`File upload failed: ${uploadErr.message}`);
      setUploading(false);
      return;
    }

    // 3. Record the storage path on the project
    await supabase.from("projects").update({ uploaded_file_path: storagePath }).eq("id", project.id);

    // 4. Trigger extraction on the API service, if one is configured.
    // Without this env var set, the project simply sits at "processing"
    // until the API service is deployed (see steelspec-api/README.md).
    const apiUrl = import.meta.env.VITE_API_URL;
    if (apiUrl) {
      setUploadStage("Starting extraction...");
      try {
        await fetch(`${apiUrl}/extract/${project.id}`, { method: "POST" });
      } catch {
        // Non-fatal — the project stays in "processing" and can be
        // retried later once the API service is reachable.
      }
    }

    setUploadStage("Upload complete");
    await fetchProjects();
    setUploading(false);
    setView("projects");
    setModal({ ...project, uploaded_file_path: storagePath } as Project);
  };

  const startPayment = (p: { name: string; ref: string }) => { setPayModal(p); setPaySuccess(false); };
  const confirmPayment = () => { setPayProcessing(true); setTimeout(() => { setPayProcessing(false); setPaySuccess(true); }, 1400); };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const navItems: [View, string, ReactNode][] = [
    ["dashboard", "Dashboard", <Home size={17} strokeWidth={1.7} />],
    ["projects", "Projects", <Folder size={17} strokeWidth={1.7} />],
    ["upload", "New Takeoff", <Upload size={17} strokeWidth={1.7} />],
    ["reports", "Reports", <FileText size={17} strokeWidth={1.7} />],
  ];
  const navItems2: [View, string, ReactNode][] = [
    ["billing", "Billing", <CreditCard size={17} strokeWidth={1.7} />],
    ["settings", "Settings", <Settings size={17} strokeWidth={1.7} />],
  ];

  const navItemStyle = (active: boolean): React.CSSProperties => ({
    display: "flex", alignItems: "center", gap: 11, padding: "9px 12px", borderRadius: 8,
    color: active ? C.rust : C.ink2, fontSize: 13.5, fontWeight: active ? 600 : 500, cursor: "pointer",
    border: "none", background: active ? C.rustBg : "none", width: "100%", textAlign: "left",
  });

  const btnRust: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 18px", background: C.rust, color: "#fff", border: "none", borderRadius: 8, fontSize: 13.5, fontWeight: 600, cursor: "pointer" };
  const btnGhost: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 16px", background: C.card, color: C.ink2, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer" };
  const panel: React.CSSProperties = { background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" };
  const panelHead: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: `1px solid ${C.borderLight}` };

  // === DERIVED STATS ===
  const doneProjects = projects.filter((p) => p.status === "done");
  const totalTonnage = doneProjects.reduce((sum, p) => sum + (p.total_weight_tonnes || 0), 0);
  const paidInvoices = invoices.filter((i) => i.status === "paid");
  const displayName = profile?.full_name || user?.email?.split("@")[0] || "there";
  const initials = (profile?.full_name || user?.email || "??")
    .split(/\s+/).map((s) => s[0]).slice(0, 2).join("").toUpperCase();

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
        <button onClick={() => setSidebarOpen((v) => !v)} style={{ background: "none", border: "none", padding: 6, cursor: "pointer", color: C.ink }}>
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
          <div style={{ padding: "0 12px", flex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase", color: C.greyLight, padding: "14px 12px 6px" }}>Workspace</div>
            {navItems.map(([k, l, ic]) => (
              <button key={k} style={navItemStyle(view === k)} onClick={() => { setView(k); setSidebarOpen(false); }}>{ic}{l}</button>
            ))}
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase", color: C.greyLight, padding: "14px 12px 6px" }}>Account</div>
            {navItems2.map(([k, l, ic]) => (
              <button key={k} style={navItemStyle(view === k)} onClick={() => { setView(k); setSidebarOpen(false); }}>{ic}{l}</button>
            ))}
          </div>
          <div style={{ padding: 16, borderTop: `1px solid ${C.borderLight}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 8, borderRadius: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: C.rustBg, color: C.rust, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, border: `1px solid ${C.rustBorder}`, flexShrink: 0 }}>{initials}</div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{profile?.full_name || "Your account"}</div>
                <div style={{ fontSize: 11, color: C.grey, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{profile?.company_name || user?.email}</div>
              </div>
              <button onClick={handleSignOut} title="Sign out" style={{ background: "none", border: "none", color: C.grey, cursor: "pointer", padding: 4, flexShrink: 0 }}>
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </aside>

        {/* MAIN */}
        <main className="ss-dash-main">
          <style>{`
            @media (max-width: 860px) { .ss-dash-main { padding-top: 72px !important; } }
            @keyframes spin { to { transform: rotate(360deg); } }
          `}</style>

          {view === "dashboard" && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 0 24px", gap: 16, flexWrap: "wrap" }}>
                <div><h1 style={{ fontSize: 21, fontWeight: 700, letterSpacing: -0.4 }}>Good to see you, {displayName}</h1><p style={{ fontSize: 13, color: C.grey, marginTop: 2 }}>Here's what's happening across your takeoffs.</p></div>
                <button style={btnRust} onClick={() => setView("upload")}><Upload size={15} /> New Takeoff</button>
              </div>

              <div className="ss-dash-stats" style={{ marginBottom: 24 }}>
                <StatCard icon={<Folder size={17} />} label="Active projects" val={String(projects.length)} sub={loadingProjects ? "Loading…" : `${doneProjects.length} completed`} />
                <StatCard icon={<BarChart3 size={17} />} label="Total tonnage" val={`${totalTonnage.toFixed(2)}t`} sub="across completed projects" />
                <StatCard icon={<FileText size={17} />} label="Reports paid" val={String(paidInvoices.length)} sub="downloaded schedules" />
                <StatCard icon={<Clock size={17} />} label="Account" val={profile?.plan === "workshop" ? "Workshop" : "Pay as you go"} sub={user?.email || ""} />
              </div>

              <div className="ss-dash-grid2">
                <div style={panel}>
                  <div style={panelHead}><h3 style={{ fontSize: 14, fontWeight: 600 }}>Recent projects</h3><button style={{ fontSize: 12, color: C.rust, fontWeight: 600, background: "none", border: "none", cursor: "pointer" }} onClick={() => setView("projects")}>View all →</button></div>
                  {loadingProjects ? <EmptyState message="Loading projects…" /> : <ProjectsTable rows={projects.slice(0, 5)} onOpen={setModal} compact />}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div style={panel}><div style={panelHead}><h3 style={{ fontSize: 14, fontWeight: 600 }}>Quick takeoff</h3></div><UploadZone onFileSelected={handleFileSelected} /></div>
                </div>
              </div>
            </>
          )}

          {view === "projects" && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 0 24px", flexWrap: "wrap", gap: 16 }}>
                <div><h1 style={{ fontSize: 21, fontWeight: 700 }}>Projects</h1><p style={{ fontSize: 13, color: C.grey, marginTop: 2 }}>All takeoffs across your workspace.</p></div>
                <button style={btnRust} onClick={() => setView("upload")}><Upload size={15} /> New Takeoff</button>
              </div>
              <div style={panel}>{loadingProjects ? <EmptyState message="Loading projects…" /> : <ProjectsTable rows={projects} onOpen={setModal} />}</div>
            </>
          )}

          {view === "upload" && (
            <>
              <div style={{ padding: "20px 0 24px" }}><h1 style={{ fontSize: 21, fontWeight: 700 }}>New Takeoff</h1><p style={{ fontSize: 13, color: C.grey, marginTop: 2 }}>Upload the engineer's model file to start extraction.</p></div>
              <div style={{ ...panel, padding: 24 }}>
                <UploadZone big onFileSelected={handleFileSelected} />
                <div className="ss-upload-info-grid" style={{ marginTop: 20 }}>
                  {[["IFC / BIM", "Highest accuracy — direct from Revit, Tekla, or ArchiCAD."], ["DWG / DXF", "CAD drawings — extraction with a quick review step."], ["What you get", "Steel schedule, connection report, and total tonnage as PDF."]].map(([t, d], i) => (
                    <div key={i} style={{ padding: "14px 16px", background: C.bg, borderRadius: 10, border: `1px solid ${C.borderLight}` }}>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, color: C.rust }}>{t}</div>
                      <div style={{ fontSize: 12, color: C.grey, lineHeight: 1.55 }}>{d}</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 16, fontSize: 11.5, color: C.grey, lineHeight: 1.5 }}>
                  Your file uploads to your private, secure storage and a project is created immediately. Automated extraction is being connected next — until then, new projects will sit at "Processing" status.
                </div>
              </div>
            </>
          )}

          {view === "reports" && (
            <>
              <div style={{ padding: "20px 0 24px" }}><h1 style={{ fontSize: 21, fontWeight: 700 }}>Reports</h1><p style={{ fontSize: 13, color: C.grey, marginTop: 2 }}>Download previously generated documents.</p></div>
              <div style={panel}>
                {loadingInvoices ? <EmptyState message="Loading reports…" /> : paidInvoices.length === 0 ? (
                  <EmptyState message="No paid reports yet — unlock a report from a completed project to see it here." />
                ) : (
                  <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead><tr>
                      {["Project", "Amount", "Method", "Date", ""].map((h, i) => (
                        <th key={i} style={{ textAlign: i === 4 ? "right" : "left", padding: "10px 20px", fontSize: 10.5, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", color: C.greyLight, borderBottom: `1px solid ${C.borderLight}` }}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {paidInvoices.map((inv) => (
                        <tr key={inv.id}>
                          <td style={{ padding: "13px 20px", borderBottom: `1px solid ${C.borderLight}`, fontWeight: 600 }}>{inv.projects?.name || "Untitled project"}</td>
                          <td style={{ padding: "13px 20px", borderBottom: `1px solid ${C.borderLight}` }}>${(inv.total_cents / 100).toFixed(2)}</td>
                          <td style={{ padding: "13px 20px", borderBottom: `1px solid ${C.borderLight}`, color: C.grey }}>{inv.payment_method || "—"}</td>
                          <td style={{ padding: "13px 20px", borderBottom: `1px solid ${C.borderLight}`, color: C.grey, fontSize: 12 }}>{fmtDate(inv.created_at)}</td>
                          <td style={{ padding: "13px 20px", borderBottom: `1px solid ${C.borderLight}`, textAlign: "right" }}>
                            <button style={{ ...btnGhost, padding: "6px 12px", fontSize: 12 }} onClick={() => alert("In the live app, this downloads the steel schedule + connection PDF.")}><Download size={14} /> PDF</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table></div>
                )}
              </div>
            </>
          )}

          {view === "billing" && (
            <>
              <div style={{ padding: "20px 0 24px" }}><h1 style={{ fontSize: 21, fontWeight: 700 }}>Billing</h1><p style={{ fontSize: 13, color: C.grey, marginTop: 2 }}>Manage your plan, payment methods, and invoice history.</p></div>

              <div style={{ ...panel, padding: "24px 24px 28px", marginBottom: 16 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Plan</h3>
                <div className="ss-dash-plans">
                  <div style={{ border: `1.5px solid ${profile?.plan !== "workshop" ? C.rust : C.border}`, background: profile?.plan !== "workshop" ? C.rustBg : "transparent", borderRadius: 12, padding: "22px 20px", position: "relative" }}>
                    {profile?.plan !== "workshop" && <span style={{ position: "absolute", top: -9, left: 18, background: C.rust, color: "#fff", fontSize: 10, fontWeight: 700, letterSpacing: 0.5, padding: "2px 10px", borderRadius: 20 }}>CURRENT</span>}
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.grey, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Pay as you go</div>
                    <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.5 }}>$199<span style={{ fontSize: 13, fontWeight: 500, color: C.grey }}> /takeoff</span></div>
                    <div style={{ fontSize: 12.5, color: C.grey, margin: "8px 0 16px", lineHeight: 1.5 }}>Billed only when you download a report. No commitment, no monthly fee.</div>
                    {["Steel schedule + connections PDF", "Unlimited uploads & review", "Pay only for what you download"].map((f) => (
                      <div key={f} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, color: C.ink2, marginBottom: 7 }}><Check size={13} color={C.rust} />{f}</div>
                    ))}
                  </div>
                  <div style={{ border: `1.5px solid ${profile?.plan === "workshop" ? C.rust : C.border}`, background: profile?.plan === "workshop" ? C.rustBg : "transparent", borderRadius: 12, padding: "22px 20px", position: "relative" }}>
                    {profile?.plan === "workshop" && <span style={{ position: "absolute", top: -9, left: 18, background: C.rust, color: "#fff", fontSize: 10, fontWeight: 700, letterSpacing: 0.5, padding: "2px 10px", borderRadius: 20 }}>CURRENT</span>}
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.grey, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Workshop</div>
                    <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.5 }}>$749<span style={{ fontSize: 13, fontWeight: 500, color: C.grey }}> /month</span></div>
                    <div style={{ fontSize: 12.5, color: C.grey, margin: "8px 0 16px", lineHeight: 1.5 }}>For fabricators running 5+ takeoffs a month. Works out cheaper per job.</div>
                    {["Unlimited takeoffs & downloads", "Priority processing", "Team seats (coming soon)"].map((f) => (
                      <div key={f} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, color: C.ink2, marginBottom: 7 }}><Check size={13} color={C.rust} />{f}</div>
                    ))}
                    {profile?.plan !== "workshop" && <button style={{ ...btnGhost, marginTop: 10, width: "100%", justifyContent: "center" }}>Switch to Workshop</button>}
                  </div>
                </div>
              </div>

              <div style={{ ...panel, padding: "24px 24px 28px", marginBottom: 16 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Payment methods</h3>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", border: `1px solid ${C.border}`, borderRadius: 10, marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 9, background: C.borderLight, color: C.ink2, display: "flex", alignItems: "center", justifyContent: "center" }}><CreditCard size={17} /></div>
                    <div><div style={{ fontWeight: 600, fontSize: 13.5 }}>No card on file</div><div style={{ fontSize: 12, color: C.grey }}>Add a card to unlock reports</div></div>
                  </div>
                  <button style={{ ...btnGhost, padding: "6px 12px", fontSize: 12 }}>Add card</button>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", border: `1px solid ${C.border}`, borderRadius: 10, opacity: 0.7 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 9, background: "#e8f3ef", color: "#1a7a5e", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 11 }}>BP</div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13.5, display: "flex", alignItems: "center", gap: 8 }}>BlinkPay <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: 0.6, padding: "2px 7px", borderRadius: 10, background: C.borderLight, color: C.grey, textTransform: "uppercase" }}>Coming soon</span></div>
                      <div style={{ fontSize: 12, color: C.grey }}>Pay directly from your bank — no card fees, instant settlement</div>
                    </div>
                  </div>
                  <button disabled style={{ ...btnGhost, padding: "6px 12px", fontSize: 12, opacity: 0.5, cursor: "not-allowed" }}>Connect</button>
                </div>
              </div>

              <div style={panel}>
                <div style={panelHead}><h3 style={{ fontSize: 14, fontWeight: 600 }}>Invoice history</h3></div>
                {loadingInvoices ? <EmptyState message="Loading invoices…" /> : invoices.length === 0 ? (
                  <EmptyState message="No invoices yet." />
                ) : (
                  <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead><tr>
                      {["Project", "Method", "Amount", "Status", "Date"].map((h, i) => (
                        <th key={i} style={{ textAlign: i === 2 || i === 4 ? "right" : "left", padding: "10px 20px", fontSize: 10.5, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", color: C.greyLight, borderBottom: `1px solid ${C.borderLight}` }}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {invoices.map((inv) => (
                        <tr key={inv.id}>
                          <td style={{ padding: "13px 20px", borderBottom: `1px solid ${C.borderLight}`, color: C.ink2 }}>{inv.projects?.name || "Untitled project"}</td>
                          <td style={{ padding: "13px 20px", borderBottom: `1px solid ${C.borderLight}`, color: C.grey }}>{inv.payment_method || "—"}</td>
                          <td style={{ padding: "13px 20px", borderBottom: `1px solid ${C.borderLight}`, textAlign: "right", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>${(inv.total_cents / 100).toFixed(2)}</td>
                          <td style={{ padding: "13px 20px", borderBottom: `1px solid ${C.borderLight}` }}>
                            <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, color: inv.status === "paid" ? C.green : C.amber, background: inv.status === "paid" ? C.greenBg : C.amberBg }}>{inv.status === "paid" ? "Paid" : "Pending"}</span>
                          </td>
                          <td style={{ padding: "13px 20px", borderBottom: `1px solid ${C.borderLight}`, textAlign: "right", color: C.grey, fontSize: 12 }}>{fmtDate(inv.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table></div>
                )}
              </div>
            </>
          )}

          {view === "settings" && (
            <>
              <div style={{ padding: "20px 0 24px" }}><h1 style={{ fontSize: 21, fontWeight: 700 }}>Settings</h1><p style={{ fontSize: 13, color: C.grey, marginTop: 2 }}>Workspace preferences.</p></div>
              <div style={{ ...panel, padding: 32 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 420 }}>
                  <div><div style={{ fontSize: 11, color: C.grey, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4 }}>Email</div><div style={{ fontSize: 14, fontWeight: 600 }}>{user?.email}</div></div>
                  <div><div style={{ fontSize: 11, color: C.grey, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4 }}>Full name</div><div style={{ fontSize: 14, fontWeight: 600 }}>{profile?.full_name || "—"}</div></div>
                  <div><div style={{ fontSize: 11, color: C.grey, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4 }}>Company</div><div style={{ fontSize: 14, fontWeight: 600 }}>{profile?.company_name || "—"}</div></div>
                  <button onClick={handleSignOut} style={{ ...btnGhost, marginTop: 8, width: "fit-content" }}><LogOut size={15} /> Sign out</button>
                </div>
              </div>
            </>
          )}
        </main>

        {/* PROJECT DETAIL MODAL */}
        {modal && (
          <div onClick={() => setModal(null)} style={{ position: "fixed", inset: 0, background: "rgba(26,26,26,.45)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, backdropFilter: "blur(3px)" }}>
            <div onClick={(e) => e.stopPropagation()} style={{ background: C.card, borderRadius: 14, maxWidth: 640, width: "100%", maxHeight: "85vh", overflowY: "auto", boxShadow: "0 24px 70px rgba(0,0,0,.18)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "24px 24px 0" }}>
                <div>
                  <div style={{ fontSize: 11, color: C.rust, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", marginBottom: 3 }}>Project</div>
                  <h2 style={{ fontSize: 19, fontWeight: 700 }}>{modal.name || "Untitled project"}</h2>
                  <div style={{ fontSize: 11.5, color: C.grey, fontFamily: C.mono, marginTop: 2 }}>{modal.engineer_reference || "—"} {modal.client ? `· ${modal.client}` : ""}</div>
                </div>
                <button onClick={() => setModal(null)} style={{ background: "none", border: "none", fontSize: 20, color: C.grey, padding: 4, cursor: "pointer" }}><X size={20} /></button>
              </div>
              <div style={{ padding: "20px 24px 24px" }}>
                <div className="ss-kv-grid" style={{ margin: "16px 0" }}>
                  {[["Status", <Badge status={modal.status} />], ["Source format", modal.source_format ? `.${modal.source_format}` : "—"], ["Steel members", modal.status === "processing" ? "—" : modal.total_members], ["Total tonnage", modal.status === "processing" ? "—" : `${modal.total_weight_tonnes.toFixed(2)} t`]].map(([l, v], i) => (
                    <div key={i} style={{ padding: "10px 14px", background: C.bg, borderRadius: 8, border: `1px solid ${C.borderLight}` }}>
                      <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 0.8, color: C.grey }}>{l}</div>
                      <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2, fontVariantNumeric: "tabular-nums" }}>{v}</div>
                    </div>
                  ))}
                </div>
                {modal.status === "done" ? (
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button style={btnRust} onClick={() => { setModal(null); startPayment({ name: modal.name || "Untitled project", ref: modal.engineer_reference || "" }); }}><Lock size={13} /> Unlock PDF — $199</button>
                    <button style={btnGhost}>View extraction</button>
                  </div>
                ) : (
                  <div style={{ textAlign: "center", color: C.grey, fontSize: 13, padding: "20px 0" }}>
                    {modal.status === "processing"
                      ? "Your file has been uploaded and is waiting on the extraction engine. This part of SteelSpec is still being connected."
                      : "This project needs review before a report can be generated."}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* UPLOAD PROGRESS MODAL */}
        {uploading && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(26,26,26,.45)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
            <div style={{ background: C.card, borderRadius: 14, maxWidth: 380, width: "100%", textAlign: "center", padding: "36px 28px" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.rust, letterSpacing: 3, marginBottom: 24 }}>STEELSPEC</div>
              <div style={{ width: 44, height: 44, borderRadius: "50%", border: `2.5px solid ${C.border}`, borderTopColor: C.rust, animation: "spin 1s linear infinite", margin: "0 auto 18px" }} />
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 3 }}>{uploadStage}</div>
              <div style={{ fontSize: 12.5, color: C.grey }}>{selectedFile?.name}</div>
              {uploadError && (
                <div style={{ marginTop: 16, padding: "10px 14px", background: "rgba(204,68,68,0.06)", border: "1px solid rgba(204,68,68,0.25)", borderRadius: 8, color: "#c44", fontSize: 12.5, textAlign: "left" }}>
                  {uploadError}
                </div>
              )}
            </div>
          </div>
        )}

        {/* PAYMENT MODAL */}
        {payModal && (
          <div onClick={() => !payProcessing && setPayModal(null)} style={{ position: "fixed", inset: 0, background: "rgba(26,26,26,.45)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, backdropFilter: "blur(3px)" }}>
            <div onClick={(e) => e.stopPropagation()} style={{ background: C.card, borderRadius: 14, maxWidth: 420, width: "100%", boxShadow: "0 24px 70px rgba(0,0,0,.18)" }}>
              {!paySuccess ? (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "24px 24px 0" }}>
                    <div>
                      <div style={{ fontSize: 11, color: C.rust, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", marginBottom: 3 }}>Unlock report</div>
                      <h2 style={{ fontSize: 18, fontWeight: 700 }}>Complete payment</h2>
                    </div>
                    {!payProcessing && <button onClick={() => setPayModal(null)} style={{ background: "none", border: "none", fontSize: 20, color: C.grey, cursor: "pointer" }}><X size={20} /></button>}
                  </div>
                  <div style={{ padding: "20px 24px 24px" }}>
                    <div style={{ background: C.bg, border: `1px solid ${C.borderLight}`, borderRadius: 10, padding: "16px 18px", margin: "16px 0" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "5px 0", color: C.ink2 }}><span>{payModal.name}</span><span>{payModal.ref}</span></div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "5px 0", color: C.ink2 }}><span>Steel schedule + connection PDF</span><span>$199.00</span></div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "5px 0", color: C.ink2 }}><span>GST (15%)</span><span>$29.85</span></div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 15, borderTop: `1px solid ${C.border}`, marginTop: 6, paddingTop: 10 }}><span>Total</span><span>$228.85</span></div>
                    </div>

                    <div style={{ fontSize: 11.5, fontWeight: 600, color: C.grey, textTransform: "uppercase", letterSpacing: 0.6, margin: "18px 0 10px" }}>Pay with</div>

                    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", border: `1.5px solid ${C.rust}`, background: C.rustBg, borderRadius: 10, marginBottom: 10, cursor: "pointer" }}>
                      <div style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${C.rust}`, position: "relative", flexShrink: 0 }}>
                        <div style={{ position: "absolute", inset: 3, borderRadius: "50%", background: C.rust }} />
                      </div>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: C.borderLight, color: C.ink2, display: "flex", alignItems: "center", justifyContent: "center" }}><CreditCard size={16} /></div>
                      <div style={{ flex: 1 }}><div style={{ fontWeight: 600, fontSize: 13.5 }}>Card on file</div><div style={{ fontSize: 11.5, color: C.grey }}>Demo payment</div></div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", border: `1.5px solid ${C.border}`, borderRadius: 10, opacity: 0.55, cursor: "not-allowed" }}>
                      <div style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${C.border}`, flexShrink: 0 }} />
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: "#e8f3ef", color: "#1a7a5e", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 11 }}>BP</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 13.5, display: "flex", alignItems: "center", gap: 7 }}>BlinkPay <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: 0.6, padding: "2px 7px", borderRadius: 10, background: C.borderLight, color: C.grey, textTransform: "uppercase" }}>Coming soon</span></div>
                        <div style={{ fontSize: 11.5, color: C.grey }}>Pay from your bank — no card fees</div>
                      </div>
                    </div>

                    <button onClick={confirmPayment} disabled={payProcessing} style={{ ...btnRust, width: "100%", justifyContent: "center", marginTop: 16, padding: "12px 20px", fontSize: 14 }}>
                      {payProcessing ? "Processing…" : <><Lock size={14} /> Pay $228.85 &amp; download</>}
                    </button>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 12, fontSize: 11, color: C.grey }}>
                      <Lock size={11} /> Payments are encrypted and PCI compliant
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ padding: "40px 32px", textAlign: "center" }}>
                  <div style={{ width: 52, height: 52, borderRadius: "50%", background: C.greenBg, color: C.green, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}><Check size={24} /></div>
                  <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Payment successful</h2>
                  <div style={{ fontSize: 13, color: C.grey, marginBottom: 24 }}>Your report for {payModal.name} is ready.</div>
                  <button style={{ ...btnRust, width: "100%", justifyContent: "center", padding: "12px 20px", fontSize: 14 }} onClick={() => { setPayModal(null); alert("In the live app, this downloads the steel schedule + connection PDF."); }}><Download size={15} /> Download PDF</button>
                  <button style={{ ...btnGhost, width: "100%", justifyContent: "center", marginTop: 8, padding: "10px 20px", fontSize: 13 }} onClick={() => setPayModal(null)}>Close</button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}