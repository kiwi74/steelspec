// The production pilot shop-drawing package client — the one place the browser asks
// the service for a package.
//
// Everything here goes through the route the review service already serves and nothing
// else: `GET /production/review/{project_id}/shop-drawings?assembly=...`. The access
// token travels in the `Authorization` header and nowhere else — never a URL, never a
// query string.
//
// The service owns the whole composition: the assembly schedule, the member sheets it
// can support, the manifest and every blocked member. This module sends the assembly
// mark the reader typed and returns the ZIP the service produced. It does not infer an
// assembly, inspect a PDF, build a sheet, decide a blocker or claim readiness.

const API_URL = import.meta.env.VITE_API_URL as string | undefined;

/** The reader has not supplied the one input this request requires. */
export const SHOP_DRAWING_PACKAGE_ASSEMBLY_REQUIRED =
  "SHOP_DRAWING_PACKAGE_ASSEMBLY_REQUIRED";
/** This build has no extraction/review service configured. */
export const SHOP_DRAWING_PACKAGE_SERVICE_NOT_CONFIGURED =
  "SHOP_DRAWING_PACKAGE_SERVICE_NOT_CONFIGURED";

/** A refusal the service stated, kept as the service stated it. */
export class ShopDrawingPackageRefused extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, statement: string) {
    super(statement);
    this.name = "ShopDrawingPackageRefused";
    this.status = status;
    this.code = code;
  }
}

/** The ZIP the service returned, and the name to save it under. */
export interface ShopDrawingPackageDownload {
  blob: Blob;
  filename: string;
}

function requireApiUrl(): string {
  if (!API_URL) {
    throw new ShopDrawingPackageRefused(
      0,
      SHOP_DRAWING_PACKAGE_SERVICE_NOT_CONFIGURED,
      "The package service is not configured for this build, so no package could be generated.",
    );
  }
  return API_URL;
}

async function readRefusal(
  response: Response,
): Promise<ShopDrawingPackageRefused> {
  const body = await response.text();
  let code = `HTTP_${response.status}`;
  let statement = `The package service refused this request (HTTP ${response.status}).`;
  try {
    const parsed = JSON.parse(body);
    const detail = parsed?.detail ?? parsed;
    if (typeof detail?.refusal === "string") code = detail.refusal;
    if (typeof detail?.reason === "string") statement = detail.reason;
    else if (typeof detail === "string") statement = detail;
  } catch {
    if (body.trim()) statement = body.trim().slice(0, 300);
  }
  return new ShopDrawingPackageRefused(response.status, code, statement);
}

/** The service's own download name, or a deterministic local fallback. */
function filenameFrom(disposition: string | null, assembly: string): string {
  if (disposition) {
    const match = /filename="?([^";]+)"?/i.exec(disposition);
    if (match?.[1]) return match[1];
  }
  return `${assembly}-pilot-package.zip`;
}

/** Generate one pilot package for the assembly mark the reader named. */
export async function generateShopDrawingPackage(
  projectId: string,
  assembly: string,
  token: string,
): Promise<ShopDrawingPackageDownload> {
  const mark = assembly.trim();
  if (!mark) {
    throw new ShopDrawingPackageRefused(
      0,
      SHOP_DRAWING_PACKAGE_ASSEMBLY_REQUIRED,
      "Enter the assembly mark exactly as the drawing states it.",
    );
  }

  const response = await fetch(
    `${requireApiUrl()}/production/review/${encodeURIComponent(projectId)}/shop-drawings?assembly=${encodeURIComponent(mark)}`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  if (!response.ok) throw await readRefusal(response);

  return {
    blob: await response.blob(),
    filename: filenameFrom(response.headers.get("Content-Disposition"), mark),
  };
}
