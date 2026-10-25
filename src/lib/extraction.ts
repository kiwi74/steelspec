// THE EXTRACTION CONTINUATION CLIENT — the one place the browser asks the service to read
// the NEXT window of an already-recorded PDF.
//
// One route: `POST /continue-extraction/{project_id}`, with the `document_id` the review is
// already scoped to. The SERVICE decides the next contiguous page window; nothing here
// computes one, hardcodes a page count, or invents a page range. The response states the
// window it accepted; the review's own coverage rows state what has actually been read.
//
// The access token travels in the Authorization header and nowhere else. There is no
// service-role key, no storage credential and no direct database write in this module: the
// server owns every guard, including whether a window is the valid next one.

export interface CoverageSummary {
  /** Whether the service stated any coverage row at all. */
  present: boolean;
  /** "Pages in document", as the service stated it. */
  pages: string | null;
  analysed: string | null;
  parseFailed: string | null;
  notAnalysed: string | null;
  /** Complete only when the service's own "Not analysed" row says "(none)". */
  complete: boolean;
  /** There is a stated remainder. The SERVICE decides whether it can be read next. */
  unread: boolean;
}

export type CoverageRows = readonly (readonly string[])[] | null | undefined;

const NONE = "(none)";

function rowValue(rows: CoverageRows, label: string): string | null {
  for (const row of rows ?? []) {
    if (Array.isArray(row) && row[0] === label && typeof row[1] === "string") {
      return row[1];
    }
  }
  return null;
}

/** Read the review's coverage rows exactly as the service states them.
 *
 *  The labels are the service's own (`Pages in document`, `Analysed`, `Parse failed`,
 *  `Not analysed`). This function displays them; it does not count pages, derive ranges or
 *  reconcile them with the project row. "Complete" is the service saying `(none)` remains
 *  unread — nothing else is treated as completion.
 */
export function readCoverage(rows: CoverageRows): CoverageSummary {
  const pages = rowValue(rows, "Pages in document");
  const analysed = rowValue(rows, "Analysed");
  const parseFailed = rowValue(rows, "Parse failed");
  const notAnalysed = rowValue(rows, "Not analysed");
  return {
    present: pages !== null || analysed !== null || notAnalysed !== null,
    pages,
    analysed,
    parseFailed,
    notAnalysed,
    complete: pages !== null && notAnalysed === NONE,
    unread: notAnalysed !== null && notAnalysed !== NONE,
  };
}

/** A stable description of the coverage rows, used only to notice that a refresh changed
 *  them. It is not a claim about the pages. */
export function coverageFingerprint(rows: CoverageRows): string {
  return (rows ?? []).map((row) => row.join("\u0000")).join("\u0001");
}

/** One in-flight continuation gate.
 *
 *  React state updates asynchronously, so a `busy` boolean alone can let a second click
 *  through before the first render. The gate flips synchronously, holds until `end()`, and
 *  is the reason two requests cannot be sent from one card.
 */
export interface ContinuationGate {
  tryBegin(): boolean;
  end(): void;
  readonly busy: boolean;
}

export function createContinuationGate(): ContinuationGate {
  let busy = false;
  return {
    tryBegin() {
      if (busy) return false;
      busy = true;
      return true;
    },
    end() {
      busy = false;
    },
    get busy() {
      return busy;
    },
  };
}

export class ContinuationRefused extends Error {
  readonly status: number;
  readonly code: string;
  constructor(status: number, code: string, statement: string) {
    super(statement);
    this.name = "ContinuationRefused";
    this.status = status;
    this.code = code;
  }
}

export interface ContinuationWindow {
  status: string;
  project_id: string;
  first_page: number;
  last_page: number;
}

export interface ContinueOptions {
  /** Test seam only. Production passes nothing and uses the configured service URL. */
  baseUrl?: string;
  /** Test seam only. Production uses the platform fetch. */
  fetchImpl?: typeof fetch;
}

function serviceUrl(options?: ContinueOptions): string {
  const configured = options?.baseUrl ?? import.meta.env.VITE_API_URL;
  if (!configured) {
    throw new ContinuationRefused(
      0,
      "EXTRACTION_SERVICE_NOT_CONFIGURED",
      "The extraction service is not configured for this build, so no continuation could be requested.",
    );
  }
  return configured.replace(/\/+$/, "");
}

async function readRefusal(response: Response): Promise<ContinuationRefused> {
  const body = await response.text();
  let code = `HTTP_${response.status}`;
  let statement = `The extraction service refused this continuation (HTTP ${response.status}).`;
  try {
    const parsed = JSON.parse(body);
    const detail = parsed?.detail ?? parsed;
    if (typeof detail?.refusal === "string") code = detail.refusal;
    if (typeof detail?.reason === "string") statement = detail.reason;
    else if (typeof detail === "string") statement = detail;
  } catch {
    if (body.trim()) statement = body.trim().slice(0, 300);
  }
  return new ContinuationRefused(response.status, code, statement);
}

/** Ask the service to read the next window for ONE already-recorded document.
 *
 *  The body carries exactly the existing `document_id`; the project comes from the URL and
 *  the reviewer from the token. The caller does not state a first page, a last page, a
 *  count or a source: the service resolves the next contiguous window from its own record
 *  and refuses anything else.
 */
export async function continueExtraction(
  projectId: string,
  token: string,
  documentId: string,
  options?: ContinueOptions,
): Promise<ContinuationWindow> {
  if (!token) {
    throw new ContinuationRefused(
      0,
      "EXTRACTION_NO_SESSION",
      "Your session has expired. Sign in again to continue extraction.",
    );
  }
  if (!documentId) {
    throw new ContinuationRefused(
      0,
      "EXTRACTION_NO_DOCUMENT",
      "No source document is selected, so there is no extraction window to continue.",
    );
  }
  const call = options?.fetchImpl ?? fetch;
  const response = await call(
    `${serviceUrl(options)}/continue-extraction/${encodeURIComponent(projectId)}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ document_id: documentId }),
    },
  );
  if (!response.ok) throw await readRefusal(response);
  const body = (await response.json()) as Partial<ContinuationWindow>;
  if (
    !Number.isInteger(body?.first_page)
    || !Number.isInteger(body?.last_page)
    || (body.first_page as number) < 1
    || (body.last_page as number) < (body.first_page as number)
  ) {
    // A 2xx without a valid window is not a success: nothing is claimed about what the
    // service will read, and the caller must not invent pages to display.
    throw new ContinuationRefused(
      response.status,
      "EXTRACTION_UNREADABLE_RESPONSE",
      "The extraction service answered without a valid page window, so nothing is claimed about what it will read.",
    );
  }
  return body as ContinuationWindow;
}
