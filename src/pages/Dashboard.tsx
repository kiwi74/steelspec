import { useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Home, Folder, Upload, FileText, CreditCard, Settings,
  BarChart3, Clock, Download, Check, X, Menu, LogOut,
} from "lucide-react";
import { theme as C } from "../lib/theme";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";
import { readProject, readProjects } from "../lib/projects";
import type { Project } from "../lib/projects";
import {
  DocumentsRefused,
  batchFullyRegistered,
  registerDocuments,
  registeredDocumentIds,
} from "../lib/documents";
import type { DocumentOutcome } from "../lib/documents";
import { Badge, EmptyState, ErrorState, FormatTag, LoadingState } from "../components/ui";
import { btnGhost, btnRust, fmtDate, fmtTonnes, panel, panelHead } from "../lib/ui";
import DrawingViewer from "../components/DrawingViewer";
import ConnectionReviewSurface from "../components/ConnectionReviewSurface";

// === TYPES ===
// Project, its status vocabulary and the column set this build reads live in
// ../lib/projects, shared with the project screens so the two cannot describe
// the same row differently.

interface Invoice {
  id: string;
  project_id: string | null;
  total_cents: number;
  status: string;
  payment_method: string | null;
  created_at: string;
  projects: { name: string | null; report_pdf_path: string | null } | null;
}

// Dashboard, New Takeoff, Reports and Billing are the workspace views that still
// live inside this page. Projects and Settings are real routes now, so they are
// not part of this state.
type View = "dashboard" | "upload" | "reports" | "billing";

// A takeoff attempt that did not finish, as the person who made it needs to see it.
//
// Everything here is a FRONTEND OBSERVATION about a request the page made or did not
// make. Nothing in it is a statement about the project's persisted status: that column
// is written by the backend and by nothing else, and a request that failed is not
// evidence that a project failed.
//
// `projectId` is set only where a project row genuinely exists AND its file genuinely
// reached storage. It is offered as a destination the reader can choose; the page never
// navigates there on its own, because arriving at a project page is not the same thing
// as extraction having started.
interface UploadFailure {
  stage: string;
  message: string;
  projectId: string | null;
}

// === SHARED UI ===
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
            {!compact && <td style={td}>{p.source_format ? <FormatTag f={p.source_format} /> : "—"}</td>}
            <td style={{ ...td, fontFamily: C.mono, fontSize: 12 }}>{p.status === "processing" ? "—" : p.total_members}</td>
            <td style={{ ...td, fontFamily: C.mono, fontSize: 12 }}>{p.status === "processing" ? "—" : fmtTonnes(p.total_weight_tonnes)}</td>
            <td style={td}><Badge status={p.status} /></td>
            <td style={{ ...td, textAlign: "right", color: C.grey, fontSize: 12 }}>{fmtDate(p.created_at)}</td>
          </tr>
        ))}
      </tbody>
    </table></div>
  );
}

// Only the formats the backend can actually extract today. DXF parsing and
// PDF drawing vision are the two live paths; IFC is not implemented, and DWG
// is not converted to DXF yet. The picker must not offer a path that does not
// exist.
const ACCEPTED_EXTENSIONS = [".dxf", ".pdf"];

// A document set, not a document: the input offers a multi-selection and both the picker
// and a drop hand over EVERY file, never `[0]`. Validation is per file — one unsupported
// file is named and shown, and it never makes the files beside it look rejected too, nor
// the valid ones look like the whole selection.
function UploadZone({ big, onFilesSelected }: { big?: boolean; onFilesSelected: (accepted: File[]) => void }) {
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validate = (selected: File[]) => {
    if (selected.length === 0) return;
    const accepted: File[] = [];
    const rejected: string[] = [];
    for (const file of selected) {
      if (ACCEPTED_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext))) accepted.push(file);
      else rejected.push(file.name);
    }
    setError(
      rejected.length === 0
        ? null
        : `${rejected.map((name) => `"${name}"`).join(", ")} ${rejected.length === 1 ? "isn't" : "aren't"} supported yet. Upload .DXF or .PDF files.`,
    );
    if (accepted.length > 0) onFilesSelected(accepted);
  };

  return (
    <div>
      <input
        id="ss-dash-file-input"
        type="file"
        accept=".dxf,.pdf"
        multiple
        onChange={(e) => { validate(Array.from(e.target.files ?? [])); e.target.value = ""; }}
        style={{ display: "none" }}
      />
      <div onClick={() => document.getElementById("ss-dash-file-input")?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); validate(Array.from(e.dataTransfer.files)); }}
        style={{
          margin: big ? 0 : 20, padding: big ? "52px 24px" : "34px 20px",
          border: `1.5px dashed ${error ? C.red : drag ? C.rust : C.border}`, borderRadius: 10, textAlign: "center", cursor: "pointer",
          background: drag ? C.rustBg : `repeating-linear-gradient(45deg,transparent,transparent 20px,rgba(196,99,58,.012) 20px,rgba(196,99,58,.012) 21px)`,
          transition: "all .25s",
        }}>
        <div style={{ width: 46, height: 46, margin: "0 auto 12px", borderRadius: 10, border: `2px solid ${drag ? C.rust : C.border}`, color: drag ? C.rust : C.grey, display: "flex", alignItems: "center", justifyContent: "center", transition: "all .25s" }}>
          <Upload size={20} />
        </div>
        <div style={{ fontSize: 14.5, fontWeight: 600, marginBottom: 4 }}>Drop your structural files here</div>
        <div style={{ fontSize: 12.5, color: C.grey, marginBottom: 14 }}>or click to browse — one project can hold a whole drawing set</div>
        <div style={{ display: "flex", gap: 7, justifyContent: "center" }}><FormatTag f="DXF" /><FormatTag f="PDF" /></div>
      </div>
      {error && (
        <div style={{ margin: big ? "12px 0 0" : "12px 20px 0", padding: "10px 14px", background: "rgba(204,68,68,0.06)", border: `1px solid ${C.redBorder}`, borderRadius: 8, color: C.red, fontSize: 12.5, textAlign: "left" }}>
          {error}
        </div>
      )}
    </div>
  );
}

// === MAIN DASHBOARD ===
export default function Dashboard() {
  const navigate = useNavigate();
  const { user, profile, signOut, session, loading: authLoading } = useAuth();

  const [view, setView] = useState<View>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [modal, setModal] = useState<Project | null>(null);
  const [viewerProjectId, setViewerProjectId] = useState<string | null>(null);
  const [reviewProjectId, setReviewProjectId] = useState<string | null>(null);

  const [projects, setProjects] = useState<Project[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [invoicesError, setInvoicesError] = useState<string | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);

  const [uploading, setUploading] = useState(false);
  const [uploadStage, setUploadStage] = useState("Creating project...");
  const [uploadFailure, setUploadFailure] = useState<UploadFailure | null>(null);
  // The selected document set, and the name the user has confirmed for it. The name is a
  // FIELD rather than something derived at creation time: one file's basename cannot name a
  // set of documents, and inventing one silently is the thing this replaced.
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [projectName, setProjectName] = useState("");
  // What the service said about each file. `null` until a batch has been sent.
  const [registration, setRegistration] = useState<DocumentOutcome[] | null>(null);
  const [extractionNotStarted, setExtractionNotStarted] = useState<string | null>(null);

  // === DATA FETCHING ===
  const fetchProjects = useCallback(async () => {
    setLoadingProjects(true);
    setProjectsError(null);
    // The read is shared with the project screens so the dashboard and those
    // pages cannot end up reading different column sets. It is surfaced, not
    // swallowed: swallowing it left the table on its empty state, which reads
    // as "you have no projects" rather than "the read failed" — two very
    // different statements.
    const { projects: rows, error } = await readProjects();
    if (error) setProjectsError(error);
    else setProjects(rows);
    setLoadingProjects(false);
  }, []);

  const fetchInvoices = useCallback(async () => {
    setLoadingInvoices(true);
    setInvoicesError(null);
    const { data, error } = await supabase
      .from("invoices")
      .select("id, project_id, total_cents, status, payment_method, created_at, projects(name, report_pdf_path)")
      .order("created_at", { ascending: false });
    if (error) {
      setInvoicesError("Your invoices could not be loaded.");
    } else if (data) {
      setInvoices(data as unknown as Invoice[]);
    }
    setLoadingInvoices(false);
  }, []);

  useEffect(() => {
    fetchProjects();
    fetchInvoices();
  }, [fetchProjects, fetchInvoices]);

  // Poll for updates while the modal is open on a project that's still
  // "processing" — extraction happens asynchronously on a separate
  // service, so the modal has no way of knowing it finished unless we
  // actively check back. Stops as soon as the status changes.
  useEffect(() => {
    if (!modal || modal.status !== "processing") return;

    const interval = setInterval(async () => {
      // The same shared read the project screens use, so this poll cannot end up
      // selecting a different column set from the rest of the dashboard. The
      // behaviour is the one the inline query already had: a read that fails, or
      // that finds no row, leaves the modal untouched — it only ever updated on a
      // row it actually got back.
      const { project } = await readProject(modal.id);

      if (project) {
        setModal(project);
        setProjects((prev) => prev.map((p) => (p.id === project.id ? project : p)));
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [modal]);

  // === UPLOAD FLOW: one project, a document set, and the service's own verdict per file ===
  //
  // The browser touches neither storage nor `project_documents` on this path any more. It
  // creates ONE project row, hands the whole batch to the deployed ingestion route, and
  // reports what that route said about each file. Hashing, duplicate detection, same-name
  // collisions and the document rows themselves are the service's, and none of it is
  // reproduced here.

  const handleFilesSelected = (accepted: File[]) => {
    setPendingFiles(accepted);
    setRegistration(null);
    setExtractionNotStarted(null);
    setUploadFailure(null);
    // A draft the user can change. The first file's basename is a STARTING POINT and is
    // never written as the project's name until the user confirms it — one file cannot
    // name a set of documents, and inventing a name silently is what this replaced.
    setProjectName(accepted[0]?.name.replace(/\.[^/.]+$/, "") ?? "");
    setView("upload");
  };

  const handleCreateProject = async () => {
    if (!user) return;
    const name = projectName.trim();
    if (pendingFiles.length === 0) return;
    if (!name) {
      setUploadFailure({
        stage: "Project name required",
        message: "Give this project a name before it is created.",
        projectId: null,
      });
      return;
    }

    setUploading(true);
    setUploadFailure(null);
    setRegistration(null);
    setExtractionNotStarted(null);
    setUploadStage("Creating project...");

    const first = pendingFiles[0];
    const ext = first.name.split(".").pop()?.toUpperCase() ?? "";
    const sourceFormat = ["DXF", "PDF"].includes(ext) ? ext : null;

    // 1. ONE project for the whole set. Never one project per file.
    const { data: project, error: insertError } = await supabase
      .from("projects")
      .insert({
        user_id: user.id,
        name,
        source_file: first.name,
        source_format: sourceFormat,
        status: "processing",
      })
      .select()
      .single();

    if (insertError || !project) {
      setUploading(false);
      setUploadFailure({
        stage: "Project not created",
        message: insertError?.message ?? "Couldn't create the project. Please try again.",
        projectId: null,
      });
      return;
    }

    const token = session?.access_token;
    if (!token) {
      setUploading(false);
      setUploadFailure({
        stage: "Documents not registered",
        message: "Your session has expired, so no document was registered. Sign in again and upload the files.",
        projectId: project.id,
      });
      await fetchProjects();
      return;
    }

    // 2. Register the whole set through the deployed ingestion route, once.
    setUploadStage("Registering documents...");
    let result;
    try {
      result = await registerDocuments(project.id, token, pendingFiles);
    } catch (error) {
      setUploading(false);
      setRegistration(null);
      setUploadFailure({
        stage: "Documents not registered",
        message:
          error instanceof DocumentsRefused
            ? error.message
            : "The document service could not be reached, so no document was registered.",
        projectId: project.id,
      });
      await fetchProjects();
      return;
    }
    setRegistration(result.documents);

    // 3. Extraction, once per REGISTERED DOCUMENT — never once per selected file. The same
    //    bytes chosen twice collapse to the one document the first copy registered, so the
    //    document is read once; a file that failed registered nothing and is never
    //    extracted. This is why the ids come from the service's outcomes and not from the
    //    files the user picked.
    const documentIds = registeredDocumentIds(result);
    if (documentIds.length === 0) {
      setUploading(false);
      await fetchProjects();
      return;
    }

    const apiUrl = import.meta.env.VITE_API_URL;
    if (!apiUrl) {
      setUploading(false);
      setExtractionNotStarted(
        "This build has no extraction service configured, so no extraction was started. The project and its documents are stored.",
      );
      await fetchProjects();
      return;
    }

    setUploadStage("Starting extraction...");
    const notStarted: string[] = [];
    for (const documentId of documentIds) {
      try {
        // ADDRESSED, always. An unaddressed request is refused by the service the moment a
        // project holds more than one document — that refusal is the guard, not an
        // obstacle, and this page does not work around it.
        const res = await fetch(`${apiUrl}/extract/${project.id}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ document_id: documentId }),
        });
        // A refusal is as much a "not started" as an unreachable service is. The body is
        // deliberately not read: what the service said about a refusal is its own to state.
        if (!res.ok) notStarted.push(documentId);
      } catch {
        notStarted.push(documentId);
      }
    }

    setUploading(false);
    if (notStarted.length > 0) {
      setExtractionNotStarted(
        notStarted.length === documentIds.length
          ? "The documents are registered, but the extraction service did not start an extraction for any of them."
          : `The documents are registered, but the extraction service did not start an extraction for ${notStarted.length} of them.`,
      );
    }
    await fetchProjects();

    // Land on the project only when the WHOLE batch registered and every extraction that
    // was owed to it started. A mixed batch stays here with the per-file outcome in front
    // of the reader, because that outcome is the thing they need to see.
    if (batchFullyRegistered(result) && notStarted.length === 0) {
      navigate(`/projects/${project.id}/overview`);
    }
  };

  const closeUploadModal = () => {
    setUploadFailure(null);
    setRegistration(null);
    setExtractionNotStarted(null);
    setPendingFiles([]);
    setProjectName("");
  };

  // The only route to a report. It reads the project's own report path, asks
  // storage for a short-lived signed URL and hands the browser that URL. There is
  // no step in front of it that charges anything, so there is none that could
  // report a charge happening.
  const downloadReport = async (reportPath: string | null, projectName: string) => {
    setReportError(null);
    if (!reportPath) {
      setReportError("The report isn't ready yet — extraction may still be finishing. Try again in a moment.");
      return;
    }
    const { data, error } = await supabase.storage.from("reports").createSignedUrl(reportPath, 60);
    if (error || !data) {
      // The raw storage error is not shown: it names internals and is not
      // actionable to the person reading it.
      setReportError("The report could not be retrieved. Please try again.");
      return;
    }
    // Open the signed URL — browsers will download or preview the PDF directly
    const link = document.createElement("a");
    link.href = data.signedUrl;
    link.download = `${projectName || "steel-schedule"}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const navItems: [View, string, ReactNode][] = [
    ["dashboard", "Dashboard", <Home size={17} strokeWidth={1.7} />],
    ["upload", "New Takeoff", <Upload size={17} strokeWidth={1.7} />],
    ["reports", "Reports", <FileText size={17} strokeWidth={1.7} />],
  ];
  const navItems2: [View, string, ReactNode][] = [
    ["billing", "Billing", <CreditCard size={17} strokeWidth={1.7} />],
  ];
  // Projects and Settings are pages of their own now, so the sidebar points at
  // them by route instead of switching an in-page view.
  const workspaceLinks: [string, string, ReactNode][] = [
    ["/projects", "Projects", <Folder size={17} strokeWidth={1.7} />],
  ];
  const accountLinks: [string, string, ReactNode][] = [
    ["/settings", "Settings", <Settings size={17} strokeWidth={1.7} />],
  ];

  const navItemStyle = (active: boolean): React.CSSProperties => ({
    display: "flex", alignItems: "center", gap: 11, padding: "9px 12px", borderRadius: 8,
    color: active ? C.rust : C.ink2, fontSize: 13.5, fontWeight: active ? 600 : 500, cursor: "pointer",
    border: "none", background: active ? C.rustBg : "none", width: "100%", textAlign: "left",
    textDecoration: "none",
  });

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
            {workspaceLinks.map(([to, l, ic]) => (
              <NavLink key={to} to={to} onClick={() => setSidebarOpen(false)} style={({ isActive }) => navItemStyle(isActive)}>{ic}{l}</NavLink>
            ))}
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase", color: C.greyLight, padding: "14px 12px 6px" }}>Account</div>
            {navItems2.map(([k, l, ic]) => (
              <button key={k} style={navItemStyle(view === k)} onClick={() => { setView(k); setSidebarOpen(false); }}>{ic}{l}</button>
            ))}
            {accountLinks.map(([to, l, ic]) => (
              <NavLink key={to} to={to} onClick={() => setSidebarOpen(false)} style={({ isActive }) => navItemStyle(isActive)}>{ic}{l}</NavLink>
            ))}
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

              {/* A figure that has not been read yet is shown as "—", never as 0.
                  Zero is a real answer ("you have no projects") and a loading
                  dashboard must not give it before the read has come back. */}
              <div className="ss-dash-stats" style={{ marginBottom: 24 }}>
                <StatCard icon={<Folder size={17} />} label="Active projects" val={loadingProjects ? "—" : String(projects.length)} sub={loadingProjects ? "Loading…" : `${doneProjects.length} with analysis complete`} />
                <StatCard icon={<BarChart3 size={17} />} label="Total tonnage" val={loadingProjects ? "—" : fmtTonnes(totalTonnage)} sub={loadingProjects ? "Loading…" : "across projects with analysis complete"} />
                <StatCard icon={<FileText size={17} />} label="Reports paid" val={loadingInvoices ? "—" : String(paidInvoices.length)} sub={loadingInvoices ? "Loading…" : "downloaded schedules"} />
                <StatCard icon={<Clock size={17} />} label="Account" val={authLoading && !profile ? "—" : profile?.plan === "workshop" ? "Workshop" : "Pay as you go"} sub={user?.email || ""} />
              </div>

              <div className="ss-dash-grid2">
                <div style={panel}>
                  <div style={panelHead}><h3 style={{ fontSize: 14, fontWeight: 600 }}>Recent projects</h3><button style={{ fontSize: 12, color: C.rust, fontWeight: 600, background: "none", border: "none", cursor: "pointer" }} onClick={() => navigate("/projects")}>View all →</button></div>
                  {loadingProjects ? <LoadingState message="Loading projects…" /> : projectsError ? <ErrorState message={projectsError} onRetry={fetchProjects} /> : <ProjectsTable rows={projects.slice(0, 5)} onOpen={setModal} compact />}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div style={panel}><div style={panelHead}><h3 style={{ fontSize: 14, fontWeight: 600 }}>Quick takeoff</h3></div><UploadZone onFilesSelected={handleFilesSelected} /></div>
                </div>
              </div>
            </>
          )}

          {view === "upload" && (
            <>
              <div style={{ padding: "20px 0 24px" }}><h1 style={{ fontSize: 21, fontWeight: 700 }}>New Takeoff</h1><p style={{ fontSize: 13, color: C.grey, marginTop: 2 }}>Upload the engineer's drawing set — one project can hold several files.</p></div>
              <div style={{ ...panel, padding: 24 }}>
                <UploadZone big onFilesSelected={handleFilesSelected} />

                {/* The selected set and the name it will be created under. The name is
                    required and editable: it is the ONE thing the user is deciding here,
                    and a project holding five documents cannot be named after one of them. */}
                {pendingFiles.length > 0 && (
                  <div style={{ marginTop: 20, padding: 20, background: C.bg, border: `1px solid ${C.borderLight}`, borderRadius: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.8, textTransform: "uppercase", color: C.grey, marginBottom: 8 }}>
                      {pendingFiles.length} document{pendingFiles.length === 1 ? "" : "s"} selected
                    </div>
                    <ul style={{ margin: "0 0 18px", padding: 0, listStyle: "none" }}>
                      {pendingFiles.map((file, index) => (
                        <li key={`${file.name}-${index}`} style={{ fontSize: 12.5, color: C.ink2, fontFamily: C.mono, padding: "3px 0" }}>
                          {file.name}
                        </li>
                      ))}
                    </ul>
                    <label htmlFor="ss-project-name" style={{ display: "block", fontSize: 11, fontWeight: 600, letterSpacing: 0.8, textTransform: "uppercase", color: C.grey, marginBottom: 6 }}>
                      Project name
                    </label>
                    <input
                      id="ss-project-name"
                      className="ss-input"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      placeholder="Name this project"
                      style={{ width: "100%", maxWidth: 420, padding: "11px 13px", background: C.card, border: `1px solid ${C.border}`, borderRadius: 9, fontSize: 14, fontFamily: "inherit", color: C.ink, boxSizing: "border-box" }}
                    />
                    <div style={{ fontSize: 11.5, color: C.grey, marginTop: 6 }}>
                      All {pendingFiles.length} file{pendingFiles.length === 1 ? "" : "s"} are registered against this one project.
                    </div>
                    <button
                      className="ss-focus"
                      style={{ ...btnRust, marginTop: 16, opacity: uploading || !projectName.trim() ? 0.6 : 1, cursor: uploading || !projectName.trim() ? "default" : "pointer" }}
                      disabled={uploading || !projectName.trim()}
                      onClick={handleCreateProject}
                    >
                      <Upload size={15} /> Create project and start extraction
                    </button>
                  </div>
                )}
                <div className="ss-upload-info-grid" style={{ marginTop: 20 }}>
                  {[["DXF", "CAD drawings — members and connections parsed directly, with a quick review step."], ["PDF", "Structural drawings analysed page-by-page, with every value traceable back to its source page."]].map(([t, d], i) => (
                    <div key={i} style={{ padding: "14px 16px", background: C.bg, borderRadius: 10, border: `1px solid ${C.borderLight}` }}>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, color: C.rust }}>{t}</div>
                      <div style={{ fontSize: 12, color: C.grey, lineHeight: 1.55 }}>{d}</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 16, fontSize: 11.5, color: C.grey, lineHeight: 1.5 }}>
                  Your file uploads to your private, secure storage and a project is created immediately.
                </div>
              </div>
            </>
          )}

          {view === "reports" && (
            <>
              <div style={{ padding: "20px 0 24px" }}><h1 style={{ fontSize: 21, fontWeight: 700 }}>Reports</h1><p style={{ fontSize: 13, color: C.grey, marginTop: 2 }}>Download previously generated documents.</p></div>
              <div style={panel}>
                {/* The empty line below used to read "unlock a report from a
                    completed project" — a purchase step that does not exist and
                    a completion state stronger than the product supports. */}
                {loadingInvoices ? <LoadingState message="Loading reports…" /> : invoicesError ? <ErrorState message={invoicesError} onRetry={fetchInvoices} /> : paidInvoices.length === 0 ? (
                  <EmptyState message="No reports yet — a report appears here once it has been paid for. Billing is not available yet." />
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
                            <button style={{ ...btnGhost, padding: "6px 12px", fontSize: 12 }} onClick={() => downloadReport(inv.projects?.report_pdf_path ?? null, inv.projects?.name ?? "steel-schedule")}><Download size={14} /> PDF</button>
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
              {/* The page opens by saying what is true of the whole view. Everything below —
                  the prices, the plan features, the "CURRENT" badge — is read as intent once
                  this sentence is in front of it, which is what lets the plan cards keep
                  their information without claiming anything is purchasable today. */}
              <div style={{ padding: "20px 0 24px" }}><h1 style={{ fontSize: 21, fontWeight: 700 }}>Billing</h1><p style={{ fontSize: 13, color: C.grey, marginTop: 2 }}>Payment is not available yet. The plans below are what we intend to offer.</p></div>

              <div style={{ ...panel, padding: "24px 24px 28px", marginBottom: 16 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Plan</h3>
                <div className="ss-dash-plans">
                  <div style={{ border: `1.5px solid ${profile?.plan !== "workshop" ? C.rust : C.border}`, background: profile?.plan !== "workshop" ? C.rustBg : "transparent", borderRadius: 12, padding: "22px 20px", position: "relative" }}>
                    {profile?.plan !== "workshop" && <span style={{ position: "absolute", top: -9, left: 18, background: C.rust, color: "#fff", fontSize: 10, fontWeight: 700, letterSpacing: 0.5, padding: "2px 10px", borderRadius: 20 }}>CURRENT</span>}
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.grey, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Pay as you go</div>
                    <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.5 }}>$199<span style={{ fontSize: 13, fontWeight: 500, color: C.grey }}> /takeoff</span></div>
                    <div style={{ fontSize: 12.5, color: C.grey, margin: "8px 0 16px", lineHeight: 1.5 }}>No monthly fee and no commitment. Billing is not available yet.</div>
                    {["Steel schedule + connections PDF", "Unlimited uploads & review", "Priced per report, once billing is available"].map((f) => (
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
                    {/* Nothing in the product changes a plan: no provider is wired up and no
                        code writes `profiles.plan`. The card keeps its plan information and
                        the control keeps its place, but it is disabled and says so, using the
                        same treatment the BlinkPay row below already uses. */}
                    {profile?.plan !== "workshop" && (
                      <button disabled style={{ ...btnGhost, marginTop: 10, width: "100%", justifyContent: "center", opacity: 0.5, cursor: "not-allowed" }}>
                        Switch to Workshop
                        <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: 0.6, padding: "2px 7px", borderRadius: 10, background: C.borderLight, color: C.grey, textTransform: "uppercase" }}>Coming soon</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ ...panel, padding: "24px 24px 28px", marginBottom: 16 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Payment methods</h3>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", border: `1px solid ${C.border}`, borderRadius: 10, marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 9, background: C.borderLight, color: C.ink2, display: "flex", alignItems: "center", justifyContent: "center" }}><CreditCard size={17} /></div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13.5, display: "flex", alignItems: "center", gap: 8 }}>No card on file <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: 0.6, padding: "2px 7px", borderRadius: 10, background: C.borderLight, color: C.grey, textTransform: "uppercase" }}>Coming soon</span></div>
                      {/* Reports are governed by whether the project carries a stored
                          report, and by nothing else — no card is involved in reaching
                          one. The old line here claimed the opposite. */}
                      <div style={{ fontSize: 12, color: C.grey }}>Card payments are not available yet.</div>
                    </div>
                  </div>
                  <button disabled style={{ ...btnGhost, padding: "6px 12px", fontSize: 12, opacity: 0.5, cursor: "not-allowed" }}>Add card</button>
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
                {loadingInvoices ? <LoadingState message="Loading invoices…" /> : invoicesError ? <ErrorState message={invoicesError} onRetry={fetchInvoices} /> : invoices.length === 0 ? (
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
                  {[
                    ["Status", <Badge status={modal.status} />],
                    ["Source format", modal.source_format ? `.${modal.source_format}` : "—"],
                    ["Steel members", modal.status === "processing" ? "—" : modal.total_members],
                    ["Connections", modal.status === "processing" ? "—" : modal.total_connections],
                    ["Total tonnage", modal.status === "processing" ? "—" : fmtTonnes(modal.total_weight_tonnes)],
                  ].map(([l, v], i) => (
                    <div key={i} style={{ padding: "10px 14px", background: C.bg, borderRadius: 8, border: `1px solid ${C.borderLight}` }}>
                      <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 0.8, color: C.grey }}>{l}</div>
                      <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2, fontVariantNumeric: "tabular-nums" }}>{v}</div>
                    </div>
                  ))}
                </div>
                {modal.status === "done" || modal.status === "review" ? (
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                    {/* The report action is offered only where this project actually
                        has a report. Where it does not, nothing is offered: no price,
                        no purchase, no generation, no readiness — a statement about
                        the row, and no button to press. */}
                    {modal.report_pdf_path ? (
                      <button style={btnRust} onClick={() => downloadReport(modal.report_pdf_path, modal.name || "steel-schedule")}><Download size={13} /> Download report</button>
                    ) : (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 16px", background: C.bg, color: C.grey, border: `1px solid ${C.borderLight}`, borderRadius: 8, fontSize: 13, fontWeight: 500 }}>
                        <FileText size={13} /> Report not available yet
                      </span>
                    )}
                    <button style={btnGhost} onClick={() => setViewerProjectId(modal.id)}>View extraction</button>
                    <button style={btnGhost} onClick={() => setReviewProjectId(modal.id)}>Review extraction</button>
                    {/* The project's own page, alongside the in-place actions rather
                        than instead of them. This is the same navigation the projects
                        list and the post-upload redirect already use, so the modal
                        stays exactly what it was and simply gains a way out of it. */}
                    <button style={btnGhost} onClick={() => { setModal(null); navigate(`/projects/${modal.id}/overview`); }}>Open project</button>
                    {!modal.report_pdf_path && (
                      <div style={{ flexBasis: "100%", fontSize: 12, color: C.grey, lineHeight: 1.55 }}>
                        This project has no report stored against it yet, so there is nothing to download here.
                      </div>
                    )}
                  </div>
                ) : modal.status === "processing" ? (
                  <div style={{ textAlign: "center", color: C.grey, fontSize: 13, padding: "20px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 22, height: 22, borderRadius: "50%", border: `2.5px solid ${C.border}`, borderTopColor: C.rust, animation: "spin 1s linear infinite" }} />
                    Extraction in progress — this updates automatically, no need to refresh.
                  </div>
                ) : (
                  <div style={{ textAlign: "center", color: C.red, fontSize: 13, padding: "20px 0" }}>
                    Extraction failed{modal.error_message ? `: ${modal.error_message}` : ". Please try uploading again."}
                  </div>
                )}

                {/* The same way out the finished state already offers, for the two
                    states that had none. It is additive — it sits below whatever the
                    state is showing and moves nothing above it. Nothing here
                    navigates on its own: leaving this modal for the project page is
                    the reader's action, and until they take it the extraction is
                    still running (or has failed) exactly as it was. The project page
                    polls for itself while a project is processing, so following this
                    does not strand anyone on a stale reading. */}
                {(modal.status === "processing" || modal.status === "failed") && (
                  <div style={{ display: "flex", justifyContent: "center" }}>
                    <button style={btnGhost} onClick={() => { setModal(null); navigate(`/projects/${modal.id}/overview`); }}>Open project</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* DRAWING VIEWER — source page + extracted data, for PDF-sourced projects */}
        {viewerProjectId && (
          <DrawingViewer projectId={viewerProjectId} onClose={() => setViewerProjectId(null)} />
        )}

        {/* CONNECTION REVIEW — the production review surface, rendered from the API */}
        {reviewProjectId && (
          <ConnectionReviewSurface projectId={reviewProjectId} onClose={() => setReviewProjectId(null)} />
        )}

        {/* UPLOAD PROGRESS MODAL — progress while a takeoff is running, and the
            outcome when it stopped. The failure state is the same panel with the
            spinner replaced by the reason: no green, no tick, nothing that reads as
            a finished job. */}
        {(uploading || uploadFailure || registration) && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(26,26,26,.45)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
            <div style={{ background: C.card, borderRadius: 14, maxWidth: 460, width: "100%", textAlign: "center", padding: "36px 28px" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.rust, letterSpacing: 3, marginBottom: 24 }}>STEELSPEC</div>
              {uploading && (
                <div style={{ width: 44, height: 44, borderRadius: "50%", border: `2.5px solid ${C.border}`, borderTopColor: C.rust, animation: "spin 1s linear infinite", margin: "0 auto 18px" }} />
              )}
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 3, color: uploadFailure ? C.red : C.ink }}>
                {uploadFailure ? uploadFailure.stage : uploadStage}
              </div>
              {uploading && (
                <div style={{ fontSize: 12.5, color: C.grey }}>
                  {pendingFiles.length} file{pendingFiles.length === 1 ? "" : "s"}
                </div>
              )}

              {/* What the service said about EACH file, in its own words. A file that
                  failed is shown as failed and is never counted as part of a success; a
                  duplicate is shown as the document it already is rather than as a second
                  one. Nothing here is inferred from local state — every line is the
                  registration outcome. */}
              {!uploading && registration && (
                <ul style={{ margin: "14px 0 0", padding: 0, listStyle: "none", textAlign: "left" }}>
                  {registration.map((document, index) => (
                    <li key={`${document.file_name}-${index}`} style={{ padding: "7px 0", borderTop: index === 0 ? "none" : `1px solid ${C.borderLight}`, fontSize: 12.5, lineHeight: 1.5 }}>
                      <span style={{ fontFamily: C.mono, fontWeight: 600, color: document.status === "failed" ? C.red : C.ink }}>
                        {document.status === "created" ? "✓ " : document.status === "deduplicated" ? "↺ " : "✗ "}
                        {document.file_name}
                      </span>
                      <div style={{ color: document.status === "failed" ? C.red : C.grey, fontSize: 12 }}>
                        {document.status === "created"
                          ? "Registered — extraction started"
                          : document.status === "deduplicated"
                            ? "Already registered on this project — the same document, read once"
                            : document.reason || document.code || "This file was not registered."}
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {extractionNotStarted && (
                <div style={{ marginTop: 14, padding: "10px 14px", background: C.amberBg, border: `1px solid ${C.borderLight}`, borderRadius: 8, color: C.ink2, fontSize: 12.5, textAlign: "left", lineHeight: 1.55 }}>
                  {extractionNotStarted}
                </div>
              )}

              {uploadFailure && (
                <div style={{ marginTop: 16, padding: "10px 14px", background: "rgba(204,68,68,0.06)", border: `1px solid ${C.redBorder}`, borderRadius: 8, color: C.red, fontSize: 12.5, textAlign: "left" }}>
                  {uploadFailure.message}
                </div>
              )}
              {!uploading && (
                <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 18 }}>
                  <button style={btnGhost} onClick={closeUploadModal}>Close</button>
                  {/* Offered only where a project row and its uploaded file genuinely
                      exist. It is a destination the reader chooses — the page does not
                      take them there, because arriving at a project page is not the
                      same thing as an extraction having started. */}
                  {uploadFailure?.projectId && (
                    <button style={btnGhost} onClick={() => { const id = uploadFailure.projectId; closeUploadModal(); navigate(`/projects/${id}/overview`); }}>Open project</button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* REPORT DOWNLOAD FAILURE — surfaced as a message, not a native alert() */}
        {reportError && (
          <div onClick={() => setReportError(null)} style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", zIndex: 300, background: C.redBg, border: "1px solid rgba(204,68,68,0.3)", color: C.red, padding: "12px 18px", borderRadius: 10, fontSize: 12.5, boxShadow: "0 12px 32px rgba(0,0,0,0.14)", cursor: "pointer", maxWidth: 460, textAlign: "center" }}>
            {reportError}
          </div>
        )}
      </div>
    </div>
  );
}
