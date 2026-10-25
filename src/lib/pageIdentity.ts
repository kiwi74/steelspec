// The recorded drawing identity of ONE page, as the review service states it.
//
// The viewer used to print the drawing-level number and title it had read from the drawing
// row, which meant page 1's identity was also shown over page 37. This module resolves the
// identity from the page captures instead, and it resolves it STRICTLY: only an exact
// `page_number` match may supply a value. There is no page-1 fallback, no "first capture"
// fallback, and no inference from an extracted member mark.
//
// Parse status is deliberately separate from identity. A capture may report a parse failure
// and still carry an identity, or carry none; either way the failure is reported as its own
// fact rather than being turned into "no identity" or into a guessed one.

/** One page's identity as the service records it. */
export interface PageCapture {
  /** Null when the stored row carried no usable page number; such a page is never
   *  matched to a selected page. */
  page_number: number | null;
  drawing_number: string | null;
  revision: string | null;
  /** Null when the row did not state a usable boolean parse outcome. */
  parse_failed: boolean | null;
}

/** The page captures for one document, when the service returns them.
 *
 *  `drawing_id` is null when the service did not select a single lineage (ambiguous), or
 *  when the document has no recorded reading. Those are distinct states, carried by
 *  `ambiguous` and by the page list — not by an invented drawing id. */
export interface PageCaptures {
  document_id: string;
  drawing_id: string | null;
  ambiguous: boolean;
  pages: PageCapture[];
}

/** The lineage the viewer believes it is showing. Supplying these turns an unverifiable
 *  capture into an explicit mismatch rather than showing an identity from another lineage. */
export interface ExpectedPageLineage {
  documentId?: string | null;
  drawingId?: string | null;
}

/** The document scope a page-identity read may use.
 *
 *  Page captures are recorded against ONE document. When the caller does not already know
 *  which document the viewer is about, the service's own list of documents with readings is
 *  the only legitimate source of a scope — and it is usable only when it names exactly one.
 *  More than one is a choice, and this helper never makes it. */
export type PageCaptureScope =
  | { kind: "scoped"; documentId: string }
  | { kind: "none" }
  | { kind: "ambiguous"; documentCount: number };

/** Resolve the scope from the documents the caller is allowed to review. The input is
 *  already filtered to documents with readings (see `selectableDocuments`). */
export function resolvePageCaptureScope(
  documents: readonly { document_id: string }[],
): PageCaptureScope {
  if (documents.length === 1) {
    const documentId = documents[0]?.document_id?.trim();
    // An empty id is not a scope. Passing it on would fall back to an unscoped read.
    return documentId
      ? { kind: "scoped", documentId }
      : { kind: "none" };
  }
  if (documents.length === 0) return { kind: "none" };
  return { kind: "ambiguous", documentCount: documents.length };
}

export type PageIdentityStatus =
  | "recorded"
  | "blank"
  | "parse_failed"
  | "missing_page"
  | "missing_captures"
  | "ambiguous"
  | "lineage_mismatch";

export interface PageIdentity {
  status: PageIdentityStatus;
  pageNumber: number | null;
  /** The captured identity for THIS page only. Null whenever it must not be shown. */
  drawingNumber: string | null;
  revision: string | null;
  /** What the heading should say. It never borrows another page's value. */
  heading: string;
  /** The identity state in words, separate from the parse state. */
  identityLabel: string;
  identityDetail: string;
  /** Whether the service stated a parse outcome for this exact page. */
  parseKnown: boolean;
  parseFailed: boolean;
  parseLabel: string;
}

function text(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function parseState(known: boolean, failed: boolean): Pick<PageIdentity, "parseKnown" | "parseFailed" | "parseLabel"> {
  return {
    parseKnown: known,
    parseFailed: failed,
    parseLabel: known
      ? failed
        ? "Parse failed"
        : "No parse failure recorded"
      : "Parse status unavailable",
  };
}

function pageNumberOrNull(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isInteger(value) ? value : null;
}

/** The parse state of an exact page capture, or "unavailable" when the service did not
 *  state a boolean. A null is not the same finding as "no parse failure recorded". */
function captureParseState(
  capture: PageCapture | undefined,
): Pick<PageIdentity, "parseKnown" | "parseFailed" | "parseLabel"> {
  const known = Boolean(capture) && typeof capture?.parse_failed === "boolean";
  return parseState(known, capture?.parse_failed === true);
}

/** Resolve the heading and the identity/parse states the viewer should show for one page.
 *
 *  The order matters. A mismatched lineage is never allowed to borrow even a parse status,
 *  and an ambiguous lineage is never allowed to present one page's identity as the
 *  document's. Only after those guards is the exact page looked up. */
export function derivePageIdentity(
  captures: PageCaptures | null | undefined,
  pageNumber: number | null | undefined,
  expected: ExpectedPageLineage = {},
): PageIdentity {
  const page = pageNumberOrNull(pageNumber);

  if (page === null) {
    return {
      status: "missing_page",
      pageNumber: null,
      drawingNumber: null,
      revision: null,
      heading: "Page identity unavailable",
      identityLabel: "No page selected",
      identityDetail: "No page is selected, so there is no page identity to show.",
      ...parseState(false, false),
    };
  }

  if (!captures) {
    return {
      status: "missing_captures",
      pageNumber: page,
      drawingNumber: null,
      revision: null,
      heading: "Page identity unavailable",
      identityLabel: "Unavailable",
      identityDetail:
        "The review service did not return recorded per-page drawing identity for this view.",
      ...parseState(false, false),
    };
  }

  const expectedDocument = text(expected.documentId);
  const expectedDrawing = text(expected.drawingId);
  const capturedDocument = text(captures.document_id);
  const capturedDrawing = text(captures.drawing_id);

  if (expectedDocument && capturedDocument !== expectedDocument) {
    return {
      status: "lineage_mismatch",
      pageNumber: page,
      drawingNumber: null,
      revision: null,
      heading: "Drawing identity unavailable",
      identityLabel: capturedDocument ? "Lineage mismatch" : "Lineage unverified",
      identityDetail: capturedDocument
        ? "These page captures belong to a different document than the one on screen, so their identities are not shown here."
        : "These page captures do not state a document, so they cannot be matched to the document on screen.",
      ...parseState(false, false),
    };
  }

  const pages = Array.isArray(captures.pages) ? captures.pages : [];
  // Exact match only. In particular this is not `pages[0]`, and it is not a fallback.
  const capture = pages.find((candidate) => candidate?.page_number === page);

  // The service's own ambiguity statement comes BEFORE any drawing-id comparison. An
  // ambiguous block states no single drawing id at all, so comparing it to the drawing on
  // screen would report a "mismatch" and hide the real reason no identity can be shown.
  if (captures.ambiguous) {
    return {
      status: "ambiguous",
      pageNumber: page,
      drawingNumber: null,
      revision: null,
      heading: "Drawing lineage ambiguous",
      identityLabel: "Lineage ambiguous",
      identityDetail:
        "The service marked this drawing's lineage as ambiguous, so no page's identity is shown as this page's.",
      // A parse result for the exact page is still a fact about this page; identity is not.
      ...captureParseState(capture),
    };
  }

  if (expectedDrawing && capturedDrawing !== expectedDrawing) {
    // No drawing lineage AND no capture for this page is a missing capture, not a
    // mismatch. A document with no recorded reading comes back exactly this way.
    if (!capturedDrawing && !capture) {
      return {
        status: "missing_page",
        pageNumber: page,
        drawingNumber: null,
        revision: null,
        heading: "Drawing identity not recorded",
        identityLabel: "Not recorded for this page",
        identityDetail: `The service returned no capture for page ${page}. No other page's identity is substituted.`,
        ...parseState(false, false),
      };
    }
    return {
      status: "lineage_mismatch",
      pageNumber: page,
      drawingNumber: null,
      revision: null,
      heading: "Drawing identity unavailable",
      identityLabel: capturedDrawing ? "Lineage mismatch" : "Lineage unverified",
      identityDetail: capturedDrawing
        ? "These page captures belong to a different drawing than the one on screen, so their identities are not shown here."
        : "These page captures do not state a drawing, so they cannot be matched to the drawing on screen.",
      ...parseState(false, false),
    };
  }

  if (!capture) {
    return {
      status: "missing_page",
      pageNumber: page,
      drawingNumber: null,
      revision: null,
      heading: "Drawing identity not recorded",
      identityLabel: "Not recorded for this page",
      identityDetail: `The service returned no capture for page ${page}. No other page's identity is substituted.`,
      ...parseState(false, false),
    };
  }

  const drawingNumber = text(capture.drawing_number);
  const revision = text(capture.revision);
  const parse = captureParseState(capture);

  if (!drawingNumber && !revision) {
    if (capture.parse_failed) {
      return {
        status: "parse_failed",
        pageNumber: page,
        drawingNumber: null,
        revision: null,
        heading: "Page identity could not be parsed",
        identityLabel: "Not recorded — parse failed",
        identityDetail:
          "The capture for this page reports a parse failure and records neither a drawing number nor a revision.",
        ...parse,
      };
    }
    return {
      status: "blank",
      pageNumber: page,
      drawingNumber: null,
      revision: null,
      heading: "Drawing identity not recorded",
      identityLabel: "Not recorded for this page",
      identityDetail: "The capture for this page records neither a drawing number nor a revision.",
      ...parse,
    };
  }

  const headingParts: string[] = [];
  if (drawingNumber) headingParts.push(drawingNumber);
  if (revision) headingParts.push(`Rev ${revision}`);

  const details: string[] = [];
  if (!drawingNumber) details.push("The capture records a revision but no drawing number.");
  if (!revision) details.push("The capture records a drawing number but no revision.");
  if (capture.parse_failed) {
    details.push("The capture also reports a parse failure; the parse state is not the identity.");
  }

  return {
    status: "recorded",
    pageNumber: page,
    drawingNumber,
    revision,
    heading: headingParts.join(" — "),
    identityLabel: "Recorded for this page",
    identityDetail: details.join(" "),
    ...parse,
  };
}
