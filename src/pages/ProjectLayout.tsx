import { useCallback, useEffect, useState } from "react";
import { Outlet, useParams } from "react-router-dom";
import { readProject } from "../lib/projects";
import type { Project } from "../lib/projects";
import AppShell from "../components/AppShell";
import { EmptyState, ErrorState, LoadingState } from "../components/ui";

// The shell for a single project. It reads the one project row this route is
// addressed by, and hands it to the section screens underneath it. It reads
// only — nothing here writes to the project, and none of the section screens
// can either.
export default function ProjectLayout() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) {
      setError("No project was named in this address.");
      setLoading(false);
      return;
    }
    const { project: row, error: readError } = await readProject(id);
    setProject(row);
    setError(readError);
    setLoading(false);
  }, [id]);

  useEffect(() => { setLoading(true); load(); }, [load]);

  // Extraction runs on a separate service, so a project that is still
  // processing will not update on its own. Poll only while that is the case,
  // and stop as soon as the status moves.
  useEffect(() => {
    if (project?.status !== "processing") return;
    const interval = setInterval(load, 3000);
    return () => clearInterval(interval);
  }, [project?.status, load]);

  if (loading) return <AppShell><LoadingState message="Loading project…" /></AppShell>;
  if (error) return <AppShell><ErrorState message={error} onRetry={load} /></AppShell>;
  if (!project) return <AppShell><EmptyState message="No project is stored at this address." /></AppShell>;

  return (
    <AppShell project={project}>
      <Outlet context={project} />
    </AppShell>
  );
}
