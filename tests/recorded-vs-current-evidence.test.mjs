// L34 — THE RECORDED REVIEW AND THE CURRENT RECONSTRUCTION ARE SHOWN AS DIFFERENT THINGS.
//
// The review page presents two bands that can describe DIFFERENT extraction lineages:
// the persisted RECORDED review, and a fresh CURRENT reconstruction of the selected
// document. Both can report the number 0 — a reconstruction is always at its own revision
// 0 — so a page that printed "revision 0" over a band built from the reconstruction would
// invite the reader to take the projection for the record.
//
// These are SOURCE-LEVEL assertions, in the pattern this repository already uses
// (tests/document-scope-propagation.test.mjs): the page's props cannot be rendered without
// a DOM harness this project does not have and this task does not add. Comments are
// stripped before asserting, so a commented-out line can never satisfy one.
//
//     node --test

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative) => fs.readFileSync(path.join(REPO, relative), "utf8");

function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

const PAGE = stripComments(read("src/pages/project/ProjectReview.tsx"));
const LIB = stripComments(read("src/lib/review.ts"));

/** The source between two markers — one whole rendered band. */
function between(stripped, from, to) {
  const a = stripped.indexOf(from);
  assert.notEqual(a, -1, `"${from}" was not found in the source`);
  const b = to === undefined ? stripped.length : stripped.indexOf(to, a + from.length);
  assert.notEqual(b, -1, `"${from}" was not terminated by "${to}"`);
  return stripped.slice(a, b);
}

const RECORDED_BAND = () => between(PAGE, "Recorded review</h3>", "Current reconstruction</h3>");
const CURRENT_BAND = () => between(PAGE, "Current reconstruction</h3>", "{doc.connections.map((connection) => (");

test("A: the recorded evidence run ids are rendered in the RECORDED REVIEW band", () => {
  const recorded = RECORDED_BAND();
  assert.match(recorded, /doc\.recorded_evidence_run_ids/);
  assert.match(recorded, /Recorded revision/);
});

test("B: capture_runs are rendered in the CURRENT RECONSTRUCTION band", () => {
  const current = CURRENT_BAND();
  assert.match(current, /doc\.capture_runs/);
});

test("C: the two evidence identities are not collapsed into one label", () => {
  const recorded = RECORDED_BAND();
  const current = CURRENT_BAND();
  assert.match(recorded, /doc\.recorded_evidence_run_ids/);
  assert.doesNotMatch(recorded, /doc\.capture_runs/, "the recorded band must not show the reconstruction's evidence");
  assert.match(current, /doc\.capture_runs/);
  assert.doesNotMatch(current, /doc\.recorded_evidence_run_ids/, "the current band must not show the record's evidence");
});

test("D: revision 0 is presented as the RECORDED revision", () => {
  assert.match(PAGE, /Recorded revision \{doc\.revision\}/);
  // The bare, unlabelled chip is gone — it was what made "revision 0" read as the band's.
  assert.doesNotMatch(PAGE, />revision \{doc\.revision\}</);
});

test("E: the projected packages are placed under CURRENT RECONSTRUCTION", () => {
  const currentAt = PAGE.indexOf("Current reconstruction</h3>");
  const packagesAt = PAGE.indexOf("{doc.connections.map((connection) => (");
  assert.notEqual(packagesAt, -1);
  assert.ok(currentAt < packagesAt, "the current-reconstruction band must precede the packages");
  // And the recorded band must not sit between them.
  const recordedAt = PAGE.indexOf("Recorded review</h3>");
  assert.ok(recordedAt < currentAt, "the recorded band belongs above the current band");
});

test("F: no real production run or project id is hardcoded in either source file", () => {
  const IDS = [
    "2830d3bc-6918-4550-b860-f9047a342899", // recorded revision 0's run
    "e697dfee-d22c-4ab4-a0b9-a193d2dd70af", // the selected reconstruction's run
    "2389c115-664f-4fe4-8b76-ca07aac3719d", // the project
    "9a06752a-7ae5-46e7-8a29-4fb410b4f5f7", // the selected drawing
  ];
  for (const id of IDS) {
    assert.ok(!PAGE.includes(id), `ProjectReview.tsx hardcodes ${id}`);
    assert.ok(!LIB.includes(id), `review.ts hardcodes ${id}`);
  }
});

test("the type carries the field the page reads", () => {
  assert.match(LIB, /recorded_evidence_run_ids: string\[\];/);
});
