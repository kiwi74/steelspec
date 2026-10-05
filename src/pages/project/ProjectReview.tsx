import { useCallback, useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { ClipboardCheck, RefreshCw } from "lucide-react";
import { theme as C } from "../../lib/theme";
import type { Project } from "../../lib/projects";
import { useAuth } from "../../lib/AuthContext";
import ConnectionReviewSurface from "../../components/ConnectionReviewSurface";
import {
  ReviewRefused,
  buildAnswer,
  canRenderTask,
  emptyDraft,
  openReview,
  readReview,
  resolveConnection,
} from "../../lib/review";
import type {
  AnswerDraft,
  ResolutionEntry,
  ResolutionOutcome,
  ReviewConnection,
  ReviewDocument,
  ReviewTask,
} from "../../lib/review";
import { Badge } from "../../components/ui";
import { btnGhost, btnRust, panel, panelHead } from "../../lib/ui";

// The review destination, now bound to the live review service.
//
// E2E-001A. This screen opens the project's review, reads it as structured data, shows
// the connection, its evidence and its tasks, and records a human answer through the
// production resolution route. The service is authoritative for all of it: this screen
// sends what the review states and reports what the service answers — including its
// refusals, which are shown as the refusals they are rather than as an empty review.
//
// The access token travels in an Authorization header and nowhere else. The sandboxed
// iframe below is read-only evidence and stays read-only: it carries no token, and no
// control inside it can submit anything. Every write on this page is native.

function FindingList({ findings }: { findings: ReviewConnection["blockers"] }) {
  if (findings.length === 0) return null;
  return (
    <ul style={{ margin: "8px 0 0", padding: 0, listStyle: "none" }}>
      {findings.map((finding) => (
        <li key={finding.code + finding.message} style={{ fontSize: 12, color: C.red, lineHeight: 1.55, marginTop: 4 }}>
          <strong style={{ fontWeight: 600 }}>{finding.severity_label || finding.severity}:</strong> {finding.message}
        </li>
      ))}
    </ul>
  );
}

function TaskControl({
  task,
  draft,
  onChange,
}: {
  task: ReviewTask;
  draft: AnswerDraft;
  onChange: (next: AnswerDraft) => void;
}) {
  const inputStyle = {
    width: "100%", padding: "9px 11px", background: C.card, border: `1px solid ${C.border}`,
    borderRadius: 8, fontSize: 13, fontFamily: "inherit", color: C.ink, boxSizing: "border-box" as const,
  };

  if (task.answer_payload.kind === "none") {
    return <div style={{ fontSize: 12, color: C.grey }}>Confirming this records your answer with no further detail.</div>;
  }
  if (task.answer_payload.kind === "mapping") {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {task.answer_payload.fields.map((field) => (
          <label key={field} style={{ fontSize: 11, color: C.grey }}>
            {field.replace(/_/g, " ")}
            <input
              className="ss-input"
              value={draft.fields[field] ?? ""}
              onChange={(e) => onChange({ ...draft, fields: { ...draft.fields, [field]: e.target.value } })}
              style={{ ...inputStyle, marginTop: 3 }}
            />
          </label>
        ))}
      </div>
    );
  }
  return (
    <div>
      <input
        className="ss-input"
        value={draft.text}
        placeholder={
          task.allowed_options.length > 0
            ? `One of: ${task.allowed_options.join(", ")}`
            : task.answer_payload.kind === "texts"
              ? "Comma-separated values"
              : "Your answer"
        }
        onChange={(e) => onChange({ ...draft, text: e.target.value })}
        style={inputStyle}
      />
      {task.allowed_options.length > 0 && (
        <div style={{ fontSize: 11, color: C.grey, marginTop: 4 }}>Permitted: {task.allowed_options.join(", ")}</div>
      )}
    </div>
  );
}

function ConnectionCard({
  connection,
  draftFor,
  setDraftFor,
  onSubmit,
  busy,
  disabled,
}: {
  connection: ReviewConnection;
  draftFor: (taskId: string) => AnswerDraft;
  setDraftFor: (taskId: string, next: AnswerDraft) => void;
  onSubmit: (connection: ReviewConnection) => void;
  busy: boolean;
  disabled: boolean;
}) {
  const open = connection.tasks.filter((task) => !task.resolved);
  const renderable = open.filter(canRenderTask);
  const unsupported = open.filter((task) => !canRenderTask(task));

  return (
    <div style={{ ...panel, marginBottom: 16 }}>
      <div style={panelHead}>
        <h3 style={{ fontSize: 14, fontWeight: 600 }}>
          {connection.display_reference || connection.connection_id || connection.package_id}
        </h3>
        <span style={{ fontSize: 12, color: C.grey }}>{connection.decision_label}</span>
      </div>
      <div style={{ padding: 20 }}>
        <div style={{ fontSize: 12.5, color: C.ink2, lineHeight: 1.6 }}>
          <strong style={{ color: C.ink }}>Evidence:</strong> {connection.evidence.evidence_text || "No evidence recorded."}
        </div>
        {connection.extracted.connection_type && (
          <div style={{ fontSize: 12, color: C.grey, marginTop: 4 }}>
            Extracted as {connection.extracted.connection_type}
            {connection.extracted.confidence ? ` · confidence ${connection.extracted.confidence}` : ""}
          </div>
        )}
        <FindingList findings={connection.blockers} />

        {unsupported.length > 0 && (
          <div style={{ marginTop: 12, padding: "10px 12px", background: C.amberBg, border: `1px solid ${C.borderLight}`, borderRadius: 8, fontSize: 12, color: C.ink2, lineHeight: 1.55 }}>
            {unsupported.length} task{unsupported.length === 1 ? "" : "s"} here need
            {unsupported.length === 1 ? "s" : ""} an answer type this build cannot yet present
            {" "}({Array.from(new Set(unsupported.map((t) => t.answer_type))).join(", ")}). SteelSpec will not
            guess at one, so those tasks stay unresolved until that control exists.
          </div>
        )}

        {renderable.map((task) => (
          <div key={task.task_id} style={{ marginTop: 14 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: C.ink }}>
              {task.title}
              {task.required && <span style={{ color: C.rust, marginLeft: 6, fontSize: 11 }}>required</span>}
            </div>
            {task.description && (
              <div style={{ fontSize: 12, color: C.grey, lineHeight: 1.55, marginTop: 2 }}>{task.description}</div>
            )}
            <div style={{ marginTop: 8 }}>
              <TaskControl task={task} draft={draftFor(task.task_id)} onChange={(next) => setDraftFor(task.task_id, next)} />
            </div>
          </div>
        ))}

        {connection.tasks.some((task) => task.resolved) && (
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.borderLight}` }}>
            {connection.tasks.filter((task) => task.resolved).map((task) => (
              <div key={task.task_id} style={{ fontSize: 12, color: C.grey, lineHeight: 1.6 }}>
                <strong style={{ color: C.ink2 }}>{task.title}:</strong> {task.resolution_value || "recorded"}
                {task.resolution_evidence ? ` — ${task.resolution_evidence}` : ""}
              </div>
            ))}
          </div>
        )}

        {renderable.length > 0 && (
          <button
            className="ss-focus"
            style={{ ...btnRust, marginTop: 16, opacity: busy || disabled ? 0.6 : 1, cursor: busy || disabled ? "default" : "pointer" }}
            disabled={busy || disabled}
            onClick={() => onSubmit(connection)}
          >
            <ClipboardCheck size={15} /> {busy ? "Recording…" : "Record this review"}
          </button>
        )}
      </div>
    </div>
  );
}

export default function ProjectReview() {
  const project = useOutletContext<Project>();
  const { session } = useAuth();
  const token = session?.access_token ?? null;

  const [surfaceOpen, setSurfaceOpen] = useState(false);
  const [doc, setDoc] = useState<ReviewDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);
  const [busyPackage, setBusyPackage] = useState<string | null>(null);
  const [refusal, setRefusal] = useState<ReviewRefused | null>(null);
  const [outcome, setOutcome] = useState<ResolutionOutcome | null>(null);
  const [drafts, setDrafts] = useState<Record<string, AnswerDraft>>({});

  const load = useCallback(async () => {
    if (!token) {
      setLoading(false);
      setRefusal(new ReviewRefused(0, "REVIEW_NO_SESSION", "Your session has expired. Sign in again to open the review."));
      return;
    }
    setLoading(true);
    setRefusal(null);
    try {
      setDoc(await readReview(project.id, token));
    } catch (error) {
      setDoc(null);
      setRefusal(error instanceof ReviewRefused ? error : new ReviewRefused(0, "REVIEW_UNREACHABLE", "The review service could not be reached. It may be starting up — try again in a moment."));
    } finally {
      setLoading(false);
    }
  }, [project.id, token]);

  useEffect(() => { load(); }, [load]);

  // Opening is a deliberate act, not a side effect of looking at the page: it records the
  // revision-0 baseline, and it is the only write that happens before a human decides
  // anything.
  const start = async () => {
    if (!token) return;
    setOpening(true);
    setRefusal(null);
    try {
      await openReview(project.id, token);
      await load();
    } catch (error) {
      setRefusal(error instanceof ReviewRefused ? error : new ReviewRefused(0, "REVIEW_UNREACHABLE", "The review service could not be reached."));
    } finally {
      setOpening(false);
    }
  };

  const submit = async (connection: ReviewConnection) => {
    if (!token || !doc) return;
    setBusyPackage(connection.package_id);
    setRefusal(null);
    setOutcome(null);
    try {
      const resolutions: ResolutionEntry[] = [];
      for (const task of connection.tasks) {
        if (task.resolved || !canRenderTask(task)) continue;
        const draft = drafts[task.task_id] ?? emptyDraft();
        if (task.answer_payload.kind !== "none" && !draft.text.trim() && Object.values(draft.fields).every((v) => !v.trim())) continue;
        resolutions.push({
          task_id: task.task_id,
          task_type: task.task_type,
          answer_type: task.answer_type,
          answer: buildAnswer(task, draft),
        });
      }
      if (resolutions.length === 0) {
        setRefusal(new ReviewRefused(0, "REVIEW_NOTHING_TO_SEND", "Answer at least one task before recording this review."));
        return;
      }
      // The revision is the one the service recorded and this screen was shown. It is
      // never computed here, so a decision made against a stale review is refused by
      // the service rather than applied.
      const result = await resolveConnection(project.id, connection.package_id, token, doc.revision, resolutions);
      setOutcome(result);
      setDrafts({});
      await load();
    } catch (error) {
      const refused = error instanceof ReviewRefused ? error : new ReviewRefused(0, "REVIEW_UNREACHABLE", "The review could not be recorded.");
      setRefusal(refused);
      // A stale revision means this screen is showing a review that has moved on.
      // Re-reading is the only honest response; re-sending would apply a stale decision.
      if (refused.staleRevision) await load();
    } finally {
      setBusyPackage(null);
    }
  };

  const draftFor = (taskId: string) => drafts[taskId] ?? emptyDraft();
  const setDraftFor = (taskId: string, next: AnswerDraft) => setDrafts((prev) => ({ ...prev, [taskId]: next }));

  return (
    <>
      <div style={{ padding: "20px 0 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <h1 style={{ fontSize: 21, fontWeight: 700 }}>Review</h1>
          <Badge status={project.status} />
          {doc && doc.revision_recorded && (
            <span style={{ fontSize: 11.5, color: C.grey, fontFamily: C.mono }}>revision {doc.revision}</span>
          )}
        </div>
        <p style={{ fontSize: 13, color: C.grey, marginTop: 2 }}>
          Detailed engineering review for this project's connections.
        </p>
      </div>

      {loading && (
        <div style={panel}><div style={{ padding: 28, fontSize: 13, color: C.grey }}>Loading the review…</div></div>
      )}

      {!loading && refusal && (
        <div style={{ ...panel, marginBottom: 16 }}>
          <div style={panelHead}><h3 style={{ fontSize: 14, fontWeight: 600 }}>The review could not be shown</h3></div>
          <div style={{ padding: "20px 24px", fontSize: 13, color: C.ink2, lineHeight: 1.65 }}>
            <p style={{ margin: 0, color: C.red }}>{refusal.message}</p>
            <p style={{ margin: "8px 0 0", color: C.grey, fontSize: 12, fontFamily: C.mono }}>{refusal.code}</p>
            <button className="ss-focus" style={{ ...btnGhost, marginTop: 16 }} onClick={load}>
              <RefreshCw size={14} /> Try again
            </button>
          </div>
        </div>
      )}

      {/* A refused reconstruction is shown as that refusal, and never also as "not opened":
          opening a review the service cannot reconstruct would not help, and offering it
          would say the problem is that nobody has opened it. */}
      {!loading && !refusal && doc && !doc.revision_recorded && !doc.refusal_code && (
        <div style={{ ...panel, marginBottom: 16 }}>
          <div style={panelHead}><h3 style={{ fontSize: 14, fontWeight: 600 }}>This review has not been opened</h3></div>
          <div style={{ padding: "24px", fontSize: 13, color: C.ink2, lineHeight: 1.65 }}>
            <p style={{ margin: 0 }}>
              Opening the review records its revision-0 baseline, which is what every decision after it is
              recorded against. It changes no engineering value and is recorded once.
            </p>
            <button className="ss-focus" style={{ ...btnRust, marginTop: 16, opacity: opening ? 0.6 : 1 }} disabled={opening} onClick={start}>
              <ClipboardCheck size={15} /> {opening ? "Opening…" : "Open review"}
            </button>
          </div>
        </div>
      )}

      {!loading && !refusal && doc?.refusal_code && (
        <div style={{ ...panel, marginBottom: 16 }}>
          <div style={panelHead}><h3 style={{ fontSize: 14, fontWeight: 600 }}>The review could not be reconstructed</h3></div>
          <div style={{ padding: "20px 24px", fontSize: 13, color: C.ink2, lineHeight: 1.65 }}>
            <p style={{ margin: 0 }}>{doc.refusal_detail || "The service refused to reconstruct this project's review."}</p>
            <p style={{ margin: "8px 0 0", color: C.grey, fontSize: 12, fontFamily: C.mono }}>{doc.refusal_code}</p>
            <p style={{ margin: "10px 0 0", color: C.grey }}>
              That is a refusal, not an empty review: nothing here is being reported as having no connections.
            </p>
          </div>
        </div>
      )}

      {!loading && !refusal && doc?.revision_recorded && !doc.refusal_code && (
        <>
          {outcome && (
            <div style={{ ...panel, marginBottom: 16, borderColor: outcome.failures.length > 0 ? C.border : C.rustBorder }}>
              <div style={panelHead}><h3 style={{ fontSize: 14, fontWeight: 600 }}>Recorded</h3></div>
              <div style={{ padding: "18px 20px", fontSize: 12.5, color: C.ink2, lineHeight: 1.65 }}>
                <div>The review was recorded. The review is now at revision {outcome.review_revision}.</div>
                <div style={{ color: C.grey, marginTop: 4 }}>
                  Decision recorded as {outcome.decision}.
                  {outcome.durable_artifact_path ? " A fabrication drawing was stored." : " No fabrication drawing was produced for this decision."}
                </div>
                {outcome.failures.length > 0 && (
                  <div style={{ color: C.red, marginTop: 6 }}>
                    The review was recorded, but these did not happen: {outcome.failures.join("; ")}.
                  </div>
                )}
                {(outcome.blocker_codes.length > 0 || outcome.warning_codes.length > 0) && (
                  <div style={{ color: C.grey, marginTop: 6, fontFamily: C.mono, fontSize: 11.5 }}>
                    {[...outcome.blocker_codes, ...outcome.warning_codes].join(" · ")}
                  </div>
                )}
              </div>
            </div>
          )}

          {doc.counts && (
            <div style={{ ...panel, marginBottom: 16 }}>
              <div style={{ padding: "16px 20px", fontSize: 12.5, color: C.ink2, display: "flex", gap: 22, flexWrap: "wrap" }}>
                <span>{doc.counts.review} to review</span>
                <span>{doc.counts.confirmation} to confirm</span>
                <span>{doc.counts.blocked} blocked</span>
                <span>{doc.counts.verified} verified</span>
              </div>
            </div>
          )}

          {doc.connections.length === 0 && (
            <div style={panel}>
              <div style={{ padding: 28, fontSize: 13, color: C.grey }}>
                This project's review holds no connections to show.
              </div>
            </div>
          )}

          {doc.connections.map((connection) => (
            <ConnectionCard
              key={connection.package_id}
              connection={connection}
              draftFor={draftFor}
              setDraftFor={setDraftFor}
              onSubmit={submit}
              busy={busyPackage === connection.package_id}
              disabled={busyPackage !== null}
            />
          ))}

          {doc.limitations.length > 0 && (
            <div style={panel}>
              <div style={{ padding: 20, fontSize: 12.5, color: C.ink2, lineHeight: 1.65 }}>
                {doc.limitations.map((triple) => (
                  <div key={triple.join("|")}>{triple[triple.length - 1]}</div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <div style={{ ...panel, marginTop: 16 }}>
        <div style={panelHead}><h3 style={{ fontSize: 14, fontWeight: 600 }}>Read-only view</h3></div>
        <div style={{ padding: "20px 24px", fontSize: 13, color: C.ink2, lineHeight: 1.65 }}>
          <p style={{ margin: 0 }}>
            The service's own rendered review opens beside this page and shows the same record as a document —
            listings, coverage and the persisted state. It is opened read-only and stays read-only: it carries no
            session token and nothing inside it can record a decision.
          </p>
          <button className="ss-focus" style={{ ...btnGhost, marginTop: 16 }} onClick={() => setSurfaceOpen(true)}>
            <ClipboardCheck size={15} /> Open the rendered review
          </button>
        </div>
      </div>

      {surfaceOpen && <ConnectionReviewSurface projectId={project.id} onClose={() => setSurfaceOpen(false)} />}
    </>
  );
}
