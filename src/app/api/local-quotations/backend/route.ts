import { NextRequest, NextResponse } from "next/server";
import { isLocalNetworkRequest } from "@/lib/local-network";
import { enrichQuotationExtraFields, syncQuotationExtraFields, updateQuotationSheetInternalVerification } from "@/lib/quotations/google-sheet-extra-fields";
import { callQuotationAppsScript, formatAppsScriptError, getQuotationAppsScriptUrl, isSigningAction } from "@/lib/quotations/apps-script-backend";

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

export async function POST(request: NextRequest) {
  if (!isLocalNetworkRequest(request)) {
    return NextResponse.json({ ok: false, error: "Local Wi-Fi quotation access only." }, { status: 403 });
  }

  let body: BackendRequest;
  try {
    body = (await request.json()) as BackendRequest;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body" }, { status: 400 });
  }

  const action = body.action?.trim() ?? "";
  if (!action) {
    return NextResponse.json({ ok: false, error: "Missing quotation action." }, { status: 400 });
  }

  if (action === "internalVerifyQuotation") {
    const payload = body.payload && typeof body.payload === "object" ? body.payload as { quotationId?: unknown; quotationNo?: unknown } : {};
    const quotationId = String(payload.quotationId || "").trim();
    const quotationNo = String(payload.quotationNo || "").trim();
    if (!quotationId && !quotationNo) {
      return NextResponse.json({ ok: false, error: "Missing quotation id/no for Internal Verify." }, { status: 400 });
    }
    const verifiedAt = new Date().toISOString();
    const result = await updateQuotationSheetInternalVerification({
      quotationId,
      quotationNo,
      verifiedAt,
      verifiedBy: "local-wifi-internal-verify",
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
        signedByEmail: "local-wifi-internal-verify",
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
        console.error("Local quotation extra field sync failed", error);
      });
    }
    const resultData = action === "saveQuotation" ? withRequestedQuotationNo(result.data, body.payload) : result.data;
    const enrichedData = result.ok && (action === "listQuotations" || action === "getQuotation" || action === "saveQuotation")
      ? await enrichQuotationExtraFields(resultData)
      : resultData;
    return NextResponse.json(result.ok ? { ...result, data: enrichedData } : result, { status: response.ok ? 200 : response.status });
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
