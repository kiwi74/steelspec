import { useState, useEffect } from "react";
import { X, FileText } from "lucide-react";
import { theme as C } from "../lib/theme";
import { useAuth } from "../lib/AuthContext";

// The production review surface (steelspec-api `GET /production/review/{project_id}/workflow`).
//
// The API returns a complete, self-contained HTML document. It is rendered in an
// iframe via srcDoc and is never injected as raw HTML into this page. The iframe
// carries sandbox="" so the document cannot run scripts, navigate, or reach this page.
//
// The Supabase access token is attached as a request header and nowhere else: it is
// never put in a URL, query string, the iframe document, storage, or rendered output.
export default function ConnectionReviewSurface({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      setHtml(null);

      const apiUrl = import.meta.env.VITE_API_URL;
      if (!apiUrl) {
        setError("The review service is not configured for this build.");
        setLoading(false);
        return;
      }

      const token = session?.access_token;
      if (!token) {
        setError("Your session has expired. Sign in again to open the review surface.");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${apiUrl}/production/review/${projectId}/workflow`, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        });
        const body = await res.text();

        if (cancelled) return;

        if (!res.ok) {
          // The API answers a refusal as JSON ({ refusal, reason }); anything else
          // is shown as plain text. React escapes it either way.
          let message = `The review surface could not be opened (HTTP ${res.status}).`;
          try {
            const parsed = JSON.parse(body);
            const code = typeof parsed.refusal === "string" ? parsed.refusal : null;
            const detail = typeof parsed.reason === "string" ? parsed.reason : null;
            message = [code, detail].filter(Boolean).join(" — ") || message;
          } catch {
            if (body.trim()) message = body.trim().slice(0, 300);
          }
          setError(message);
          setLoading(false);
          return;
        }

        setHtml(body);
        setLoading(false);
      } catch {
        if (cancelled) return;
        setError("Could not reach the review service. It may be starting up — try again in a moment.");
        setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [projectId, session?.access_token]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(20,20,20,0.7)", zIndex: 210,
        display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: C.bg, borderRadius: 14, width: "100%", maxWidth: 1100, height: "85vh",
          display: "flex", flexDirection: "column", overflow: "hidden",
          boxShadow: "0 24px 70px rgba(0,0,0,0.3)",
        }}
      >
        {/* Header */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "16px 20px", borderBottom: `1px solid ${C.border}`, background: C.card,
        }}>
          <div>
            <div style={{ fontSize: 11, color: C.rust, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase" }}>
              Review
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.ink }}>
              Connection review
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.grey, padding: 6 }}>
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: C.grey, fontSize: 13 }}>
            Loading the review surface…
          </div>
        ) : error ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: C.grey, fontSize: 13, gap: 10, padding: 24, textAlign: "center" }}>
            <FileText size={28} color={C.greyLight} />
            <div style={{ maxWidth: 520, lineHeight: 1.6 }}>{error}</div>
          </div>
        ) : (
          <iframe
            title="Connection review"
            srcDoc={html ?? ""}
            sandbox=""
            style={{ flex: 1, width: "100%", border: "none", background: C.bg }}
          />
        )}
      </div>
    </div>
  );
}
