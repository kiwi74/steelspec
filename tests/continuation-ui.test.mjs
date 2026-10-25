// THE EXTRACTION CONTINUATION UI — the client rule, the one-request gate, and the wiring.
//
// WHAT IS BEHAVIOURAL
//   `src/lib/extraction.ts` is imported directly (Node strips the TypeScript types) and
//   executed. Coverage parsing, completeness, the duplicate-click gate and the request the
//   client actually builds are asserted over the real functions, with `fetch` stubbed.
//
// WHAT IS STRUCTURAL
//   The React components are `.tsx` with no DOM harness in this repository, so the page
//   wiring is asserted over comment-stripped source and LABELLED as such. A source-level
//   assertion does NOT verify a rendered interaction; it verifies the code that would run.
//
//     node --test tests/

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  ContinuationRefused,
  continueExtraction,
  coverageFingerprint,
  createContinuationGate,
  readCoverage,
} from "../src/lib/extraction.ts";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative) => fs.readFileSync(path.join(REPO, relative), "utf8");
function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

const PROJECT = "3418efcc-17ba-4af0-949a-b6589d891118";
const DOCUMENT = "75b0e509-4461-4f06-9fa0-53cb9b943e87";
const TOKEN = "test-access-token-not-a-real-credential";
const API = "https://extraction-service.test";

const INCOMPLETE = [
  ["Pages in document", "69"],
  ["Analysed", "1, 2, 3, 4, 5"],
  ["Parse failed", "(none)"],
  ["Not analysed", "6, 7, 8, 9"],
  ["Readings read", "5"],
];
const COMPLETE = [
  ["Pages in document", "69"],
  ["Analysed", "1, 2, 3"],
  ["Parse failed", "(none)"],
  ["Not analysed", "(none)"],
  ["Readings read", "69"],
];

// =====================================================================================
// 1. COVERAGE — displayed as the service states it, never recomputed.
// =====================================================================================
test("incomplete coverage names the unread remainder and is not complete", () => {
  const coverage = readCoverage(INCOMPLETE);
  assert.equal(coverage.present, true);
  assert.equal(coverage.pages, "69");
  assert.equal(coverage.analysed, "1, 2, 3, 4, 5");
  assert.equal(coverage.notAnalysed, "6, 7, 8, 9");
  assert.equal(coverage.complete, false);
  assert.equal(coverage.unread, true);
});

test("the service saying (none) unread is the ONLY complete state", () => {
  const coverage = readCoverage(COMPLETE);
  assert.equal(coverage.complete, true);
  assert.equal(coverage.unread, false);
});

test("coverage with no rows is stated as absent, not as complete", () => {
  const coverage = readCoverage(null);
  assert.equal(coverage.present, false);
  assert.equal(coverage.complete, false);
  assert.equal(coverage.unread, false);
});

test("coverage without a Not analysed row does not claim a remainder", () => {
  const coverage = readCoverage([["Pages in document", "69"], ["Analysed", "1, 2"]]);
  assert.equal(coverage.complete, false);
  assert.equal(coverage.unread, false);
});

test("the fingerprint changes when the service's rows change", () => {
  assert.notEqual(coverageFingerprint(INCOMPLETE), coverageFingerprint(COMPLETE));
  assert.equal(coverageFingerprint(INCOMPLETE), coverageFingerprint([...INCOMPLETE]));
});

// =====================================================================================
// 2. DUPLICATE CLICKS — one in-flight continuation per card.
// =====================================================================================
test("the gate admits one request and refuses a second until the first ends", () => {
  const gate = createContinuationGate();
  assert.equal(gate.busy, false);
  assert.equal(gate.tryBegin(), true);
  assert.equal(gate.busy, true);
  assert.equal(gate.tryBegin(), false);
  gate.end();
  assert.equal(gate.busy, false);
  assert.equal(gate.tryBegin(), true);
});

// =====================================================================================
// 3. THE REQUEST — the real client over a stubbed fetch.
// =====================================================================================
function stubFetch(response) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url: String(url), init });
    return response;
  };
  return { calls, fetchImpl };
}

test("the continuation request names the project and the recorded document only", async () => {
  const { calls, fetchImpl } = stubFetch(
    new Response(
      JSON.stringify({
        status: "continuation_started",
        project_id: PROJECT,
        first_page: 31,
        last_page: 60,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    ),
  );
  const window = await continueExtraction(PROJECT, TOKEN, DOCUMENT, {
    baseUrl: API,
    fetchImpl,
  });
  assert.deepEqual(window, {
    status: "continuation_started",
    project_id: PROJECT,
    first_page: 31,
    last_page: 60,
  });
  assert.equal(calls.length, 1);
  const [{ url, init }] = calls;
  assert.equal(url, `${API}/continue-extraction/${PROJECT}`);
  assert.equal(init.method, "POST");
  assert.equal(init.headers.Authorization, `Bearer ${TOKEN}`);
  assert.equal(init.headers["Content-Type"], "application/json");
  assert.deepEqual(JSON.parse(init.body), { document_id: DOCUMENT });
  // No page range is chosen by the client; the service's window is the only one.
  assert.equal("first_page" in JSON.parse(init.body), false);
  assert.equal("last_page" in JSON.parse(init.body), false);
});

test("a stated refusal is kept with its code and reason", async () => {
  const { fetchImpl } = stubFetch(
    new Response(
      JSON.stringify({
        detail: {
          refusal: "CONTINUATION_DRAWING_SET_UNRESOLVED",
          reason: "which document these pages belong to is ambiguous",
        },
      }),
      { status: 409, headers: { "Content-Type": "application/json" } },
    ),
  );
  await assert.rejects(
    () => continueExtraction(PROJECT, TOKEN, DOCUMENT, { baseUrl: API, fetchImpl }),
    (error) => {
      assert.ok(error instanceof ContinuationRefused);
      assert.equal(error.status, 409);
      assert.equal(error.code, "CONTINUATION_DRAWING_SET_UNRESOLVED");
      assert.match(error.message, /ambiguous/);
      return true;
    },
  );
});

test("a 2xx without a window is a refusal, not a success with invented pages", async () => {
  const { fetchImpl } = stubFetch(
    new Response(JSON.stringify({ status: "continuation_started" }), { status: 200 }),
  );
  await assert.rejects(
    () => continueExtraction(PROJECT, TOKEN, DOCUMENT, { baseUrl: API, fetchImpl }),
    (error) => error instanceof ContinuationRefused
      && error.code === "EXTRACTION_UNREADABLE_RESPONSE",
  );
});

test("a missing session or document never reaches the service", async () => {
  const { calls, fetchImpl } = stubFetch(new Response("", { status: 200 }));
  await assert.rejects(
    () => continueExtraction(PROJECT, "", DOCUMENT, { baseUrl: API, fetchImpl }),
    (error) => error instanceof ContinuationRefused && error.code === "EXTRACTION_NO_SESSION",
  );
  await assert.rejects(
    () => continueExtraction(PROJECT, TOKEN, "", { baseUrl: API, fetchImpl }),
    (error) => error instanceof ContinuationRefused && error.code === "EXTRACTION_NO_DOCUMENT",
  );
  assert.equal(calls.length, 0);
});

// =====================================================================================
// 4. THE UI WIRING — STRUCTURAL, and labelled as such.
// =====================================================================================
test("the overview renders the continuation panel and the review page renders the card", () => {
  const overview = stripComments(read("src/pages/project/ProjectOverview.tsx"));
  const review = stripComments(read("src/pages/project/ProjectReview.tsx"));
  assert.match(overview, /<ContinueExtractionPanel\s+projectId=\{project\.id\}/);
  assert.match(review, /<ContinueExtractionCard[\s\S]*documentId=\{selectedDocumentId\}/);
});

test("the card sends the document scope, disables repeats and has no auto-continuation", () => {
  const card = stripComments(read("src/components/ContinueExtractionCard.tsx"));
  assert.match(card, /createContinuationGate/);
  assert.match(card, /disabled=\{busy\}/);
  assert.match(card, /documentId=\{documentId\}|continueExtraction\(projectId, token, documentId\)/);
  // The continuation is sent from the explicit click handler only: one call in the file.
  assert.equal((card.match(/continueExtraction\(/g) ?? []).length, 1);
  assert.match(card, /const onContinue = async \(\) => \{/);
  // Completeness and the remainder both come from the service's rows.
  assert.match(card, /summary\.complete/);
  assert.match(card, /summary\.unread/);
  // No privileged credential belongs in the browser.
  assert.doesNotMatch(card, /service_role|SERVICE_ROLE|SUPABASE_SERVICE/);
});

test("the overview panel never chooses between documents and never holds a credential", () => {
  const panel = stripComments(read("src/components/ContinueExtractionPanel.tsx"));
  assert.match(panel, /selectableDocuments/);
  assert.match(panel, /readable\.length > 1/);
  assert.match(panel, /Choose a document in Review/);
  assert.match(panel, /useAuth/);
  assert.doesNotMatch(panel, /service_role|SERVICE_ROLE|SUPABASE_SERVICE/);
});

test("the client module sends only the document id and holds no service key", () => {
  const client = stripComments(read("src/lib/extraction.ts"));
  assert.match(client, /JSON\.stringify\(\{ document_id: documentId \}\)/);
  assert.doesNotMatch(client, /service_role|SERVICE_ROLE|SUPABASE_SERVICE/);
  assert.doesNotMatch(client, /first_page\s*:\s*\d|last_page\s*:\s*\d/);
});
