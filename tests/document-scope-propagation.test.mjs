// E2E-002J — THE DOCUMENT SCOPE, PROPAGATED TO EVERY REVIEW REQUEST.
//
// WHAT THIS FILE IS
//
// The regression proof for the E2E-002I audit's finding: a multi-document review page had
// the reader's chosen document in the URL and sent it to two of the four review requests,
// leaving `POST /open` and `GET /workflow` unscoped. Two requests against one page meant
// the page and the surface beside it could disagree about which document they described —
// and for a project whose readings belong to more than one document, the unscoped ones
// refuse rather than choose.
//
// HOW IT IS PROVEN, AND WHAT IS NOT CLAIMED
//
//     BEHAVIOURAL   `src/lib/review.ts` is transpiled with the project's OWN typescript
//                   compiler and executed against a stubbed `fetch`. Every assertion about
//                   `/open`, `/review` and `/resolve` is made over the request that was
//                   actually built — the URL, the method, the headers and the body.
//
//     STRUCTURAL    `ProjectReview.tsx` and `ConnectionReviewSurface.tsx` are React
//                   components and cannot be rendered without a DOM harness, which this
//                   repository does not have and this task does not add. Their assertions
//                   are made over comment-stripped source, so a commented-out call cannot
//                   satisfy one.
//
// It runs on Node's own test runner. Nothing is installed, no network is reached, no
// Supabase project is touched, and no production route is called.
//
//     node --test tests/

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import ts from "typescript";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative) => fs.readFileSync(path.join(REPO, relative), "utf8");

const PROJECT = "11111111-2222-4333-8444-555555555555";
const PACKAGE = "22222222-3333-4444-8555-666666666666";
const DOC_A = "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa";
const DOC_B = "bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb";
const API = "https://review-service.test";

// ======================================================================================
// BEHAVIOURAL — the real module, executed.
// ======================================================================================
const API_URL_BINDING = "import.meta.env";

let moduleCounter = 0;

/** `src/lib/review.ts`, transpiled and loaded with `fetch` stubbed.
 *
 *  The ONLY rewrite is the module's single environment lookup, which Vite supplies at build
 *  time and Node does not. It is asserted to have happened, so a change to how the module
 *  reads its configuration fails this file loudly instead of quietly proving nothing. */
async function loadReviewModule() {
  const source = read("src/lib/review.ts");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;

  const prepared = compiled.replaceAll(API_URL_BINDING, "globalThis.__SS_ENV__");
  assert.notEqual(
    prepared,
    compiled,
    "review.ts no longer reads import.meta.env; this harness must be updated rather than " +
      "silently asserting against a module whose configuration it cannot supply",
  );

  // The module reads its configuration at import time, so the binding must exist first.
  globalThis.__SS_ENV__ = { VITE_API_URL: API };

  const file = path.join(
    fs.mkdtempSync(path.join(os.tmpdir(), "ss-document-scope-")),
    `review-${moduleCounter++}.mjs`,
  );
  fs.writeFileSync(file, prepared);
  return import(pathToFileURL(file).href);
}

/** Calls one review function with `fetch` recorded, and answers whatever the caller needs. */
async function withRecordedFetch(body, run) {
  const calls = [];
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init: init ?? {} });
    return new Response(JSON.stringify(body ?? {}), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
  try {
    await run(calls);
  } finally {
    globalThis.fetch = previousFetch;
  }
}

const review = await loadReviewModule();

const headerOf = (call, name) => {
  const headers = call.init.headers ?? {};
  const key = Object.keys(headers).find((k) => k.toLowerCase() === name.toLowerCase());
  return key === undefined ? undefined : headers[key];
};

const isQueryScoped = (url) => new URL(url).searchParams.get("document_id");

// --------------------------------------------------------------------------------------
// A, B, C — the opening request.
// --------------------------------------------------------------------------------------
test("A: openReview accepts an optional document scope", async () => {
  await withRecordedFetch({ project_id: PROJECT, review_state: "recorded", review_revision: 0, recorded_now: true }, async () => {
    // Both arities are accepted: the scoped call is the new one, the unscoped call is every
    // caller that existed before it.
    await review.openReview(PROJECT, "token");
    await review.openReview(PROJECT, "token", DOC_A);
  });
});

test("B: a named document is sent in the /open JSON BODY, and nowhere else", async () => {
  await withRecordedFetch({ project_id: PROJECT, review_state: "recorded", review_revision: 0, recorded_now: true }, async (calls) => {
    await review.openReview(PROJECT, "token", DOC_A);

    assert.equal(calls.length, 1);
    const [call] = calls;
    assert.equal(call.init.method, "POST");
    assert.equal(call.url, `${API}/production/review/${PROJECT}/open`);
    assert.equal(call.init.body, JSON.stringify({ document_id: DOC_A }));
    assert.deepEqual(JSON.parse(call.init.body), { document_id: DOC_A });

    // The route takes its scope in the body. A query string here would be a different,
    // unsupported request.
    assert.equal(isQueryScoped(call.url), null);
    assert.equal(new URL(call.url).search, "");

    // Content-Type comes from the existing `call` helper, off the body it was given.
    assert.equal(headerOf(call, "content-type"), "application/json");
    assert.equal(headerOf(call, "authorization"), "Bearer token");
  });
});

test("C: with no document named, /open still sends no body at all", async () => {
  await withRecordedFetch({ project_id: PROJECT, review_state: "recorded", review_revision: 0, recorded_now: true }, async (calls) => {
    await review.openReview(PROJECT, "token");
    await review.openReview(PROJECT, "token", null);
    await review.openReview(PROJECT, "token", undefined);

    assert.equal(calls.length, 3);
    for (const call of calls) {
      assert.equal(call.init.method, "POST");
      assert.equal(call.url, `${API}/production/review/${PROJECT}/open`);
      assert.equal(call.init.body, undefined, "an unscoped open must carry no body");
      assert.equal(headerOf(call, "content-type"), undefined, "no body means no Content-Type");
    }
  });
});

// --------------------------------------------------------------------------------------
// I, J — the two scopes that already worked, pinned so the fix cannot disturb them.
// --------------------------------------------------------------------------------------
test("I: the /review read still carries the scope as a query parameter", async () => {
  await withRecordedFetch({ documents: [], connections: [] }, async (calls) => {
    await review.readReview(PROJECT, "token", DOC_A);
    await review.readReview(PROJECT, "token", null);

    assert.equal(calls[0].init.method, "GET");
    assert.equal(calls[0].url, `${API}/production/review/${PROJECT}/review?document_id=${DOC_A}`);
    assert.equal(calls[0].init.body, undefined);

    assert.equal(calls[1].url, `${API}/production/review/${PROJECT}/review`);
  });
});

test("J: the resolution still carries the scope, and its body is unchanged", async () => {
  await withRecordedFetch({ project_id: PROJECT, review_revision: 1 }, async (calls) => {
    const resolutions = [{ task_id: "t1", task_type: "x", answer_type: "text", answer: "M20" }];
    await review.resolveConnection(PROJECT, PACKAGE, "token", 0, resolutions, DOC_B);

    const [call] = calls;
    assert.equal(call.init.method, "POST");
    assert.equal(
      call.url,
      `${API}/production/review/${PROJECT}/connections/${PACKAGE}/resolve?document_id=${DOC_B}`,
    );
    // The scope travels in the query; the body still carries only the two client-permitted
    // fields and never the document.
    assert.deepEqual(JSON.parse(call.init.body), { expected_revision: 0, resolutions });
  });
});

test("an identifier is URL-encoded rather than pasted into a URL raw", async () => {
  const awkward = "id with space/and+plus";
  await withRecordedFetch({ documents: [], connections: [] }, async (calls) => {
    await review.readReview(PROJECT, "token", awkward);
    assert.equal(isQueryScoped(calls[0].url), awkward);
    assert.ok(!calls[0].url.includes(" "), "a raw space must never reach the URL");
  });
});

// ======================================================================================
// STRUCTURAL — the two React sources. Comment-stripped, so dead code cannot pass.
// ======================================================================================

/** The source with comments removed and horizontal whitespace collapsed. Newlines are kept
 *  so the structure stays readable in a failure message. */
function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1")
    .replace(/[ \t]+/g, " ");
}

/** From a declaration's signature to the close of its first block. */
function declaration(stripped, signature) {
  const at = stripped.indexOf(signature);
  assert.notEqual(at, -1, `"${signature}" was not found in the source`);
  const open = stripped.indexOf("{", at);
  assert.notEqual(open, -1, `"${signature}" has no block`);
  let depth = 0;
  for (let i = open; i < stripped.length; i += 1) {
    if (stripped[i] === "{") depth += 1;
    else if (stripped[i] === "}") {
      depth -= 1;
      if (depth === 0) return stripped.slice(at, i + 1);
    }
  }
  throw new Error(`"${signature}" is not balanced`);
}

/** From a marker to the end of a named terminator — for shapes whose first `{` is not the
 *  one worth reading (a destructured parameter list, a self-closing JSX element). */
function region(stripped, startMarker, endMarker) {
  const at = stripped.indexOf(startMarker);
  assert.notEqual(at, -1, `"${startMarker}" was not found in the source`);
  const end = stripped.indexOf(endMarker, at + startMarker.length);
  assert.notEqual(end, -1, `"${startMarker}" was not terminated by "${endMarker}"`);
  return stripped.slice(at, end + endMarker.length);
}

const surfaceSource = stripComments(read("src/components/ConnectionReviewSurface.tsx"));
const pageSource = stripComments(read("src/pages/project/ProjectReview.tsx"));

test("D: ProjectReview passes the selected document to openReview", () => {
  const start = declaration(pageSource, "const start = async () =>");
  assert.match(
    start,
    /await openReview\(project\.id, token, selectedDocumentId\)/,
    "the opening request must name the document the page is showing",
  );
});

test("E: ConnectionReviewSurface accepts an optional documentId", () => {
  const props = region(
    surfaceSource,
    "export default function ConnectionReviewSurface(",
    "}) {",
  );
  assert.match(props, /\bdocumentId\b/, "the component must take the document");
  assert.match(props, /documentId\?: string \| null;/, "the prop must be optional and nullable");
});

test("F: the surface sends document_id on /workflow when it has one", () => {
  const load = declaration(surfaceSource, "async function load()");
  assert.match(
    load,
    /new URLSearchParams\(\{ document_id: documentId \}\)/,
    "the scope must be encoded through URLSearchParams, not interpolated raw",
  );
  assert.match(
    load,
    /\/production\/review\/\$\{projectId\}\/workflow\$\{scope\}/,
    "the workflow URL must carry the built scope",
  );
  assert.match(
    load,
    /documentId\s*\?\s*`\?\$\{new URLSearchParams/,
    "and must build no query string at all when no document is chosen",
  );
});

test("G: documentId is in the workflow request's dependencies", () => {
  assert.match(
    surfaceSource,
    /\[projectId, documentId, session\?\.access_token\]/,
    "choosing another document must re-read the workflow",
  );
});

test("H: ProjectReview passes the selected document to the surface", () => {
  const element = region(pageSource, "<ConnectionReviewSurface", "/>");
  assert.match(element, /projectId=\{project\.id\}/);
  assert.match(element, /documentId=\{selectedDocumentId\}/);
});

test("the selected document is still held only in the URL", () => {
  assert.match(pageSource, /const selectedDocumentId = searchParams\.get\("document_id"\);/);
  // No second source of truth was introduced to satisfy the fix.
  assert.doesNotMatch(pageSource, /createContext|useContext|documentStore|useDocumentState/);
});

// ======================================================================================
// The Dashboard is deliberately NOT part of this fix: it has no document-selection concept,
// and an unscoped surface there stays the honest answer for a multi-document project.
// ======================================================================================
test("the Dashboard still renders the surface with no document scope", () => {
  const dashboard = stripComments(read("src/pages/Dashboard.tsx"));
  const element = region(dashboard, "<ConnectionReviewSurface", "/>");
  assert.match(element, /projectId=\{reviewProjectId\}/);
  assert.doesNotMatch(element, /documentId=/, "the Dashboard must not invent a document");
});
