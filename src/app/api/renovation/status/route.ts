import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/auth/api";
import {
  isRenovationWriteEnabled,
  updateRenovationFields,
} from "@/lib/renovation/google-sheet-status";
import {
  RENOVATION_OPERATION_DEFINITIONS,
  RENOVATION_PROJECTS,
  RenovationStatusError,
} from "@/lib/renovation/status-schema";
import { rejectUnsafeMutationRequest } from "@/lib/security/request-guards";

function statusConfig() {
  const enabled = isRenovationWriteEnabled();
  return {
    enabled,
    projects: RENOVATION_PROJECTS,
    operations: Object.fromEntries(
      Object.entries(RENOVATION_OPERATION_DEFINITIONS).map(([operationId, operation]) => [
        operationId,
        {
          id: operation.id,
          label: operation.label,
          fields: operation.fields.map((field) => ({
            key: field.key,
            label: field.label,
            kind: field.kind,
            options: field.kind === "boolean"
              ? [
                { value: "TRUE", label: field.trueLabel || "Yes" },
                { value: "FALSE", label: field.falseLabel || "No" },
              ]
              : (field.options || []).map((value) => ({ value, label: value })),
            maxLength: field.maxLength,
            step: field.step,
            multiline: Boolean(field.multiline),
          })),
        },
      ]),
    ),
    reason: enabled
      ? "Google Sheet live write is enabled for renovation fields."
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
      changes?: Array<{
        field?: unknown;
        value?: unknown;
        expectedValue?: unknown;
      }>;
    };
    const result = await updateRenovationFields({
      project: String(body.project || "").trim(),
      operation: String(body.operation || "").trim(),
      unitId: String(body.unitId || "").trim(),
      changes: Array.isArray(body.changes)
        ? body.changes.map((change) => ({
          field: change.field,
          value: change.value,
          expectedValue: change.expectedValue,
        }))
        : [],
    });
    console.info("Renovation status writeback completed", {
      actor: user.email,
      project: result.project,
      unitId: result.unitId,
      operation: result.operation,
      fields: result.changedFields,
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
