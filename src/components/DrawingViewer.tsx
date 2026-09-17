import { useState, useEffect, useCallback } from "react";
import { X, ChevronLeft, ChevronRight, FileText } from "lucide-react";
import { supabase } from "../lib/supabase";
import { theme as C } from "../lib/theme";

interface DrawingPage {
  id: string;
  page_number: number;
  image_storage_path: string;
}

interface ExtractedMember {
  mark: string | null;
  section_name: string | null;
  section_name_raw: string | null;
  confidence_score: number | null;
  review_status: string;
  source_page: number | null;
}

interface ExtractedConnection {
  detail_reference: string | null;
  connection_type: string;
  confidence_score: number | null;
  review_status: string;
  source_page: number | null;
}

export default function DrawingViewer({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pages, setPages] = useState<DrawingPage[]>([]);
  const [currentPageIdx, setCurrentPageIdx] = useState(0);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [members, setMembers] = useState<ExtractedMember[]>([]);
  const [connections, setConnections] = useState<ExtractedConnection[]>([]);
  const [drawingInfo, setDrawingInfo] = useState<{ file_name: string; drawing_number: string | null; drawing_title: string | null } | null>(null);

  // === Load the drawing set, its pages, and all extracted data for this project ===
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      const { data: drawingSet, error: dsErr } = await supabase
        .from("drawing_sets")
        .select("id")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cancelled) return;
      if (dsErr || !drawingSet) {
        setError("No source drawings found for this project. This project may have been extracted from a DXF or DWG file rather than a PDF.");
        setLoading(false);
        return;
      }

      const { data: drawing, error: dErr } = await supabase
        .from("drawings")
        .select("id, file_name, drawing_number, drawing_title")
        .eq("drawing_set_id", drawingSet.id)
        .order("uploaded_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (cancelled) return;
      if (dErr || !drawing) {
        setError("This drawing set has no pages recorded yet.");
        setLoading(false);
        return;
      }
      setDrawingInfo(drawing);

      const { data: pageRows } = await supabase
        .from("drawing_pages")
        .select("id, page_number, image_storage_path")
        .eq("drawing_id", drawing.id)
        .order("page_number", { ascending: true });

      if (cancelled) return;
      setPages(pageRows || []);

      const [{ data: memberRows }, { data: connectionRows }] = await Promise.all([
        supabase
          .from("steel_members")
          .select("mark, section_name, section_name_raw, confidence_score, review_status, source_page")
          .eq("project_id", projectId)
          .eq("extraction_method", "vision_claude"),
        supabase
          .from("connections")
          .select("detail_reference, connection_type, confidence_score, review_status, source_page")
          .eq("project_id", projectId)
          .eq("extraction_method", "vision_claude"),
      ]);

      if (cancelled) return;
      setMembers(memberRows || []);
      setConnections(connectionRows || []);
      setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, [projectId]);

  // === Fetch a fresh signed URL whenever the current page changes ===
  const loadImage = useCallback(async (page: DrawingPage) => {
    setImageLoading(true);
    const { data, error: urlErr } = await supabase.storage
      .from("drawing-pages")
      .createSignedUrl(page.image_storage_path, 300);
    if (!urlErr && data) setImageUrl(data.signedUrl);
    setImageLoading(false);
  }, []);

  useEffect(() => {
    if (pages.length > 0) loadImage(pages[currentPageIdx]);
  }, [pages, currentPageIdx, loadImage]);

  const currentPage = pages[currentPageIdx];
  const pageMembers = members.filter((m) => m.source_page === currentPage?.page_number);
  const pageConnections = connections.filter((c) => c.source_page === currentPage?.page_number);

  const statusColor = (status: string) =>
    status === "review_required" ? C.amber : C.green;
  const statusBg = (status: string) =>
    status === "review_required" ? C.amberBg : C.greenBg;
  const statusLabel = (status: string) =>
    status === "review_required" ? "Verify" : "Matched";

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(20,20,20,0.7)", zIndex: 200,
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
              Source Drawing
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.ink }}>
              {drawingInfo?.drawing_number || drawingInfo?.file_name || "Drawing viewer"}
              {drawingInfo?.drawing_title ? ` — ${drawingInfo.drawing_title}` : ""}
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.grey, padding: 6 }}>
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: C.grey, fontSize: 13 }}>
            Loading drawing pages…
          </div>
        ) : error ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: C.grey, fontSize: 13, gap: 10, padding: 24, textAlign: "center" }}>
            <FileText size={28} color={C.greyLight} />
            {error}
          </div>
        ) : (
          <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
            {/* Left: the source page image */}
            <div style={{
              flex: 1.4, background: "#2a2a2a", display: "flex", alignItems: "center",
              justifyContent: "center", position: "relative", overflow: "auto",
            }}>
              {imageLoading || !imageUrl ? (
                <div style={{ color: "#999", fontSize: 13 }}>Loading page…</div>
              ) : (
                <img src={imageUrl} alt={`Page ${currentPage?.page_number}`} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
              )}

              {pages.length > 1 && (
                <>
                  <button
                    onClick={() => setCurrentPageIdx((i) => Math.max(0, i - 1))}
                    disabled={currentPageIdx === 0}
                    style={{
                      position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
                      background: "rgba(0,0,0,0.5)", border: "none", borderRadius: 8, color: "#fff",
                      padding: 8, cursor: currentPageIdx === 0 ? "default" : "pointer",
                      opacity: currentPageIdx === 0 ? 0.3 : 1,
                    }}
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    onClick={() => setCurrentPageIdx((i) => Math.min(pages.length - 1, i + 1))}
                    disabled={currentPageIdx === pages.length - 1}
                    style={{
                      position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                      background: "rgba(0,0,0,0.5)", border: "none", borderRadius: 8, color: "#fff",
                      padding: 8, cursor: currentPageIdx === pages.length - 1 ? "default" : "pointer",
                      opacity: currentPageIdx === pages.length - 1 ? 0.3 : 1,
                    }}
                  >
                    <ChevronRight size={18} />
                  </button>
                  <div style={{
                    position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)",
                    background: "rgba(0,0,0,0.6)", color: "#fff", fontSize: 11, padding: "4px 12px", borderRadius: 20,
                  }}>
                    Page {currentPage?.page_number} of {pages.length}
                  </div>
                </>
              )}
            </div>

            {/* Right: what was extracted from this specific page */}
            <div style={{ flex: 1, borderLeft: `1px solid ${C.border}`, overflowY: "auto", padding: 16, background: C.card }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: C.grey, marginBottom: 12 }}>
                Extracted from this page
              </div>

              {pageMembers.length === 0 && pageConnections.length === 0 ? (
                <div style={{ fontSize: 12.5, color: C.greyLight, lineHeight: 1.6 }}>
                  Nothing was extracted from this specific page.
                </div>
              ) : (
                <>
                  {pageMembers.map((m, i) => (
                    <div key={`m-${i}`} style={{ padding: "10px 12px", marginBottom: 8, background: C.bg, borderRadius: 8, border: `1px solid ${C.borderLight}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontWeight: 700, fontSize: 13 }}>{m.mark || "—"}</span>
                        <span style={{
                          fontSize: 10.5, fontWeight: 600, padding: "2px 8px", borderRadius: 20,
                          color: statusColor(m.review_status), background: statusBg(m.review_status),
                        }}>
                          {statusLabel(m.review_status)}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: C.ink2, marginTop: 3, fontFamily: C.mono }}>
                        {m.section_name || m.section_name_raw || "Unmatched section"}
                      </div>
                      {m.confidence_score != null && (
                        <div style={{ fontSize: 10.5, color: C.greyLight, marginTop: 3 }}>
                          {m.confidence_score}% confidence
                        </div>
                      )}
                    </div>
                  ))}

                  {pageConnections.map((c, i) => (
                    <div key={`c-${i}`} style={{ padding: "10px 12px", marginBottom: 8, background: C.rustBg, borderRadius: 8, border: `1px solid ${C.rustBorder}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontWeight: 700, fontSize: 13 }}>
                          {c.detail_reference || "Connection"}
                        </span>
                        <span style={{
                          fontSize: 10.5, fontWeight: 600, padding: "2px 8px", borderRadius: 20,
                          color: statusColor(c.review_status), background: statusBg(c.review_status),
                        }}>
                          {statusLabel(c.review_status)}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: C.ink2, marginTop: 3 }}>
                        {c.connection_type.replace(/_/g, " ")}
                      </div>
                      {c.confidence_score != null && (
                        <div style={{ fontSize: 10.5, color: C.greyLight, marginTop: 3 }}>
                          {c.confidence_score}% confidence
                        </div>
                      )}
                    </div>
                  ))}
                </>
              )}

              {pages.length > 1 && (
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 16, paddingTop: 16, borderTop: `1px solid ${C.borderLight}` }}>
                  {pages.map((p, i) => (
                    <button
                      key={p.id}
                      onClick={() => setCurrentPageIdx(i)}
                      style={{
                        width: 28, height: 28, borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer",
                        border: `1px solid ${i === currentPageIdx ? C.rust : C.border}`,
                        background: i === currentPageIdx ? C.rustBg : C.bg,
                        color: i === currentPageIdx ? C.rust : C.grey,
                      }}
                    >
                      {p.page_number}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}