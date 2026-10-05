// The production document-ingestion client — the one place the browser registers source
// files against a project.
//
// Everything here goes through the route the review service already serves and nothing
// else: `POST /projects/{project_id}/documents`. The access token travels in the
// `Authorization` header and nowhere else — never a URL, never a query string.
//
// The service owns the whole of the ingestion: it stores each file, hashes it, decides
// whether these bytes are already a document of this project, refuses a name that is taken
// rather than overwriting a source document, creates the `project_documents` row, and
// answers per file. This module does none of that and must not: it does not hash, does not
// decide duplicates, never writes `project_documents`, and never invents a document id —
// it sends files and reports what the service said about each one.

const API_URL = import.meta.env.VITE_API_URL as string | undefined;

/** What the service did with one file. `deduplicated` means these exact bytes are already
 *  a document of this project — the existing document is returned and nothing new was
 *  stored. */
export type RegistrationStatus = "created" | "deduplicated" | "failed";

export interface DocumentOutcome {
  file_name: string;
  status: RegistrationStatus;
  /** Present for `created` and `deduplicated`; absent for `failed`, which registered
   *  nothing and therefore has no document to address. */
  document_id?: string;
  storage_path?: string;
  /** The service's own refusal code, for a failed file. */
  code?: string;
  /** The service's own safe statement about why a file failed. Displayed as it stands. */
  reason?: string;
}

export interface RegistrationResult {
  project_id: string;
  documents: DocumentOutcome[];
  created: number;
  deduplicated: number;
  failed: number;
}

/** A refusal the service stated, kept as the service stated it. */
export class DocumentsRefused extends Error {
  readonly status: number;
  readonly code: string;
  constructor(status: number, code: string, statement: string) {
    super(statement);
    this.name = "DocumentsRefused";
    this.status = status;
    this.code = code;
  }
}

function requireApiUrl(): string {
  if (!API_URL) {
    throw new DocumentsRefused(
      0,
      "DOCUMENTS_SERVICE_NOT_CONFIGURED",
      "The extraction service is not configured for this build, so no document could be registered.",
    );
  }
  return API_URL;
}

async function readRefusal(response: Response): Promise<DocumentsRefused> {
  const body = await response.text();
  let code = `HTTP_${response.status}`;
  let statement = `The document service refused this request (HTTP ${response.status}).`;
  try {
    const parsed = JSON.parse(body);
    const detail = parsed?.detail ?? parsed;
    if (typeof detail?.refusal === "string") code = detail.refusal;
    if (typeof detail?.reason === "string") statement = detail.reason;
    else if (typeof detail === "string") statement = detail;
  } catch {
    if (body.trim()) statement = body.trim().slice(0, 300);
  }
  return new DocumentsRefused(response.status, code, statement);
}

/** Register each selected file as a source document of this project.
 *
 *  One request for the whole batch: the service answers per file, so a file that fails does
 *  not stop the ones beside it — and the caller is told which is which rather than being
 *  handed a single verdict for a mixed batch.
 */
export async function registerDocuments(
  projectId: string,
  token: string,
  files: File[],
): Promise<RegistrationResult> {
  const form = new FormData();
  for (const file of files) form.append("files", file);

  const response = await fetch(`${requireApiUrl()}/projects/${projectId}/documents`, {
    method: "POST",
    // The browser sets the multipart boundary; only the credential is named here.
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!response.ok) throw await readRefusal(response);
  return (await response.json()) as RegistrationResult;
}

/** The documents a batch registered, in the order the service returned them, with the
 *  duplicates collapsed: the same bytes selected twice in one batch is ONE document, and
 *  an extraction is owed to a document, not to a file the user happened to pick twice.
 *
 *  A file that FAILED contributes nothing — it registered no document, so there is nothing
 *  to address and no extraction may be started for it.
 */
export function registeredDocumentIds(result: RegistrationResult): string[] {
  const ids: string[] = [];
  for (const document of result.documents) {
    if (document.status === "failed") continue;
    const id = document.document_id;
    if (typeof id === "string" && id && !ids.includes(id)) ids.push(id);
  }
  return ids;
}

/** Whether the batch is entirely registered. A single failed file makes this false, so a
 *  caller can never report a mixed batch as a success. */
export function batchFullyRegistered(result: RegistrationResult): boolean {
  return result.documents.length > 0 && result.documents.every((d) => d.status !== "failed");
}
