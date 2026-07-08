import { NextResponse } from "next/server";
import type { ProjectRecord } from "@/data/projects";
import { createProjectInSheet, deleteProjectInSheet, updateProjectInSheet } from "@/lib/connectors/google-sheet-task-project";
import { getApiUser } from "@/lib/auth/api";
import { rejectUnsafeMutationRequest } from "@/lib/security/request-guards";

function canManageProjects(user: { role: string; characterId?: string }) {
  return user.role === "Super Admin" || user.characterId === "tammasit";
}

function canDeleteProjects(user: { role: string; characterId?: string; email?: string }) {
  return canManageProjects(user) || Boolean(String(user.email || "").trim());
}

export async function DELETE(request: Request) {
  const unsafe = rejectUnsafeMutationRequest(request);
  if (unsafe) return unsafe;

  const user = await getApiUser("Projects");
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canDeleteProjects(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const body = (await request.json()) as { projectId?: string };
    if (!body.projectId) throw new Error("Project ID is required.");
    const project = await deleteProjectInSheet(body.projectId);
    return NextResponse.json({ project, mode: "google-sheet" });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to delete project." },
      { status: 400 },
    );
  }
}

export async function POST(request: Request) {
  const unsafe = rejectUnsafeMutationRequest(request);
  if (unsafe) return unsafe;

  const user = await getApiUser("Projects");
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageProjects(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const body = (await request.json()) as { project?: ProjectRecord };
    if (!body.project?.projectName) throw new Error("Project name is required.");
    const project = await createProjectInSheet({
      ...body.project,
      createdBy: body.project.createdBy || user.name,
    });
    return NextResponse.json({ project, mode: "google-sheet" });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create project." },
      { status: 400 },
    );
  }
}

export async function PATCH(request: Request) {
  const unsafe = rejectUnsafeMutationRequest(request);
  if (unsafe) return unsafe;

  const user = await getApiUser("Projects");
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageProjects(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const body = (await request.json()) as { projectId?: string; patch?: Partial<ProjectRecord> };
    if (!body.projectId) throw new Error("Project ID is required.");
    const project = await updateProjectInSheet(body.projectId, body.patch || {});
    return NextResponse.json({ project, mode: "google-sheet" });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update project." },
      { status: 400 },
    );
  }
}
