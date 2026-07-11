import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/auth/api";
import { listReadNotificationIds, markNotificationsRead } from "@/lib/auth/google-sheets-store";
import { rejectUnsafeMutationRequest } from "@/lib/security/request-guards";

function response(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

export async function GET() {
  const user = await getApiUser();
  if (!user) return response({ error: "Unauthorized" }, 401);
  return response({ readIds: await listReadNotificationIds(user.email) });
}

export async function POST(request: Request) {
  const unsafe = rejectUnsafeMutationRequest(request);
  if (unsafe) return unsafe;

  const user = await getApiUser();
  if (!user) return response({ error: "Unauthorized" }, 401);

  const body = (await request.json().catch(() => ({}))) as { notificationIds?: unknown };
  const notificationIds = Array.isArray(body.notificationIds)
    ? body.notificationIds
      .map((id) => String(id || "").trim())
      .filter((id) => id.length > 0 && id.length <= 200)
      .slice(0, 100)
    : [];
  if (!notificationIds.length) return response({ error: "notificationIds is required." }, 400);

  return response({ readIds: await markNotificationsRead(user.email, notificationIds) });
}
