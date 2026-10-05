import { useOutletContext } from "react-router-dom";
import { FileText, Lock } from "lucide-react";
import { theme as C } from "../../lib/theme";
import type { Project } from "../../lib/projects";
import { fmtDate, panel, panelHead } from "../../lib/ui";

// Honest product surface only.
//
// The set of documents a project was extracted from is not readable from the
// browser in this build. That list is not exposed by any route this frontend
// calls, and the files themselves live in private storage the browser is not
// granted read access to. Nothing here reaches around that: there is no direct
// read of a document table, no role selector, and no write of any kind — an
// inventoried document list is the backend's to publish, not this screen's to
// guess at.
export default function ProjectDocuments() {
  const project = useOutletContext<Project>();

  const known: [string, string][] = [
    ["Source format", project.source_format ? `.${project.source_format}` : "No format recorded"],
    ["Project created", fmtDate(project.created_at)],
  ];

  return (
    <>
      <div style={{ padding: "20px 0 24px" }}>
        <h1 style={{ fontSize: 21, fontWeight: 700 }}>Documents</h1>
        <p style={{ fontSize: 13, color: C.grey, marginTop: 2 }}>
          The drawings this project was extracted from.
        </p>
      </div>

      <div style={{ ...panel, marginBottom: 16 }}>
        <div style={panelHead}><h3 style={{ fontSize: 14, fontWeight: 600 }}>Not available yet</h3></div>
        <div style={{ padding: "28px 24px", display: "flex", gap: 16, alignItems: "flex-start" }}>
          <div style={{ width: 42, height: 42, borderRadius: 10, background: C.rustBg, color: C.rust, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <FileText size={19} />
          </div>
          <div style={{ fontSize: 13, color: C.ink2, lineHeight: 1.65 }}>
            <p style={{ margin: 0, fontWeight: 600, color: C.ink }}>Document management is not connected to the product yet.</p>
            <p style={{ margin: "8px 0 0" }}>
              Managing the documents on a project — listing them, naming what each one is, and adding
              more — comes online with the backend document API. Until that exists, this screen has
              no document list to show you.
            </p>
            <p style={{ margin: "8px 0 0", color: C.grey }}>
              Your uploaded files are stored privately. They are not exposed to the browser here, and
              no document roles are shown because none have been assigned.
            </p>
          </div>
        </div>
      </div>

      <div style={panel}>
        <div style={panelHead}><h3 style={{ fontSize: 14, fontWeight: 600 }}>What is known about this project</h3></div>
        <div className="ss-kv-grid" style={{ padding: 20 }}>
          {known.map(([label, value]) => (
            <div key={label} style={{ padding: "10px 14px", background: C.bg, borderRadius: 8, border: `1px solid ${C.borderLight}` }}>
              <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 0.8, color: C.grey }}>{label}</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>{value}</div>
            </div>
          ))}
          <div style={{ padding: "10px 14px", background: C.bg, borderRadius: 8, border: `1px solid ${C.borderLight}`, gridColumn: "1 / -1" }}>
            <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 0.8, color: C.grey }}>Document list</div>
            <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2, color: C.grey, display: "flex", alignItems: "center", gap: 6 }}>
              <Lock size={13} /> Not readable from this build
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
