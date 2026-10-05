import { supabase } from "./supabase";

// === TYPES (mirror the Supabase schema) ===
export type ProjectStatus = "processing" | "review" | "done" | "failed";

export interface Project {
  id: string;
  name: string | null;
  engineer_reference: string | null;
  client: string | null;
  status: ProjectStatus;
  total_members: number;
  total_connections: number;
  total_weight_tonnes: number;
  source_format: string | null;
  error_message: string | null;
  report_pdf_path: string | null;
  created_at: string;
}

// The column set this build reads. It is the same set the dashboard has always
// read, stated once so the project screens and the dashboard cannot drift into
// selecting different things. Nothing is added here speculatively: a column that
// is not on this list is a column this build has never confirmed exists, so no
// screen may display it.
export const PROJECT_COLUMNS =
  "id, name, engineer_reference, client, status, total_members, total_connections, total_weight_tonnes, source_format, error_message, report_pdf_path, created_at";

// Reads return a failure as a failure. "You have no projects" and "we could not
// read your projects" are different statements and only one of them is true, so
// a failed read never collapses into an empty list.
export interface ProjectListRead {
  projects: Project[];
  error: string | null;
}

export interface ProjectRead {
  project: Project | null;
  error: string | null;
}

export async function readProjects(): Promise<ProjectListRead> {
  const { data, error } = await supabase
    .from("projects")
    .select(PROJECT_COLUMNS)
    .order("created_at", { ascending: false });

  if (error) return { projects: [], error: "Your projects could not be loaded." };
  return { projects: (data as Project[] | null) ?? [], error: null };
}

export async function readProject(id: string): Promise<ProjectRead> {
  const { data, error } = await supabase
    .from("projects")
    .select(PROJECT_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) return { project: null, error: "This project could not be loaded." };
  return { project: (data as Project | null) ?? null, error: null };
}
