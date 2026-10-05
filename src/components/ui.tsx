import { theme as C } from "../lib/theme";
import { PROJECT_STATUS_LABEL } from "../lib/ui";
import type { ProjectStatus } from "../lib/projects";

// Shared presentational components, used by the dashboard and the project
// screens so the two cannot describe the same row differently. Styles and
// formatters live in ../lib/ui.
//
// This module deliberately exports components and nothing else.

// Project lifecycle state, as the backend derives it (app/validation/
// project_status.py). "done" means every piece of persisted evidence is
// explicitly resolved — it is NOT a verification claim and no human has
// checked the engineering, so green (reserved here for a verified state) is
// deliberately not used. "Complete" was too strong a word for "the analysis
// finished". "review" uses the backend's own term. The wording itself lives in
// ../lib/ui so the project screens read the same strings this badge renders.
const BADGE: Record<ProjectStatus, [string, string, string]> = {
  done: [C.blue, C.blueBg, PROJECT_STATUS_LABEL.done],
  processing: [C.amber, C.amberBg, PROJECT_STATUS_LABEL.processing],
  review: [C.amber, C.amberBg, PROJECT_STATUS_LABEL.review],
  failed: [C.red, C.redBg, PROJECT_STATUS_LABEL.failed],
};

export function Badge({ status }: { status: ProjectStatus }) {
  const [fg, bg, label] = BADGE[status];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, color: fg, background: bg }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: fg }} />{label}
    </span>
  );
}

export function FormatTag({ f }: { f: string }) {
  return <span style={{ padding: "3px 10px", fontSize: 10, fontWeight: 600, letterSpacing: 1, borderRadius: 4, background: C.rustBg, color: C.rust, border: `1px solid ${C.rustBorder}` }}>.{f}</span>;
}

export function EmptyState({ message }: { message: string }) {
  return <div style={{ padding: "44px 20px", textAlign: "center", color: C.grey, fontSize: 13 }}>{message}</div>;
}

// A read that FAILED must never render as an empty collection. "You have no
// projects" and "we could not read your projects" are different statements
// and only one of them is true, so a failure gets its own state and a retry.
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div style={{ padding: "36px 20px", textAlign: "center", fontSize: 13 }}>
      <div style={{ color: C.red, marginBottom: 14 }}>{message}</div>
      {onRetry && (
        <button onClick={onRetry} style={{ padding: "8px 16px", background: C.card, color: C.ink2, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12.5, fontWeight: 500, cursor: "pointer" }}>
          Try again
        </button>
      )}
    </div>
  );
}

// Loading is not empty either — it says what is happening.
export function LoadingState({ message }: { message: string }) {
  return (
    <div style={{ padding: "44px 20px", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, color: C.grey, fontSize: 13 }}>
      <span style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${C.border}`, borderTopColor: C.rust, animation: "spin 1s linear infinite", display: "inline-block" }} />
      {message}
    </div>
  );
}
