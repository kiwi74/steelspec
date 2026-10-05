import { useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { FileSearch, ClipboardCheck } from "lucide-react";
import { theme as C } from "../../lib/theme";
import type { Project } from "../../lib/projects";
import DrawingViewer from "../../components/DrawingViewer";
import { Badge } from "../../components/ui";
import { btnGhost, fmtDate, fmtTonnes, panel, panelHead } from "../../lib/ui";

// What the project's status actually says, in its own terms. None of these
// sentences claims the engineering has been checked: "done" here is the
// backend's word for the analysis having finished, not for anyone having
// verified the result, so no status renders in green.
function statusMeaning(status: Project["status"]): string {
  switch (status) {
    case "processing":
      return "The analysis is still running. This page refreshes on its own.";
    case "review":
      return "The analysis finished, and it flagged something for a person to look at.";
    case "done":
      return "The analysis finished. SteelSpec has not checked these values against the drawings and no engineer has signed them off.";
    case "failed":
      return "The analysis did not finish, so there is no result to show.";
  }
}

export default function ProjectOverview() {
  const project = useOutletContext<Project>();
  const [viewerOpen, setViewerOpen] = useState(false);
  const settled = project.status !== "processing";

  const fields: [string, string][] = [
    ["Client", project.client || "—"],
    ["Engineer reference", project.engineer_reference || "—"],
    ["Source format", project.source_format ? `.${project.source_format}` : "—"],
    ["Created", fmtDate(project.created_at)],
    ["Steel members", settled ? String(project.total_members) : "—"],
    ["Connections", settled ? String(project.total_connections) : "—"],
    ["Total tonnage", settled ? fmtTonnes(project.total_weight_tonnes) : "—"],
    // Stated rather than left blank: this build reads the projects row, and the
    // row does not carry a separate review state. Saying so is more useful than
    // an empty cell the reader has to interpret.
    ["Review state", "Not available in this view"],
  ];

  return (
    <>
      <div style={{ padding: "20px 0 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <h1 style={{ fontSize: 21, fontWeight: 700 }}>{project.name || "Untitled project"}</h1>
          <Badge status={project.status} />
        </div>
        <p style={{ fontSize: 13, color: C.grey, marginTop: 3, fontFamily: C.mono }}>
          {project.engineer_reference || "No engineer reference"}
        </p>
      </div>

      <div className="ss-dash-grid2">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={panel}>
            <div style={panelHead}><h3 style={{ fontSize: 14, fontWeight: 600 }}>Project record</h3></div>
            <div className="ss-kv-grid" style={{ padding: 20 }}>
              {fields.map(([label, value]) => (
                <div key={label} style={{ padding: "10px 14px", background: C.bg, borderRadius: 8, border: `1px solid ${C.borderLight}` }}>
                  <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 0.8, color: C.grey }}>{label}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2, fontVariantNumeric: "tabular-nums" }}>{value}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={panel}>
            <div style={panelHead}><h3 style={{ fontSize: 14, fontWeight: 600 }}>Status</h3></div>
            <div style={{ padding: 20, fontSize: 13, color: C.ink2, lineHeight: 1.6 }}>
              <p style={{ margin: 0 }}>{statusMeaning(project.status)}</p>
              {project.status === "failed" && project.error_message && (
                <p style={{ margin: "10px 0 0", color: C.red, fontSize: 12.5 }}>{project.error_message}</p>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={panel}>
            <div style={panelHead}><h3 style={{ fontSize: 14, fontWeight: 600 }}>Continue</h3></div>
            <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 10 }}>
              <button style={{ ...btnGhost, justifyContent: "flex-start" }} onClick={() => setViewerOpen(true)}>
                <FileSearch size={15} /> View extraction
              </button>
              <Link to={`/projects/${project.id}/review`} style={{ ...btnGhost, justifyContent: "flex-start", textDecoration: "none" }}>
                <ClipboardCheck size={15} /> Go to review
              </Link>
              <div style={{ fontSize: 11.5, color: C.grey, lineHeight: 1.55, marginTop: 2 }}>
                Every section on the left reads the same project record. Reporting and payment stay on the dashboard.
              </div>
            </div>
          </div>
        </div>
      </div>

      {viewerOpen && <DrawingViewer projectId={project.id} onClose={() => setViewerOpen(false)} />}
    </>
  );
}
