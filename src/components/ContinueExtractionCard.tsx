import { useEffect, useRef, useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { theme as C } from "../lib/theme";
import { btnGhost, panel, panelHead } from "../lib/ui";
import {
  ContinuationRefused,
  continueExtraction,
  coverageFingerprint,
  createContinuationGate,
  readCoverage,
  type CoverageRows,
} from "../lib/extraction";

// One continuation window per explicit click. The request is accepted immediately while
// the reading runs in the service's background task, so the card polls the review's OWN
// coverage rows afterwards and stops when they change — it never sends a second
// continuation to discover progress, and it never invents a page range.
const POLL_INTERVAL_MS = 3000;
const POLL_ATTEMPTS = 80; // ~4 minutes, then an honest "not reflected yet" notice.

interface ContinueExtractionCardProps {
  projectId: string;
  token: string | null;
  documentId: string | null;
  coverage: CoverageRows;
  /** Re-read the review so the coverage rows reflect what the service has persisted. */
  onRefreshed?: () => void | Promise<void>;
}

function CoverageLine({ label, value }: { label: string; value: string | null }) {
  if (value === null) return null;
  return (
    <div style={{ marginTop: 4 }}>
      <span style={{ color: C.grey }}>{label}: </span>
      <span style={{ fontFamily: C.mono, overflowWrap: "anywhere" }}>{value}</span>
    </div>
  );
}

export default function ContinueExtractionCard({
  projectId,
  token,
  documentId,
  coverage,
  onRefreshed,
}: ContinueExtractionCardProps) {
  const summary = readCoverage(coverage);
  const gate = useRef(createContinuationGate());
  const rowsRef = useRef<CoverageRows>(coverage);
  const cancelled = useRef(false);
  const [busy, setBusy] = useState(false);
  const [accepted, setAccepted] = useState<{ first: number; last: number } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<ContinuationRefused | null>(null);

  useEffect(() => {
    rowsRef.current = coverage;
  }, [coverage]);

  useEffect(() => {
    cancelled.current = false;
    return () => {
      cancelled.current = true;
    };
  }, []);

  if (!token || !documentId) return null;

  const onContinue = async () => {
    // The synchronous gate is what makes a duplicate click impossible: React state has not
    // re-rendered yet when two clicks arrive in the same tick.
    if (!gate.current.tryBegin()) return;
    const before = coverageFingerprint(rowsRef.current);
    setBusy(true);
    setError(null);
    setAccepted(null);
    setNotice(null);
    try {
      const window = await continueExtraction(projectId, token, documentId);
      if (cancelled.current) return;
      setAccepted({ first: window.first_page, last: window.last_page });
      setNotice(
        `The service accepted pages ${window.first_page}–${window.last_page}. Waiting for the reading to appear in coverage…`,
      );

      // The continuation is a background task. Refresh the review's own coverage until it
      // changes; if it does not, say so rather than claiming the pages were read.
      if (!onRefreshed) return;
      let reflected = false;
      for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, attempt === 0 ? 1500 : POLL_INTERVAL_MS));
        if (cancelled.current) return;
        try {
          await onRefreshed();
        } catch {
          // The page owns its read errors; the card keeps polling for its own state.
        }
        // Let the refreshed rows reach this component before comparing.
        await new Promise((resolve) => setTimeout(resolve, 0));
        const now = rowsRef.current;
        if (coverageFingerprint(now) !== before || readCoverage(now).complete) {
          reflected = true;
          break;
        }
      }
      if (cancelled.current) return;
      setNotice(
        reflected
          ? `Pages ${window.first_page}–${window.last_page} were accepted; the coverage above now reflects the service's record.`
          : `The service accepted pages ${window.first_page}–${window.last_page}, but coverage has not changed yet. The reading may still be running — refresh the review to see progress; no second continuation was sent.`,
      );
    } catch (refused) {
      if (cancelled.current) return;
      setError(
        refused instanceof ContinuationRefused
          ? refused
          : new ContinuationRefused(
              0,
              "EXTRACTION_UNREACHABLE",
              "The extraction service could not be reached. No continuation was sent.",
            ),
      );
    } finally {
      gate.current.end();
      if (!cancelled.current) setBusy(false);
    }
  };

  return (
    <div style={{ ...panel, marginBottom: 16 }}>
      <div style={panelHead}>
        <h3 style={{ fontSize: 14, fontWeight: 600 }}>Extraction coverage</h3>
        {summary.pages !== null && (
          <span style={{ fontSize: 11.5, color: C.grey, fontFamily: C.mono }}>{summary.pages} pages</span>
        )}
      </div>
      <div style={{ padding: "16px 20px", fontSize: 12.5, color: C.ink2, lineHeight: 1.65 }}>
        {!summary.present ? (
          <p style={{ margin: 0, color: C.grey }}>
            Coverage is not recorded for this document, so there is no window to continue.
          </p>
        ) : (
          <>
            <CoverageLine label="Analysed" value={summary.analysed} />
            <CoverageLine label="Not analysed" value={summary.notAnalysed} />
            <CoverageLine label="Parse failed" value={summary.parseFailed} />

            {summary.complete ? (
              <p style={{ margin: "10px 0 0" }}>
                All {summary.pages} pages have been read. Nothing remains to continue.
              </p>
            ) : summary.unread ? (
              <>
                <button
                  className="ss-focus"
                  style={{ ...btnGhost, marginTop: 12, opacity: busy ? 0.6 : 1, cursor: busy ? "default" : "pointer" }}
                  disabled={busy}
                  aria-busy={busy}
                  onClick={onContinue}
                >
                  {busy ? <Loader2 size={15} /> : <ArrowRight size={15} />}
                  {busy
                    ? accepted
                      ? `Reading pages ${accepted.first}–${accepted.last}…`
                      : "Requesting the next window…"
                    : "Continue extraction"}
                </button>
                <p style={{ margin: "8px 0 0", color: C.grey, fontSize: 11.5 }}>
                  The service chooses the next contiguous window from the recorded coverage.
                  SteelSpec does not choose a page range here.
                </p>
              </>
            ) : (
              <p style={{ margin: "10px 0 0", color: C.grey }}>
                Coverage does not state which pages remain unread, so no continuation is offered.
              </p>
            )}

            {summary.parseFailed !== null && summary.parseFailed !== "(none)" && (
              <p style={{ margin: "8px 0 0", color: C.grey, fontSize: 11.5 }}>
                Pages recorded as parse-failed:{" "}
                <span style={{ fontFamily: C.mono }}>{summary.parseFailed}</span>. A continuation
                does not re-read them; each failed page has its own retry.
              </p>
            )}
          </>
        )}

        {accepted && (
          <p style={{ margin: "8px 0 0" }}>
            The service accepted pages {accepted.first}–{accepted.last}.
          </p>
        )}
        {notice && <p style={{ margin: "6px 0 0", color: C.grey }}>{notice}</p>}
        {error && (
          <p style={{ margin: "6px 0 0", color: C.red }}>
            {error.message} <span style={{ fontFamily: C.mono, fontSize: 11 }}>({error.code})</span>
          </p>
        )}
      </div>
    </div>
  );
}
