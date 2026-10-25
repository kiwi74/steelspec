import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import { useAuth } from "../lib/AuthContext";
import {
  ReviewRefused,
  readReview,
  selectableDocuments,
  type ReviewDocument,
} from "../lib/review";
import { theme as C } from "../lib/theme";
import { btnGhost, panel, panelHead } from "../lib/ui";
import ContinueExtractionCard from "./ContinueExtractionCard";

// The project-overview entry to the continuation action. The overview's project row does
// not carry a document id or page coverage, so this panel reads the review the service
// already serves — the same read the Review screen uses — and offers the action only when
// the service says exactly ONE document has readings. More than one is a choice the reader
// makes on the Review screen; it is never made here.
function Shell({ children }: { children: ReactNode }) {
  return (
    <div style={{ ...panel, marginBottom: 16 }}>
      <div style={panelHead}>
        <h3 style={{ fontSize: 14, fontWeight: 600 }}>Continue extraction</h3>
      </div>
      <div style={{ padding: "16px 20px", fontSize: 12.5, color: C.ink2, lineHeight: 1.65 }}>
        {children}
      </div>
    </div>
  );
}

export default function ContinueExtractionPanel({ projectId }: { projectId: string }) {
  const { session } = useAuth();
  const token = session?.access_token ?? null;
  const [doc, setDoc] = useState<ReviewDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // A refresh after the first successful read must NOT fall back to the loading shell:
  // that would unmount the card (and its one in-flight request) while it polls coverage.
  const docRef = useRef<ReviewDocument | null>(null);
  useEffect(() => {
    docRef.current = doc;
  }, [doc]);

  const load = useCallback(async () => {
    if (!token) {
      setLoading(false);
      setError("Your session has expired. Sign in again to continue extraction.");
      return;
    }
    if (docRef.current === null) setLoading(true);
    setError(null);
    try {
      setDoc(await readReview(projectId, token));
    } catch (refused) {
      setDoc(null);
      setError(
        refused instanceof ReviewRefused
          ? `${refused.message} (${refused.code})`
          : "The review service could not be reached.",
      );
    } finally {
      setLoading(false);
    }
  }, [projectId, token]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <Shell>
        <p style={{ margin: 0, color: C.grey }}>Checking the recorded extraction coverage…</p>
      </Shell>
    );
  }

  if (error) {
    return (
      <Shell>
        <p style={{ margin: 0, color: C.red }}>{error}</p>
        <p style={{ margin: "8px 0 0", color: C.grey }}>
          You can still open the Review screen, where the document and its coverage are
          shown together.
        </p>
        <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
          <button className="ss-focus" style={btnGhost} onClick={load}>
            <RefreshCw size={14} /> Try again
          </button>
          <Link to={`/projects/${projectId}/review`} style={{ ...btnGhost, textDecoration: "none" }}>
            Open Review
          </Link>
        </div>
      </Shell>
    );
  }

  const readable = selectableDocuments(doc);

  if (readable.length === 0) {
    return (
      <Shell>
        <p style={{ margin: 0, color: C.grey }}>
          No source document has been read yet. Continuation applies to a document whose first
          extraction window has already been recorded.
        </p>
      </Shell>
    );
  }

  if (readable.length > 1) {
    return (
      <Shell>
        <p style={{ margin: 0 }}>
          This project holds {readable.length} source documents with readings. Which one to
          continue is a decision about the document, not about the files, so it is made on the
          Review screen.
        </p>
        <Link
          to={`/projects/${projectId}/review`}
          style={{ ...btnGhost, textDecoration: "none", marginTop: 12 }}
        >
          Choose a document in Review
        </Link>
      </Shell>
    );
  }

  if (doc?.refusal_code) {
    return (
      <Shell>
        <p style={{ margin: 0 }}>{doc.refusal_detail || "The review service refused to reconstruct this project's coverage."}</p>
        <p style={{ margin: "6px 0 0", color: C.grey, fontFamily: C.mono, fontSize: 11.5 }}>{doc.refusal_code}</p>
        <Link
          to={`/projects/${projectId}/review`}
          style={{ ...btnGhost, textDecoration: "none", marginTop: 12 }}
        >
          Open Review
        </Link>
      </Shell>
    );
  }

  return (
    <ContinueExtractionCard
      projectId={projectId}
      token={token}
      documentId={readable[0].document_id}
      coverage={doc?.coverage}
      onRefreshed={load}
    />
  );
}
