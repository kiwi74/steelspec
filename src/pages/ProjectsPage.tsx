import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Folder } from "lucide-react";
import { theme as C } from "../lib/theme";
import { readProjects } from "../lib/projects";
import type { Project } from "../lib/projects";
import AppShell from "../components/AppShell";
import { Badge, EmptyState, ErrorState, FormatTag, LoadingState } from "../components/ui";
import { btnRust, fmtDate, fmtTonnes, panel } from "../lib/ui";

const cardStyle: React.CSSProperties = {
  display: "block", textDecoration: "none", color: "inherit",
  background: C.card, border: `1px solid ${C.border}`, borderRadius: 12,
  padding: "18px 20px",
};

function ProjectCard({ project }: { project: Project }) {
  const settled = project.status !== "processing";
  return (
    <Link to={`/projects/${project.id}/overview`} style={cardStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {project.name || "Untitled project"}
          </div>
          <div style={{ fontSize: 11.5, color: C.grey, fontFamily: C.mono, marginTop: 2 }}>
            {project.engineer_reference || "—"}
          </div>
        </div>
        <Badge status={project.status} />
      </div>

      <div style={{ fontSize: 12.5, color: C.ink2, marginTop: 12 }}>{project.client || "No client named"}</div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 18px", marginTop: 14, fontSize: 12, color: C.grey, fontVariantNumeric: "tabular-nums" }}>
        <span>Members <strong style={{ color: C.ink, fontWeight: 600 }}>{settled ? project.total_members : "—"}</strong></span>
        <span>Connections <strong style={{ color: C.ink, fontWeight: 600 }}>{settled ? project.total_connections : "—"}</strong></span>
        <span>Tonnage <strong style={{ color: C.ink, fontWeight: 600 }}>{settled ? fmtTonnes(project.total_weight_tonnes) : "—"}</strong></span>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, paddingTop: 14, borderTop: `1px solid ${C.borderLight}` }}>
        <span>{project.source_format ? <FormatTag f={project.source_format} /> : <span style={{ fontSize: 11.5, color: C.greyLight }}>No format recorded</span>}</span>
        <span style={{ fontSize: 11.5, color: C.grey }}>{fmtDate(project.created_at)}</span>
      </div>
    </Link>
  );
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { projects: rows, error: readError } = await readProjects();
    setProjects(rows);
    setError(readError);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <AppShell>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 0 24px", flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 21, fontWeight: 700 }}>Projects</h1>
          <p style={{ fontSize: 13, color: C.grey, marginTop: 2 }}>Every takeoff in your workspace.</p>
        </div>
        <Link to="/dashboard" style={{ ...btnRust, textDecoration: "none" }}><Folder size={15} /> Open a takeoff from the dashboard</Link>
      </div>

      {loading ? (
        <div style={panel}><LoadingState message="Loading projects…" /></div>
      ) : error ? (
        <div style={panel}><ErrorState message={error} onRetry={load} /></div>
      ) : projects.length === 0 ? (
        <div style={panel}><EmptyState message="No projects yet — upload your first file from the dashboard to get started." /></div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {projects.map((p) => <ProjectCard key={p.id} project={p} />)}
        </div>
      )}
    </AppShell>
  );
}
