import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/auth/api";
import {
  isRenovationWriteEnabled,
  updateRenovationSlabStatus,
} from "@/lib/renovation/google-sheet-status";
import {
  RENOVATION_PILOT_OPERATION,
  RENOVATION_PILOT_PROJECT,
  RENOVATION_STATUS_VALUES,
  RenovationStatusError,
} from "@/lib/renovation/status-schema";
import { rejectUnsafeMutationRequest } from "@/lib/security/request-guards";

function statusConfig() {
  const enabled = isRenovationWriteEnabled();
  return {
    enabled,
    project: RENOVATION_PILOT_PROJECT,
    operation: RENOVATION_PILOT_OPERATION,
    statuses: RENOVATION_STATUS_VALUES,
    reason: enabled
      ? "Live Slab Renovation writeback is enabled for CHOD 2."
      : "Live write is locked. Set RENOVATION_WRITE_MODE=enabled after the service account has Editor access.",
  };
}

export async function GET() {
  const user = await getApiUser("Renovation");
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(statusConfig(), {
    headers: { "Cache-Control": "private, no-store" },
  });
}

export async function PATCH(request: Request) {
  const unsafe = rejectUnsafeMutationRequest(request);
  if (unsafe) return unsafe;

  const user = await getApiUser("Renovation");
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isRenovationWriteEnabled()) {
    return NextResponse.json(
      { error: "Renovation live write is locked.", detail: statusConfig().reason },
      { status: 403 },
    );
  }

  try {
    const body = (await request.json()) as {
      project?: string;
      operation?: string;
      unitId?: string;
      status?: unknown;
      expectedStatus?: unknown;
    };
    const result = await updateRenovationSlabStatus({
      project: String(body.project || "").trim(),
      operation: String(body.operation || "").trim(),
      unitId: String(body.unitId || "").trim(),
      status: body.status,
      expectedStatus: body.expectedStatus,
    });
    console.info("Renovation status writeback completed", {
      actor: user.email,
      project: result.project,
      unitId: result.unitId,
      status: result.status,
      changed: result.changed,
    });
    return NextResponse.json({ ok: true, result }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    const status = error instanceof RenovationStatusError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Renovation update failed.";
    console.error("Renovation status writeback failed", {
      actor: user.email,
      error: message,
    });
    return NextResponse.json({ error: message }, { status });
  }
}
