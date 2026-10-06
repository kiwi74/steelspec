// The production review client — the one place the browser talks to the review service
// about a review.
//
// Everything here goes through the three routes the review service already serves and
// nothing else: `POST /open` records the revision-0 baseline a review cannot start
// without, `GET /review` reads the review as structured data, and `POST /resolve`
// records one human decision. The access token travels in the `Authorization` header and
// nowhere else — never a URL, never a query string, never the iframe document.
//
// The server is authoritative for all of it. This module validates nothing about an
// engineering answer, decides no status, and never re-derives a revision: it sends what
// the review says and reports what the service answers, refusals included.

const API_URL = import.meta.env.VITE_API_URL as string | undefined;

/** What an `answer` payload must look like for a task. The service describes this per
 *  task from its own answer-type contract; `UNKNOWN` means the service did not describe
 *  it and no payload may be built for it. */
export type AnswerPayloadKind =
  | "none"
  | "text"
  | "texts"
  | "mapping"
  | "attachments"
  | "member_position_attachments"
  | "field_decision"
  | "UNKNOWN";

export interface ReviewTask {
  task_id: string;
  task_type: string;
  title: string;
  description: string;
  field: string | null;
  required: boolean;
  resolved: boolean;
  current_value: string | null;
  allowed_options: string[];
  evidence_requirement: string;
  resolution_value: string | null;
  resolution_evidence: string | null;
  answer_type: string;
  answer_payload: { kind: AnswerPayloadKind; fields: string[] };
}

export interface ReviewEvidence {
  source_drawing_id: string | null;
  drawing_number: string | null;
  source_page: number | null;
  detail_reference: string | null;
  grid_reference: string | null;
  evidence_text: string;
}

export interface ReviewFinding {
  code: string;
  title: string;
  message: string;
  severity: string;
  severity_label: string;
  field: string | null;
  task_type: string | null;
}

export interface ReviewConnection {
  package_id: string;
  connection_id: string | null;
  display_reference: string | null;
  decision: string;
  decision_label: string;
  summary: string;
  attention: { requires_attention: boolean; label: string };
  blockers: ReviewFinding[];
  warnings: ReviewFinding[];
  evidence: ReviewEvidence;
  extracted: {
    member_references: string[];
    bolt_readings: string[];
    plate_readings: string[];
    weld_readings: string[];
    malformed_readings: string[];
    unrecognised_readings: string[];
    connection_type: string | null;
    confidence: string | null;
    material: string | null;
  };
  provenance: { field: string; provenance: string; provenance_label: string }[];
  tasks: ReviewTask[];
  actions: { action: string; label: string }[];
  output: {
    output_status: string | null;
    output_label: string | null;
    verification_status: string | null;
    verification_label: string | null;
    generated_files: string[];
  };
}

/** One of the project's source documents, as the service states it.
 *
 *  `has_readings` is the service's own answer to "has anything read this document", and it
 *  is the ONLY thing that makes a document selectable. It is not derived here from a
 *  filename, a page count or a role — the service decides it, and this client repeats it. */
export interface ReviewDocumentSummary {
  document_id: string;
  file_name: string | null;
  has_readings: boolean;
}

export interface ReviewDocument {
  project_id: string;
  /** The project's documents. A review is about ONE of them; when more than one carries
   *  readings the service refuses to choose, and this list is what a choice is made from. */
  documents: ReviewDocumentSummary[];
  /** The revision the service has RECORDED. This is the value a resolution must send
   *  back as `expected_revision`; it is never computed here. */
  revision: number;
  /** False when the service has recorded nothing yet — which is what `openReview`
   *  exists to fix. A revision of 0 with this false is "not opened", not "opened at 0". */
  revision_recorded: boolean;
  recorded_revisions: number[];
  persisted_code: string;
  refusal_code: string;
  refusal_detail: string;
  identity: string[][];
  coverage: string[][];
  capture_runs: string[];
  /** The analysis runs the RECORDED revision was built from, read off the persisted
   *  snapshot — empty when nothing is recorded. A DIFFERENT identity from `capture_runs`,
   *  which names what the CURRENT reconstruction read: after a lineage is selected the two
   *  name different lineages, and the page shows each against its own band. (L33/L34) */
  recorded_evidence_run_ids: string[];
  limitations: string[][];
  project_status: string | null;
  status_label: string | null;
  summary: string | null;
  counts: {
    review: number;
    verified: number;
    auto: number;
    confirmation: number;
    blocked: number;
  } | null;
  actions: { action: string; label: string }[];
  connections: ReviewConnection[];
}

/** What `POST /open` reports. `recorded_now` false means the review was already open —
 *  the operation is idempotent and consumed no revision. */
export interface ReviewOpening {
  project_id: string;
  review_state: string;
  review_revision: number;
  recorded_now: boolean;
}

/** What `POST /resolve` reports. A generation, verification, upload or pointer failure
 *  is NOT an HTTP error: the review was recorded and what did not happen is named in
 *  `failures`. */
export interface ResolutionOutcome {
  project_id: string;
  review_revision: number;
  review_package_id: string;
  connection_id: string | null;
  decision: string;
  output_status: string | null;
  verification_status: string | null;
  generated_files: string[];
  blocker_codes: string[];
  warning_codes: string[];
  durable_artifact_path: string | null;
  pointer_recorded: boolean;
  claim_release: string | null;
  failures: string[];
}

/** One resolution as the service accepts it. Only these fields may be sent: the project
 *  comes from the URL, the reviewer from the token, and every status from the service's
 *  own gates. Naming a server-owned field is refused rather than ignored. */
export interface ResolutionEntry {
  task_id: string;
  task_type: string;
  answer_type: string;
  answer: unknown;
  evidence?: string;
}

/** A refusal the service stated, kept as the service stated it. `code` is the service's
 *  own refusal code and is what a caller should branch on; `status` never disagrees
 *  with it. */
export class ReviewRefused extends Error {
  readonly status: number;
  readonly code: string;
  constructor(status: number, code: string, statement: string) {
    super(statement);
    this.name = "ReviewRefused";
    this.status = status;
    this.code = code;
  }
  /** The project changed under this reader: re-read before deciding again. */
  get staleRevision(): boolean {
    return this.code === "RESOLUTION_REFUSED_CONCURRENT_REVISION";
  }
  /** The review cannot be read at all — a stated refusal, not an empty review. */
  get noReviewLayer(): boolean {
    return this.code === "RESOLUTION_REFUSED_NO_REVIEW_LAYER";
  }
}

function requireApiUrl(): string {
  if (!API_URL) throw new ReviewRefused(0, "REVIEW_SERVICE_NOT_CONFIGURED", "The review service is not configured for this build.");
  return API_URL;
}

async function readRefusal(response: Response): Promise<ReviewRefused> {
  const body = await response.text();
  let code = `HTTP_${response.status}`;
  let statement = `The review service refused this request (HTTP ${response.status}).`;
  try {
    const parsed = JSON.parse(body);
    const detail = parsed?.detail ?? parsed;
    if (typeof detail?.refusal === "string") code = detail.refusal;
    if (typeof detail?.reason === "string") statement = detail.reason;
    else if (typeof detail === "string") statement = detail;
  } catch {
    if (body.trim()) statement = body.trim().slice(0, 300);
  }
  return new ReviewRefused(response.status, code, statement);
}

async function call<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${requireApiUrl()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) throw await readRefusal(response);
  return (await response.json()) as T;
}

/** Records the revision-0 baseline a review cannot start without. Idempotent: opening
 *  an already-open review writes nothing and consumes no revision.
 *
 *  `documentId` is the SAME document scope the review is read under (E2E-002J): the
 *  baseline is built from one document's readings, so a project whose readings belong to
 *  more than one must say which, or the reconstruction refuses rather than choosing.
 *
 *  The opening route states its scope in the JSON BODY, not a query string — a body may
 *  carry exactly one field, `document_id` — so this is the one call `scopeQuery` does not
 *  serve. An absent scope sends NO body at all, which is the request every
 *  single-document project has always made. */
export function openReview(
  projectId: string,
  token: string,
  documentId?: string | null,
): Promise<ReviewOpening> {
  const init: RequestInit = { method: "POST" };
  // No scope named -> no body, exactly as before. A scope named -> the single field the
  // opening contract permits, and `call` supplies the Content-Type from it.
  if (documentId) init.body = JSON.stringify({ document_id: documentId });
  return call<ReviewOpening>(`/production/review/${projectId}/open`, token, init);
}

/** The project's review as structured data. Read-only: it records nothing, claims
 *  nothing, changes no revision and generates no artifact. A reconstruction that refused
 *  is reported in `refusal_code`/`refusal_detail` rather than as an empty review. */
export function readReview(
  projectId: string,
  token: string,
  documentId?: string | null,
): Promise<ReviewDocument> {
  return call<ReviewDocument>(`/production/review/${projectId}/review${scopeQuery(documentId)}`, token, {
    method: "GET",
  });
}

/** The one place the document scope is put into a URL. Omitting it is the pre-existing
 *  request: a project whose readings belong to one document behaves exactly as it did. */
function scopeQuery(documentId?: string | null): string {
  return documentId ? `?document_id=${encodeURIComponent(documentId)}` : "";
}

/** The documents that may be chosen for a review — those the service says carry readings.
 *  A document nothing has read is not selectable, and is never silently dropped from the
 *  list the reader sees; it is simply not offered as a review. */
export function selectableDocuments(review: ReviewDocument | null): ReviewDocumentSummary[] {
  return (review?.documents ?? []).filter((document) => document.has_readings);
}

/** Records one human review of one connection and delivers what it earns. */
export function resolveConnection(
  projectId: string,
  packageId: string,
  token: string,
  expectedRevision: number,
  resolutions: ResolutionEntry[],
  documentId?: string | null,
): Promise<ResolutionOutcome> {
  return call<ResolutionOutcome>(
    // The SAME document scope the review was read under: a connection is never resolved
    // against a project-wide reconstruction the review did not use.
    `/production/review/${projectId}/connections/${packageId}/resolve${scopeQuery(documentId)}`,
    token,
    {
      method: "POST",
      // Only the two client-permitted fields are ever sent.
      body: JSON.stringify({ expected_revision: expectedRevision, resolutions }),
    },
  );
}

/** A task's answer draft, as typed. The shape is what `buildAnswer` turns into the
 *  payload the task's answer type requires. */
export interface AnswerDraft {
  text: string;
  fields: Record<string, string>;
}

export const emptyDraft = (): AnswerDraft => ({ text: "", fields: {} });

/** A task's answer, in the payload shape its `answer_type` requires.
 *
 *  The shapes are the review service's own — it describes them per task, and the
 *  resolution contract remains the only thing that decides whether an answer stands. A
 *  type this build cannot build a payload for is refused here rather than guessed at, so
 *  nothing invalid is ever sent.
 */
export function buildAnswer(task: ReviewTask, draft: AnswerDraft): unknown {
  const text = draft.text.trim();
  switch (task.answer_payload.kind) {
    case "none":
      return null;
    case "text":
      if (!text) throw new Error(`"${task.title}" needs a value.`);
      return text;
    case "texts": {
      const values = text.split(",").map((part) => part.trim()).filter(Boolean);
      if (values.length === 0) throw new Error(`"${task.title}" needs at least one value.`);
      return values;
    }
    case "mapping": {
      const mapping: Record<string, string> = {};
      for (const field of task.answer_payload.fields) {
        const value = (draft.fields[field] ?? "").trim();
        if (value) mapping[field] = value;
      }
      if (Object.keys(mapping).length === 0) throw new Error(`"${task.title}" needs at least one value.`);
      return mapping;
    }
    default:
      throw new Error(`SteelSpec cannot yet build a "${task.answer_type}" answer in this build.`);
  }
}

/** Whether this build can offer a control for a task at all. */
export function canRenderTask(task: ReviewTask): boolean {
  return ["none", "text", "texts", "mapping"].includes(task.answer_payload.kind);
}
