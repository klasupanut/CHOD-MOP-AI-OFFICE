import { NextResponse } from "next/server";
import { getGitHubRepoConnectors } from "@/lib/connectors/github";
import { getApiUser } from "@/lib/auth/api";

export async function GET() {
  const user = await getApiUser("Settings");
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ repos: getGitHubRepoConnectors(), mode: "configuration-only" });
}
