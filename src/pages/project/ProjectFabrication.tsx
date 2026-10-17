import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Construction, Download, FileText } from "lucide-react";
import { theme as C } from "../../lib/theme";
import type { Project } from "../../lib/projects";
import { useAuth } from "../../lib/AuthContext";
import {
  ShopDrawingPackageRefused,
  generateShopDrawingPackage,
} from "../../lib/shopDrawings";
import { btnRust, panel, panelHead } from "../../lib/ui";

// The production pilot shop-drawing package.
//
// This screen asks the service for one assembly's package and hands the returned ZIP to
// the browser. It does not build a schedule, choose a member, infer an assembly, decide a
// blocker or claim readiness. The assembly mark is the ONE input, and it is required
// because no persisted row states which assembly the reader means.
//
// The service's answer is shown as the service stated it — including refusals. Nothing on
// this page turns a missing value into a default, and no state here is described as
// fabrication-ready: the package is a PILOT REVIEW artifact, not for construction.

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  background: C.card,
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  fontSize: 13,
  fontFamily: "inherit",
  color: C.ink,
  boxSizing: "border-box" as const,
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ProjectFabrication() {
  const project = useOutletContext<Project>();
  const { session } = useAuth();
  const [assembly, setAssembly] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [download, setDownload] = useState<{
    url: string;
    filename: string;
    bytes: number;
  } | null>(null);

  // A generated package lives in a blob URL. Revoke it when it is replaced or when the
  // screen is left, so the browser does not hold the bytes for the session.
  useEffect(() => {
    if (!download) return;
    return () => URL.revokeObjectURL(download.url);
  }, [download]);

  const generate = async () => {
    setError(null);
    const token = session?.access_token;
    if (!token) {
      setError(
        "Your session has expired. Sign in again before generating a package.",
      );
      return;
    }
    setBusy(true);
    try {
      const result = await generateShopDrawingPackage(
        project.id,
        assembly,
        token,
      );
      setDownload({
        url: URL.createObjectURL(result.blob),
        filename: result.filename,
        bytes: result.blob.size,
      });
    } catch (failure) {
      if (failure instanceof ShopDrawingPackageRefused) {
        setError([failure.code, failure.message].filter(Boolean).join(" — "));
      } else {
        setError(
          "The package service could not be reached. It may be starting up — try again in a moment.",
        );
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div style={{ padding: "20px 0 24px" }}>
        <h1 style={{ fontSize: 21, fontWeight: 700 }}>Fabrication</h1>
        <p style={{ fontSize: 13, color: C.grey, marginTop: 2 }}>
          Pilot review package for {project.name || "this project"}.
        </p>
      </div>

      <div style={{ ...panel, marginBottom: 16 }}>
        <div style={panelHead}>
          <h3 style={{ fontSize: 14, fontWeight: 600 }}>
            Generate a pilot review package
          </h3>
        </div>
        <div style={{ padding: 20 }}>
          <p style={{ margin: 0, fontSize: 13, color: C.ink2, lineHeight: 1.65 }}>
            The package contains one assembly schedule, the single-part member
            sheets the recorded evidence supports, and a manifest naming every
            member that could not be drawn. It is a{" "}
            <strong>PILOT REVIEW — NOT FOR CONSTRUCTION</strong> artifact. It is
            not a fabrication-ready package and no engineering or dimensional
            verification is performed.
          </p>

          <label
            htmlFor="assembly-mark"
            style={{
              display: "block",
              marginTop: 16,
              fontSize: 11,
              letterSpacing: 0.7,
              textTransform: "uppercase",
              color: C.grey,
            }}
          >
            Assembly mark (as printed on the drawing)
          </label>
          <input
            id="assembly-mark"
            className="ss-input"
            value={assembly}
            onChange={(event) => setAssembly(event.target.value)}
            placeholder="e.g. A006"
            autoComplete="off"
            style={{ ...inputStyle, marginTop: 5 }}
          />
          <p style={{ margin: "6px 0 0", fontSize: 11.5, color: C.grey }}>
            The mark is used exactly as you type it. It is never inferred from a
            page, a filename or a member.
          </p>

          <button
            className="ss-focus"
            style={{
              ...btnRust,
              marginTop: 16,
              opacity: busy ? 0.6 : 1,
              cursor: busy ? "default" : "pointer",
            }}
            disabled={busy}
            onClick={generate}
          >
            <FileText size={15} />
            {busy ? "Generating…" : "Generate pilot package"}
          </button>

          {error && (
            <div
              role="alert"
              style={{
                marginTop: 14,
                padding: "10px 12px",
                background: C.redBg,
                border: `1px solid ${C.redBorder}`,
                borderRadius: 8,
                fontSize: 12,
                color: C.ink2,
                lineHeight: 1.55,
              }}
            >
              {error}
            </div>
          )}

          {download ? (
            <div
              style={{
                marginTop: 16,
                padding: "14px 16px",
                background: C.rustBg,
                border: `1px solid ${C.rustBorder}`,
                borderRadius: 10,
              }}
            >
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: C.ink }}>
                Package generated
              </p>
              <p style={{ margin: "4px 0 12px", fontSize: 12, color: C.ink2 }}>
                {download.filename} · {formatBytes(download.bytes)} ·{" "}
                PILOT REVIEW — NOT FOR CONSTRUCTION
              </p>
              <a
                href={download.url}
                download={download.filename}
                style={btnRust}
              >
                <Download size={15} /> Download package
              </a>
            </div>
          ) : (
            <p style={{ margin: "14px 0 0", fontSize: 12, color: C.grey }}>
              No package has been generated in this session.
            </p>
          )}
        </div>
      </div>

      <div style={panel}>
        <div style={panelHead}>
          <h3 style={{ fontSize: 14, fontWeight: 600 }}>
            What the package does not contain
          </h3>
        </div>
        <div
          style={{
            padding: "24px 20px",
            display: "flex",
            gap: 16,
            alignItems: "flex-start",
          }}
        >
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 10,
              background: C.rustBg,
              color: C.rust,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Construction size={19} />
          </div>
          <div style={{ fontSize: 13, color: C.ink2, lineHeight: 1.65 }}>
            <p style={{ margin: 0, fontWeight: 600, color: C.ink }}>
              This is not a fabrication-ready deliverable.
            </p>
            <p style={{ margin: "8px 0 0" }}>
              Connection drawings are not included. Source line weights and any
              assembly-wide weld note are stated as not recorded rather than
              filled in. No fabrication readiness, engineering verification or
              dimensional verification is claimed, and the package is never
              labelled READY.
            </p>
            <p style={{ margin: "8px 0 0", color: C.grey }}>
              A member the recorded evidence does not support — unplaced,
              conflicted, incomplete, held for review or not matched exactly in
              the catalogue — is named in the manifest and is not drawn.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
