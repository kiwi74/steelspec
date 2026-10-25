// PER-PAGE DRAWING IDENTITY — the page capture, and never page 1's.
//
// WHAT THIS FILE IS
//
// The regression proof for the viewer bug: the header showed the drawing row's metadata,
// which is page 1's identity, over every selected page. The fix resolves an identity from
// the review service's per-page captures by exact page number. This file proves that rule.
//
//     BEHAVIOURAL   `src/lib/pageIdentity.ts` is imported directly and executed. Every
//                   identity, parse and lineage assertion is made over the real helper.
//
//     STRUCTURAL    `DrawingViewer.tsx` is a React component and this repository has no DOM
//                   harness. Its wiring is asserted over comment-stripped source and is
//                   LABELLED as source-level, not as a rendered interaction.
//
//     SYNTHETIC FIXTURES ONLY
//                   The CL002/PL036 values below are constructed from the development
//                   contract. Nothing here proves that the live review API returns
//                   `page_captures`, or that the real Sarsfield FITS capture records
//                   page 37 as PL036 Rev 2. No network is reached and no project, database
//                   or storage bucket is touched.
//
//     node --test tests/page-identity-viewer.test.mjs

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  derivePageIdentity,
  resolvePageCaptureScope,
} from "../src/lib/pageIdentity.ts";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative) => fs.readFileSync(path.join(REPO, relative), "utf8");

function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

// =====================================================================================
// SYNTHETIC FIXTURES — contract-shaped, not a live capture.
// =====================================================================================
const DOCUMENT = "synthetic-document-id";
const DRAWING = "synthetic-drawing-id";

const FIXTURE = {
  document_id: DOCUMENT,
  drawing_id: DRAWING,
  ambiguous: false,
  pages: [
    { page_number: 1, drawing_number: "CL002", revision: "1", parse_failed: false },
    { page_number: 37, drawing_number: "PL036", revision: "2", parse_failed: false },
  ],
};

const page = (capture, pageNumber, expected) =>
  derivePageIdentity(capture, pageNumber, expected);

// =====================================================================================
// 1. Each page's own captured identity.
// =====================================================================================
test("page 1 uses its own captured identity", () => {
  const identity = page(FIXTURE, 1);
  assert.equal(identity.status, "recorded");
  assert.equal(identity.pageNumber, 1);
  assert.equal(identity.drawingNumber, "CL002");
  assert.equal(identity.revision, "1");
  assert.equal(identity.heading, "CL002 — Rev 1");
  assert.equal(identity.identityLabel, "Recorded for this page");
  assert.equal(identity.parseFailed, false);
});

test("page 37 shows PL036 Rev 2 while page 1 shows CL002", () => {
  const first = page(FIXTURE, 1);
  const thirtySeven = page(FIXTURE, 37);

  assert.equal(first.heading, "CL002 — Rev 1");
  assert.equal(thirtySeven.status, "recorded");
  assert.equal(thirtySeven.drawingNumber, "PL036");
  assert.equal(thirtySeven.revision, "2");
  assert.equal(thirtySeven.heading, "PL036 — Rev 2");
  assert.notEqual(thirtySeven.heading, first.heading);
});

test("moving pages never retains the previous page's identity", () => {
  const atPage1 = page(FIXTURE, 1);
  const atPage37 = page(FIXTURE, 37);
  const backAtPage1 = page(FIXTURE, 1);

  assert.equal(atPage1.drawingNumber, "CL002");
  assert.equal(atPage37.drawingNumber, "PL036");
  assert.equal(backAtPage1.drawingNumber, "CL002");
  assert.equal(backAtPage1.heading, "CL002 — Rev 1");
});

// =====================================================================================
// 2. Missing identity is never page 1.
// =====================================================================================
test("a page absent from the captures never falls back to page 1", () => {
  const onlyPage1 = { ...FIXTURE, pages: [FIXTURE.pages[0]] };
  const identity = page(onlyPage1, 37);

  assert.equal(identity.status, "missing_page");
  assert.equal(identity.drawingNumber, null);
  assert.equal(identity.revision, null);
  assert.doesNotMatch(identity.heading, /CL002/);
  assert.doesNotMatch(identity.identityDetail, /CL002/);
  assert.match(identity.identityDetail, /No other page's identity is substituted/);
});

test("an empty capture list is not treated as a page 1 identity", () => {
  const identity = page({ ...FIXTURE, pages: [] }, 37);
  assert.equal(identity.status, "missing_page");
  assert.equal(identity.drawingNumber, null);
});

test("no captures at all is stated as unavailable, not as a blank drawing", () => {
  const identity = page(null, 37);
  assert.equal(identity.status, "missing_captures");
  assert.equal(identity.drawingNumber, null);
  assert.equal(identity.parseKnown, false);
  assert.equal(identity.parseLabel, "Parse status unavailable");
});

test("a blank recorded identity stays blank on its own page", () => {
  const captures = {
    ...FIXTURE,
    pages: [
      FIXTURE.pages[0],
      { page_number: 37, drawing_number: "   ", revision: null, parse_failed: false },
    ],
  };
  const identity = page(captures, 37);

  assert.equal(identity.status, "blank");
  assert.equal(identity.drawingNumber, null);
  assert.equal(identity.revision, null);
  assert.equal(identity.heading, "Drawing identity not recorded");
  assert.equal(identity.parseKnown, true);
});

// =====================================================================================
// 3. Lineage is checked, and an unverifiable lineage is not shown as an identity.
// =====================================================================================
test("an ambiguous lineage suppresses every page's identity", () => {
  const identity = page({ ...FIXTURE, ambiguous: true }, 37);
  assert.equal(identity.status, "ambiguous");
  assert.equal(identity.drawingNumber, null);
  assert.equal(identity.revision, null);
  assert.equal(identity.heading, "Drawing lineage ambiguous");
  assert.match(identity.identityDetail, /ambiguous/i);
  // The exact page's parse status is still a separate, usable fact.
  assert.equal(identity.parseKnown, true);
  assert.equal(identity.parseFailed, false);
});

test("an ambiguous API block is ambiguous even when it states no drawing id", () => {
  // This is the API's own ambiguity shape: drawing_id null, pages empty. A viewer that
  // checked the drawing id before the service's ambiguity flag would misreport this as a
  // lineage mismatch.
  const identity = page(
    { ...FIXTURE, drawing_id: null, ambiguous: true, pages: [] },
    37,
    { documentId: DOCUMENT, drawingId: DRAWING },
  );
  assert.equal(identity.status, "ambiguous");
  assert.equal(identity.drawingNumber, null);
  assert.equal(identity.heading, "Drawing lineage ambiguous");
  assert.doesNotMatch(identity.identityLabel, /mismatch|unverified/i);
});

test("an empty capture block for a document with no reading is a missing page", () => {
  // `page_identities_for_document` returns this exact shape for a document with no
  // recorded reading: the requested document id, no drawing id, and no pages.
  const identity = page(
    { document_id: DOCUMENT, drawing_id: null, ambiguous: false, pages: [] },
    37,
    { documentId: DOCUMENT, drawingId: DRAWING },
  );
  assert.equal(identity.status, "missing_page");
  assert.equal(identity.drawingNumber, null);
  assert.equal(identity.identityLabel, "Not recorded for this page");
  assert.match(identity.identityDetail, /no capture for page 37/);
  assert.doesNotMatch(identity.identityLabel, /mismatch|unverified/i);
});

test("captures from a different document are a lineage mismatch", () => {
  const identity = page(FIXTURE, 37, { documentId: "another-document-id" });
  assert.equal(identity.status, "lineage_mismatch");
  assert.equal(identity.drawingNumber, null);
  assert.equal(identity.heading, "Drawing identity unavailable");
  assert.equal(identity.parseKnown, false);
  assert.match(identity.identityDetail, /different document/);
});

test("captures from a different drawing are a lineage mismatch", () => {
  const identity = page(FIXTURE, 37, { drawingId: "another-drawing-id" });
  assert.equal(identity.status, "lineage_mismatch");
  assert.equal(identity.drawingNumber, null);
  assert.match(identity.identityDetail, /different drawing/);
});

test("a capture with no drawing id cannot be matched to the drawing on screen", () => {
  const identity = page({ ...FIXTURE, drawing_id: "" }, 37, { drawingId: DRAWING });
  assert.equal(identity.status, "lineage_mismatch");
  assert.equal(identity.drawingNumber, null);
  assert.match(identity.identityDetail, /do not state a drawing/);
});

test("the expected document and drawing are both checked when both are known", () => {
  const identity = page(FIXTURE, 37, {
    documentId: DOCUMENT,
    drawingId: DRAWING,
  });
  assert.equal(identity.status, "recorded");
  assert.equal(identity.drawingNumber, "PL036");
});

// =====================================================================================
// 4. Parse status is its own fact.
// =====================================================================================
test("a parse failure with no identity is reported as a parse failure", () => {
  const captures = {
    ...FIXTURE,
    pages: [
      FIXTURE.pages[0],
      { page_number: 37, drawing_number: null, revision: null, parse_failed: true },
    ],
  };
  const identity = page(captures, 37);

  assert.equal(identity.status, "parse_failed");
  assert.equal(identity.drawingNumber, null);
  assert.equal(identity.parseKnown, true);
  assert.equal(identity.parseFailed, true);
  assert.equal(identity.parseLabel, "Parse failed");
  assert.equal(identity.identityLabel, "Not recorded — parse failed");
});

test("a recorded identity and a parse failure are kept as separate facts", () => {
  const captures = {
    ...FIXTURE,
    pages: [
      FIXTURE.pages[0],
      { page_number: 37, drawing_number: "PL036", revision: "2", parse_failed: true },
    ],
  };
  const identity = page(captures, 37);

  assert.equal(identity.status, "recorded");
  assert.equal(identity.drawingNumber, "PL036");
  assert.equal(identity.revision, "2");
  assert.equal(identity.identityLabel, "Recorded for this page");
  assert.equal(identity.parseFailed, true);
  assert.equal(identity.parseLabel, "Parse failed");
  assert.match(identity.identityDetail, /parse state is not the identity/);
});

test("no recorded parse failure is not a claim that the page was verified", () => {
  const identity = page(FIXTURE, 37);
  assert.equal(identity.parseKnown, true);
  assert.equal(identity.parseFailed, false);
  assert.equal(identity.parseLabel, "No parse failure recorded");
  assert.doesNotMatch(identity.parseLabel, /verified|validated/i);
});

test("a null parse outcome is unavailable, not 'no parse failure recorded'", () => {
  const captures = {
    ...FIXTURE,
    pages: [
      FIXTURE.pages[0],
      { page_number: 37, drawing_number: "PL036", revision: "2", parse_failed: null },
    ],
  };
  const identity = page(captures, 37);
  assert.equal(identity.status, "recorded");
  assert.equal(identity.parseKnown, false);
  assert.equal(identity.parseFailed, false);
  assert.equal(identity.parseLabel, "Parse status unavailable");
});

// =====================================================================================
// 5. DOCUMENT SCOPE — one document, or fail closed.
// =====================================================================================
test("one document with readings is the only scope supplied automatically", () => {
  assert.deepEqual(
    resolvePageCaptureScope([{ document_id: DOCUMENT }]),
    { kind: "scoped", documentId: DOCUMENT },
  );
});

test("no document with readings has no scope and no identity", () => {
  assert.deepEqual(resolvePageCaptureScope([]), { kind: "none" });
});

test("a blank document id is not a scope and cannot fall back to an unscoped read", () => {
  assert.deepEqual(
    resolvePageCaptureScope([{ document_id: "   " }]),
    { kind: "none" },
  );
});

test("more than one document is ambiguous and is never chosen here", () => {
  assert.deepEqual(
    resolvePageCaptureScope([
      { document_id: DOCUMENT },
      { document_id: "synthetic-document-2" },
    ]),
    { kind: "ambiguous", documentCount: 2 },
  );
});

// =====================================================================================
// 6. STRUCTURAL — the viewer wiring. Source-level only.
// =====================================================================================
const VIEWER = stripComments(read("src/components/DrawingViewer.tsx"));
const REVIEW = read("src/lib/review.ts");

test("the viewer resolves a single document and then reads a document-scoped review", () => {
  assert.match(
    VIEWER,
    /import \{ ReviewRefused, readReview, selectableDocuments \} from "\.\.\/lib\/review";/,
  );
  assert.match(VIEWER, /const requestedDocumentId =\s*typeof documentId === "string" && documentId\.trim\(\) \? documentId\.trim\(\) : null;/);
  assert.match(VIEWER, /let scope = requestedDocumentId;/);
  assert.match(VIEWER, /const unscoped = await readReview\(projectId, token\);/);
  assert.match(VIEWER, /resolvePageCaptureScope\(selectableDocuments\(unscoped\)\)/);
  assert.match(VIEWER, /const review = await readReview\(projectId, token, scope\);/);
  assert.match(
    VIEWER,
    /setPageCaptures\(\{[\s\S]*?projectId,[\s\S]*?documentId: scope,[\s\S]*?captures: review\.page_captures \?\? null,[\s\S]*?\}\);/,
    "captures must be stored with the scoped document that produced them",
  );
  // The unscoped response may be used to CHOOSE a document, never as an identity source.
  assert.doesNotMatch(VIEWER, /captures: unscoped\.page_captures/);
  assert.doesNotMatch(VIEWER, /setPageCaptures\(unscoped\.page_captures/);
});

test("multiple or no documents fail closed rather than using an unscoped capture", () => {
  assert.match(VIEWER, /if \(resolved\.kind === "ambiguous"\) \{/);
  assert.match(VIEWER, /Page identity is shown only for one document at a time/);
  assert.match(VIEWER, /if \(resolved\.kind === "none"\) \{/);
  assert.match(VIEWER, /this page's identity cannot be established/);
});

test("the viewer derives identity from the selected page and the displayed drawing", () => {
  assert.match(
    VIEWER,
    /derivePageIdentity\(\s*currentCaptures\?\.captures \?\? null,\s*currentPage\?\.page_number,\s*\{/,
    "identity must be derived from the selected page, not from a stored identity",
  );
  assert.match(VIEWER, /documentId: expectedDocumentId/);
  assert.match(VIEWER, /drawingId: drawingInfo\?\.id \?\? null/);
  assert.match(VIEWER, /!identityBusy && !currentCaptures && identityError/);
});

test("captures are gated to the current project and document scope", () => {
  assert.match(VIEWER, /pageCaptures\.projectId === projectId/);
  assert.match(VIEWER, /\(!requestedDocumentId \|\| pageCaptures\.documentId === requestedDocumentId\)/);
  assert.match(VIEWER, /const identityBusy = identityLoading \|\| \(pageCaptures !== null && currentCaptures === null\);/);
});

test("the header renders the page-derived heading, never the drawing row's number", () => {
  assert.match(VIEWER, /\{identityHeading\}/);
  assert.match(VIEWER, /\{pageIdentity\.identityLabel\}/);
  assert.match(VIEWER, /\{pageIdentity\.parseLabel\}/);
  // The old header's source of the bug is gone: no drawing-level identity is fetched or
  // rendered, so no fallback to page 1's number survives.
  assert.doesNotMatch(VIEWER, /drawingInfo\?\.drawing_number/);
  assert.doesNotMatch(VIEWER, /drawingInfo\?\.drawing_title/);
  assert.doesNotMatch(VIEWER, /select\("id, file_name, drawing_number, drawing_title"\)/);
});

test("the viewer clears captures before a new read and never stores an identity", () => {
  assert.match(VIEWER, /setPageCaptures\(null\)/, "a new read must not leave old captures on screen");
  assert.doesNotMatch(VIEWER, /setPageIdentity|identityState|previousIdentity/);
});

test("the existing page extraction and image workflow is intact", () => {
  assert.match(VIEWER, /m\.source_page === currentPage\?\.page_number/);
  assert.match(VIEWER, /c\.source_page === currentPage\?\.page_number/);
  assert.match(VIEWER, /createSignedUrl\(page\.image_storage_path, 300\)/);
  assert.match(VIEWER, /onClick=\{\(\) => setCurrentPageIdx\(\(i\) => Math\.max\(0, i - 1\)\)\}/);
  assert.match(VIEWER, /onClick=\{\(\) => setCurrentPageIdx\(\(i\) => Math\.min\(pages\.length - 1, i \+ 1\)\)\}/);
});

test("the review response type exposes optional page captures", () => {
  assert.match(REVIEW, /import type \{ PageCaptures \} from "\.\/pageIdentity";/);
  assert.match(REVIEW, /page_captures\?: PageCaptures \| null;/, "the field must be optional");
});
