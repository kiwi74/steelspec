import { useOutletContext } from "react-router-dom";
import { Construction } from "lucide-react";
import { theme as C } from "../../lib/theme";
import type { Project } from "../../lib/projects";
import { panel, panelHead } from "../../lib/ui";

// The navigation destination exists so the shape of the product is honest about
// where this is going. What it must not do is imply that anything has been
// produced: there is no artifact list, no readiness percentage, no "ready"
// badge, no download, no file path and no estimate of when output will exist —
// because none of those are true of any project today.
export default function ProjectFabrication() {
  const project = useOutletContext<Project>();

  return (
    <>
      <div style={{ padding: "20px 0 24px" }}>
        <h1 style={{ fontSize: 21, fontWeight: 700 }}>Fabrication</h1>
        <p style={{ fontSize: 13, color: C.grey, marginTop: 2 }}>
          Fabrication output for {project.name || "this project"}.
        </p>
      </div>

      <div style={panel}>
        {/* Panel head and icon tile match Documents and Review, which carry the
            same "not available" state. This one used to be the odd screen out —
            a grey tile and the shorter heading. */}
        <div style={panelHead}><h3 style={{ fontSize: 14, fontWeight: 600 }}>Not available yet</h3></div>
        <div style={{ padding: "28px 24px", display: "flex", gap: 16, alignItems: "flex-start" }}>
          <div style={{ width: 42, height: 42, borderRadius: 10, background: C.rustBg, color: C.rust, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Construction size={19} />
          </div>
          <div style={{ fontSize: 13, color: C.ink2, lineHeight: 1.65 }}>
            <p style={{ margin: 0, fontWeight: 600, color: C.ink }}>
              Fabrication output is not available for this project.
            </p>
            <p style={{ margin: "8px 0 0" }}>
              Nothing has been produced here, so there is nothing to show, download or track on this
              screen. When fabrication drawing packages are produced for a project, they will appear
              in this section.
            </p>
            <p style={{ margin: "8px 0 0", color: C.grey }}>
              No fabrication drawings, no estimated date, and no readiness state is shown for this
              project — none has been established.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
