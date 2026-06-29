import { NextResponse } from "next/server";
import { getGoogleSheetsConfig, type SheetKey } from "@/lib/connectors/google-sheets";
import { getApiUser } from "@/lib/auth/api";

export async function GET(request: Request) {
  const user = await getApiUser("Settings");
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const key = (new URL(request.url).searchParams.get("key") ?? "pm-loop") as SheetKey;
  return NextResponse.json({ key, ...getGoogleSheetsConfig(key), mode: "configuration-only" });
}
