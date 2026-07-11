import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/auth/api";
import { listApprovedUsers, setApprovedUserPresence } from "@/lib/auth/google-sheets-store";
import { getOnlineCharacterIds } from "@/lib/auth/presence";
import { rejectUnsafeMutationRequest } from "@/lib/security/request-guards";

function responseWithNoStore(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

export async function GET() {
  const user = await getApiUser();
  if (!user) return responseWithNoStore({ error: "Unauthorized" }, 401);

  const users = await listApprovedUsers();
  return responseWithNoStore({ onlineCharacterIds: getOnlineCharacterIds(users) });
}

export async function POST(request: Request) {
  const unsafe = rejectUnsafeMutationRequest(request);
  if (unsafe) return unsafe;

  const user = await getApiUser();
  if (!user) return responseWithNoStore({ error: "Unauthorized" }, 401);

  const body = (await request.json().catch(() => ({}))) as { state?: unknown };
  await setApprovedUserPresence(user.email, body.state !== "offline");
  const users = await listApprovedUsers();
  return responseWithNoStore({ onlineCharacterIds: getOnlineCharacterIds(users) });
}
