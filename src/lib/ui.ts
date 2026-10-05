import type { CSSProperties } from "react";
import { theme as C } from "./theme";
import type { ProjectStatus } from "./projects";

// Shared surface styles and formatters — the same values the dashboard already
// used, stated once so the project screens and the dashboard cannot drift apart.
//
// These live here rather than beside the components so that components/ui.tsx
// exports components and nothing else; a module that exports both makes React
// Fast Refresh fall back to a full reload in development.

export const panel: CSSProperties = { background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" };
export const panelHead: CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: `1px solid ${C.borderLight}` };
export const btnRust: CSSProperties = { display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 18px", background: C.rust, color: "#fff", border: "none", borderRadius: 8, fontSize: 13.5, fontWeight: 600, cursor: "pointer" };
export const btnGhost: CSSProperties = { display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 16px", background: C.card, color: C.ink2, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer" };

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-NZ", { day: "2-digit", month: "short", year: "numeric" });

// A project's lifecycle state in the product's own words, stated once. Badge in
// components/ui.tsx renders these, and the project screens read them as text, so
// a screen cannot describe the same status differently from the badge above it.
//
// "done" is deliberately "Analysis complete" — the backend's word for the
// analysis having finished, not for anyone having checked the engineering.
export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  done: "Analysis complete",
  processing: "Processing",
  review: "Review required",
  failed: "Failed",
};

export const statusLabel = (status: ProjectStatus): string => PROJECT_STATUS_LABEL[status];

// Tonnage, in the one format the product uses: two decimals, a space, the unit.
export const fmtTonnes = (tonnes: number): string => `${tonnes.toFixed(2)} t`;
