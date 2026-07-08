import { NextRequest, NextResponse } from "next/server";
import { getApiUser } from "@/lib/auth/api";
import type { ApprovedUser } from "@/lib/auth/types";
import type { QuotationPermission } from "@/lib/auth/permissions";
import { enrichQuotationExtraFields, syncQuotationExtraFields, updateQuotationSheetInternalVerification } from "@/lib/quotations/google-sheet-extra-fields";
import { callQuotationAppsScript, formatAppsScriptError, getQuotationAppsScriptUrl, isSigningAction } from "@/lib/quotations/apps-script-backend";
import { rejectUnsafeMutationRequest } from "@/lib/security/request-guards";

type BackendRequest = {
  action?: string;
  payload?: unknown;
};

function withRequestedQuotationNo(data: unknown, payload: unknown) {
  if (!data || typeof data !== "object" || !payload || typeof payload !== "object") return data;
  const quotationNo = String((payload as { quotationNo?: unknown }).quotationNo || "").trim();
  if (!quotationNo) return data;
  return { ...data as object, quotationNo };
}

const actionPermissions: Record<string, QuotationPermission[]> = {
  setup: ["quotation.manageSettings"],
  listQuotations: ["quotation.view"],
  getQuotation: ["quotation.view"],
  saveQuotation: ["quotation.create", "quotation.edit"],
  deleteQuotation: ["quotation.delete"],
  getSettings: ["quotation.view"],
  saveSettings: ["quotation.manageSettings"],
  listTemplates: ["quotation.view"],
  saveTemplate: ["quotation.manageSettings"],
  listSignatures: ["quotation.view"],
  uploadSignature: ["quotation.manageSignatures"],
  uploadPdf: ["quotation.exportPdf"],
  createSigningLink: ["quotation.createSigningLink"],
  revokeSigningLink: ["quotation.createSigningLink"],
  internalVerifyQuotation: ["quotation.createSigningLink"],
};

const sensitiveCostKeys = new Set([
  "contractorUnitCost",
  "contractorGrossTotalCost",
  "contractorDiscountAmount",
  "contractorTotalCost",
  "totalContractorCost",
]);

const sensitiveProfitKeys = new Set([
  "markupPercent",
  "projectMarkupPercent",
  "sellingUnitPrice",
  "sellingTotal",
  "projectSellingTotal",
  "grossProfit",
  "grossMarginPercent",
  "totalSellingAmount",
  "totalGrossProfit",
  "averageMarkupPercent",
]);

function canRun(user: ApprovedUser, action: string) {
  const required = actionPermissions[action];
  return Boolean(required?.some((permission) => user.quotationPermissions.includes(permission)));
}

function redactInternalPricing(value: unknown, user: ApprovedUser): unknown {
  if (Array.isArray(value)) return value.map((entry) => redactInternalPricing(entry, user));
  if (!value || typeof value !== "object") return value;

  const canSeeCost = user.quotationPermissions.includes("quotation.viewInternalCost");
  const canSeeProfit = user.quotationPermissions.includes("quotation.viewMarkupProfit");

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => {
      if ((!canSeeCost && sensitiveCostKeys.has(key)) || (!canSeeProfit && sensitiveProfitKeys.has(key))) {
        return [key, 0];
      }
      return [key, redactInternalPricing(entry, user)];
    }),
  );
}

export async function POST(request: NextRequest) {
  const unsafe = rejectUnsafeMutationRequest(request);
  if (unsafe) return unsafe;

  const user = await getApiUser("Quotations");
  if (!user || !user.quotationPermissions.includes("quotation.view")) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: BackendRequest;
  try {
    body = (await request.json()) as BackendRequest;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body" }, { status: 400 });
  }

  const action = body.action?.trim() ?? "";
  if (!canRun(user, action)) {
    return NextResponse.json({ ok: false, error: "Permission denied" }, { status: 403 });
  }

  if (action === "internalVerifyQuotation") {
    const payload = body.payload && typeof body.payload === "object" ? body.payload as {
      quotationId?: unknown;
      quotationNo?: unknown;
      signedPdfUrl?: unknown;
      signedPdfFilename?: unknown;
    } : {};
    const quotationId = String(payload.quotationId || "").trim();
    const quotationNo = String(payload.quotationNo || "").trim();
    const signedPdfUrl = String(payload.signedPdfUrl || "").trim();
    const signedPdfFilename = String(payload.signedPdfFilename || "").trim();
    if (!quotationId && !quotationNo) {
      return NextResponse.json({ ok: false, error: "Missing quotation id/no for Internal Verify." }, { status: 400 });
    }
    const verifiedAt = new Date().toISOString();
    const result = await updateQuotationSheetInternalVerification({
      quotationId,
      quotationNo,
      verifiedAt,
      verifiedBy: user.email,
      signedPdfUrl,
      signedPdfFilename,
    });
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error || "Internal Verify failed." }, { status: 400 });
    }
    return NextResponse.json({
      ok: true,
      data: {
        signingStatus: "INTERNAL_VERIFIED",
        signedAt: verifiedAt,
        signedByName: "Internal Verification",
        signedByEmail: user.email,
        signedPdfUrl,
        signedPdfFilename,
        internalVerifiedAt: verifiedAt,
      },
    });
  }

  const backendUrl = getQuotationAppsScriptUrl();
  if (!backendUrl) {
    return NextResponse.json(
      { ok: false, error: "Auto Quotation backend is not configured." },
      { status: 503 },
    );
  }

  try {
    const { response, result } = await callQuotationAppsScript(action, body.payload);
    if (result.ok && action === "saveQuotation") {
      await syncQuotationExtraFields(body.payload).catch((error) => {
        console.error("Quotation extra field sync failed", error);
      });
    }
    const resultData = action === "saveQuotation" ? withRequestedQuotationNo(result.data, body.payload) : result.data;
    const enrichedData = result.ok && (action === "listQuotations" || action === "getQuotation" || action === "saveQuotation")
      ? await enrichQuotationExtraFields(resultData)
      : resultData;
    const safeResult = result.ok
      ? { ...result, data: redactInternalPricing(enrichedData, user) }
      : result;
    return NextResponse.json(safeResult, { status: response.ok ? 200 : response.status });
  } catch (error) {
    const detail = formatAppsScriptError(error);
    return NextResponse.json(
      {
        ok: false,
        error: isSigningAction(action)
          ? "Customer signing link / OTP was not sent because Auto Quotation backend is unavailable."
          : "Auto Quotation backend is unavailable.",
        detail,
      },
      { status: 502 },
    );
  }
}
