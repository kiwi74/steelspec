import { useOutletContext } from "react-router-dom";
import { theme as C } from "../../lib/theme";
import type { Project } from "../../lib/projects";
import { Badge } from "../../components/ui";
import { fmtTonnes, panel, panelHead, statusLabel } from "../../lib/ui";

// Factual information only.
//
// Everything below is read from the project's own row. Nothing here declares
// the engineering review finished, declares the project fabrication-ready, or
// computes a second opinion of its own: there is no frontend-derived readiness
// rule on this screen, and a value this build cannot read is named as missing
// rather than estimated.
export default function ProjectAnalysis() {
  const project = useOutletContext<Project>();
  const settled = project.status !== "processing";

  const counts: [string, string][] = [
    ["Steel members extracted", settled ? String(project.total_members) : "—"],
    ["Connections extracted", settled ? String(project.total_connections) : "—"],
    ["Total tonnage", settled ? fmtTonnes(project.total_weight_tonnes) : "—"],
    // The project row does not carry a page count, so this says so instead of
    // showing a number the data cannot support.
    ["Pages processed", "Not available in this view"],
    ["Source format", project.source_format ? `.${project.source_format}` : "No format recorded"],
    // The raw column value ("review", "done") is not language the reader was
    // given anywhere else — the badge above says "Review required" and "Analysis
    // complete" for exactly these states. Same words here.
    ["Task state", statusLabel(project.status)],
  ];

  return (
    <>
      <div style={{ padding: "20px 0 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <h1 style={{ fontSize: 21, fontWeight: 700 }}>Analysis</h1>
          <Badge status={project.status} />
        </div>
        <p style={{ fontSize: 13, color: C.grey, marginTop: 2 }}>
          What the extraction produced for this project.
        </p>
      </div>

      <div style={{ ...panel, marginBottom: 16 }}>
        <div style={panelHead}><h3 style={{ fontSize: 14, fontWeight: 600 }}>Extraction output</h3></div>
        <div className="ss-kv-grid" style={{ padding: 20 }}>
          {counts.map(([label, value]) => (
            <div key={label} style={{ padding: "10px 14px", background: C.bg, borderRadius: 8, border: `1px solid ${C.borderLight}` }}>
              <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 0.8, color: C.grey }}>{label}</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2, fontVariantNumeric: "tabular-nums" }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={panel}>
        <div style={{ padding: 20, fontSize: 13, color: C.ink2, lineHeight: 1.65 }}>
          <p style={{ margin: 0 }}>
            These are extraction results. They are what the analysis read from the source file —
            they are not a verification of the structure, and no engineer has signed them off.
          </p>
          <p style={{ margin: "8px 0 0", color: C.grey }}>
            Whether the drawings themselves have been checked, and whether anything is ready to be
            fabricated from, is recorded in review — not on this screen.
          </p>
        </div>
      </div>
    </>
  );
}
