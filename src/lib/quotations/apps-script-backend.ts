export type AppsScriptResult = {
  ok: boolean;
  data?: unknown;
  error?: string;
};

export type AppsScriptProbe = {
  configured: boolean;
  reachable: boolean;
  statusCode?: number;
  message: string;
};

const DEFAULT_TIMEOUT_MS = 25_000;

export function getQuotationAppsScriptUrl() {
  return process.env.QUOTATION_APPS_SCRIPT_URL?.trim() || "";
}

function getQuotationInternalApiSecret() {
  return process.env.QUOTATION_APPS_SCRIPT_INTERNAL_SECRET?.trim() || "";
}

export function isSigningAction(action: string) {
  return action === "createSigningLink" || action === "revokeSigningLink";
}

export function formatAppsScriptError(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Unknown Apps Script connection error.";
}

export async function callQuotationAppsScript(action: string, payload: unknown): Promise<{
  response: Response;
  result: AppsScriptResult;
}> {
  const backendUrl = getQuotationAppsScriptUrl();
  if (!backendUrl) {
    throw new Error("QUOTATION_APPS_SCRIPT_URL is not configured.");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const internalApiSecret = getQuotationInternalApiSecret();
    const response = await fetch(backendUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action,
        payload,
        // This secret is sent only by the server. Customer signing actions
        // remain token/OTP protected by Apps Script and never receive it.
        ...(internalApiSecret ? { internalApiSecret } : {}),
      }),
      cache: "no-store",
      signal: controller.signal,
    });

    let result: AppsScriptResult;
    try {
      result = (await response.json()) as AppsScriptResult;
    } catch {
      result = {
        ok: false,
        error: `Apps Script returned non-JSON response (HTTP ${response.status}).`,
      };
    }

    return { response, result };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Auto Quotation Apps Script timed out after ${DEFAULT_TIMEOUT_MS / 1000}s.`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export async function probeQuotationAppsScript(timeoutMs = 10_000): Promise<AppsScriptProbe> {
  const backendUrl = getQuotationAppsScriptUrl();
  if (!backendUrl) {
    return {
      configured: false,
      reachable: false,
      message: "QUOTATION_APPS_SCRIPT_URL is not configured.",
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(backendUrl, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    });

    return {
      configured: true,
      reachable: response.ok,
      statusCode: response.status,
      message: response.ok
        ? `Auto Quotation Apps Script responds HTTP ${response.status}.`
        : `Auto Quotation Apps Script returned HTTP ${response.status}.`,
    };
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "AbortError";
    return {
      configured: true,
      reachable: false,
      message: timedOut
        ? `Auto Quotation Apps Script timed out after ${timeoutMs / 1000}s.`
        : formatAppsScriptError(error),
    };
  } finally {
    clearTimeout(timer);
  }
}
