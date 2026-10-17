// THE PRODUCTION PILOT SHOP-DRAWING PACKAGE ACTION.
//
// WHAT THIS FILE IS
//
// The regression proof for the smallest production action: the Fabrication page asks the
// service for one assembly's package and hands the returned ZIP to the browser.
//
//     BEHAVIOURAL   `src/lib/shopDrawings.ts` is transpiled with the project's OWN
//                   typescript compiler and executed against a stubbed `fetch`. The URL,
//                   method, credential header, refusal handling and download name are
//                   asserted over the request that was actually built.
//
//     STRUCTURAL    `ProjectFabrication.tsx` is a React component and cannot be rendered
//                   without a DOM harness this repository does not have. Its assertions
//                   are made over comment-stripped source, so dead code cannot pass.
//
// It runs on Node's own test runner. Nothing is installed, no network is reached, no
// Supabase project is touched and no production route is called.

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
const API = "https://review-service.test";
const ZIP_BYTES = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);

let moduleCounter = 0;

async function loadShopDrawingsModule() {
  const source = read("src/lib/shopDrawings.ts");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;

  const prepared = compiled.replaceAll("import.meta.env", "globalThis.__SS_ENV__");
  assert.notEqual(
    prepared,
    compiled,
    "shopDrawings.ts no longer reads import.meta.env; this harness must be updated rather " +
      "than silently asserting against a module whose configuration it cannot supply",
  );

  // The module reads its configuration at import time, so the binding must exist first.
  globalThis.__SS_ENV__ = { VITE_API_URL: API };

  const file = path.join(
    fs.mkdtempSync(path.join(os.tmpdir(), "ss-shop-drawings-")),
    `shopDrawings-${moduleCounter++}.mjs`,
  );
  fs.writeFileSync(file, prepared);
  return import(pathToFileURL(file).href);
}

async function withFetch(handler, run) {
  const calls = [];
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init: init ?? {} });
    return handler(url, init);
  };
  try {
    return await run(calls);
  } finally {
    globalThis.fetch = previousFetch;
  }
}

const shop = await loadShopDrawingsModule();

const headerOf = (call, name) => {
  const headers = call.init.headers ?? {};
  const key = Object.keys(headers).find(
    (entry) => entry.toLowerCase() === name.toLowerCase(),
  );
  return key === undefined ? undefined : headers[key];
};

test("A: the package request names the assembly and carries the bearer token", async () => {
  await withFetch(
    () =>
      new Response(ZIP_BYTES, {
        status: 200,
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": 'attachment; filename="A006-pilot-package.zip"',
        },
      }),
    async (calls) => {
      const result = await shop.generateShopDrawingPackage(
        PROJECT,
        "A006",
        "access-token",
      );

      assert.equal(calls.length, 1);
      const [call] = calls;
      assert.equal(call.init.method, "GET");
      assert.equal(
        call.url,
        `${API}/production/review/${PROJECT}/shop-drawings?assembly=A006`,
      );
      assert.equal(headerOf(call, "authorization"), "Bearer access-token");
      assert.equal(call.init.body, undefined);
      assert.equal(result.filename, "A006-pilot-package.zip");
      assert.equal(result.blob.size, ZIP_BYTES.length);
    },
  );
});

test("B: the assembly mark is URL-encoded, never pasted into the URL raw", async () => {
  await withFetch(
    () => new Response(ZIP_BYTES, { status: 200 }),
    async (calls) => {
      await shop.generateShopDrawingPackage(PROJECT, "A 006/1", "token");
      const [call] = calls;
      assert.ok(!call.url.includes(" "), "a raw space must never reach the URL");
      assert.equal(new URL(call.url).searchParams.get("assembly"), "A 006/1");
      // No Content-Disposition: the deterministic local name is used.
      assert.equal(call.url.includes("A%20006%2F1"), true);
    },
  );
});

test("C: a blank assembly is refused before any request", async () => {
  await withFetch(
    () => {
      throw new Error("fetch must not be called");
    },
    async (calls) => {
      await assert.rejects(
        () => shop.generateShopDrawingPackage(PROJECT, "   ", "token"),
        (error) => {
          assert.equal(error.name, "ShopDrawingPackageRefused");
          assert.equal(error.code, "SHOP_DRAWING_PACKAGE_ASSEMBLY_REQUIRED");
          return true;
        },
      );
      assert.equal(calls.length, 0);
    },
  );
});

test("D: the service's refusal is reported as the service stated it", async () => {
  await withFetch(
    () =>
      new Response(
        JSON.stringify({
          detail: {
            refusal: "NO_RECORDED_READING",
            reason: "the project carries no recorded reading",
          },
        }),
        { status: 409, headers: { "Content-Type": "application/json" } },
      ),
    async () => {
      await assert.rejects(
        () => shop.generateShopDrawingPackage(PROJECT, "A006", "token"),
        (error) => {
          assert.equal(error.name, "ShopDrawingPackageRefused");
          assert.equal(error.status, 409);
          assert.equal(error.code, "NO_RECORDED_READING");
          assert.equal(error.message, "the project carries no recorded reading");
          return true;
        },
      );
    },
  );
});

test("E: no configured service is refused as itself", async () => {
  // The module's configuration is read once at import time. A separate transpiled copy
  // states the unconfigured case, exactly as the deployed build would.
  const source = read("src/lib/shopDrawings.ts");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const prepared = compiled.replaceAll("import.meta.env", "globalThis.__SS_ENV__");
  globalThis.__SS_ENV__ = { VITE_API_URL: undefined };
  const file = path.join(
    fs.mkdtempSync(path.join(os.tmpdir(), "ss-shop-drawings-off-")),
    "shopDrawings.mjs",
  );
  fs.writeFileSync(file, prepared);
  const unconfigured = await import(pathToFileURL(file).href);

  await assert.rejects(
    () => unconfigured.generateShopDrawingPackage(PROJECT, "A006", "token"),
    (error) => {
      assert.equal(error.name, "ShopDrawingPackageRefused");
      assert.equal(error.code, "SHOP_DRAWING_PACKAGE_SERVICE_NOT_CONFIGURED");
      return true;
    },
  );
});

// ======================================================================================
// STRUCTURAL — the Fabrication page, comment-stripped.
// ======================================================================================
function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1")
    .replace(/[ \t]+/g, " ");
}

const pageSource = stripComments(
  read("src/pages/project/ProjectFabrication.tsx"),
);

test("F: the page offers the assembly input and the generation action", () => {
  assert.match(pageSource, /generateShopDrawingPackage\(/);
  assert.match(pageSource, /id="assembly-mark"/);
  assert.match(pageSource, /Generate pilot package/);
});

test("G: the page offers the generated download, not a fake path", () => {
  assert.match(pageSource, /Download package/);
  assert.match(pageSource, /download=\{download\.filename\}/);
  assert.match(pageSource, /URL\.createObjectURL\(result\.blob\)/);
});

test("H: the page states the pilot boundary and claims no readiness", () => {
  assert.match(pageSource, /PILOT REVIEW — NOT FOR CONSTRUCTION/);
  assert.match(pageSource, /This is not a fabrication-ready deliverable\./);
  assert.doesNotMatch(
    pageSource,
    /Fabrication output is not available for this project/,
    "the old placeholder must not survive beside a working action",
  );
});
