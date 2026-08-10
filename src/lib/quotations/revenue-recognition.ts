export type QuotationRevenueItem = {
  itemId?: unknown;
  itemType?: unknown;
  parentTitleId?: unknown;
  description?: unknown;
  quantity?: unknown;
  contractorUnitCost?: unknown;
  contractorTotalCost?: unknown;
  quotationTotal?: unknown;
  projectSellingTotal?: unknown;
  sellingTotal?: unknown;
};

export type QuotationRevenueInput = {
  items?: QuotationRevenueItem[];
  totalSellingAmount?: unknown;
  totalAfterDiscount?: unknown;
  totalAmount?: unknown;
  totalContractorCost?: unknown;
};

export type QuotationValueComparisonInput = QuotationRevenueInput & {
  status?: unknown;
  approvalStatus?: unknown;
  internalApprovalStatus?: unknown;
  signingStatus?: unknown;
  clientSigningStatus?: unknown;
  signedPdfUrl?: unknown;
  internalVerifiedAt?: unknown;
};

export type QuotationRevenueBreakdown = {
  hasConditionalRestoration: boolean;
  recognizedRevenue: number;
  conditionalRestorationRevenue: number;
  recognizedContractorCost: number;
  conditionalRestorationCost: number;
  recognizedProfit: number;
  conditionalRestorationProfit: number;
  recognizedRatio: number;
};

export type QuotationValueComparison = {
  quotationCount: number;
  customerApprovedCount: number;
  totalQuotedValue: number;
  customerApprovedValue: number;
  restorationWorkValue: number;
};

function finiteNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function firstFinite(...values: unknown[]) {
  for (const value of values) {
    const parsed = finiteNumber(value);
    if (parsed !== undefined) return parsed;
  }
  return 0;
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function normalizedTitle(value: unknown) {
  return String(value ?? "")
    .normalize("NFKC")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * RESTORATION WORK is a conditional move-out scope, not earned revenue.
 * This deliberately checks the quotation title only; a quotation whose
 * project type is Restoration remains ordinary recognized work.
 */
export function isConditionalRestorationTitle(value: unknown) {
  const title = normalizedTitle(value);
  return title === "RESTORATION WORK" || title === "RESTORATION WORKS";
}

function normalizedStatus(value: unknown) {
  return String(value ?? "").trim().toUpperCase().replace(/[\s-]+/g, "_");
}

export function isCancelledQuotation(input: QuotationValueComparisonInput) {
  return [input.status, input.approvalStatus, input.internalApprovalStatus]
    .some((value) => ["CANCELLED", "CANCELED"].includes(normalizedStatus(value)));
}

export function isInternallyApprovedQuotation(input: QuotationValueComparisonInput) {
  return [input.status, input.approvalStatus, input.internalApprovalStatus]
    .some((value) => ["APPROVED", "INTERNAL_APPROVED", "INTERNALLY_APPROVED"].includes(normalizedStatus(value)));
}

export function isCustomerSignedQuotation(input: QuotationValueComparisonInput) {
  const signingStatuses = [input.signingStatus, input.clientSigningStatus].map(normalizedStatus);
  return Boolean(String(input.signedPdfUrl ?? "").trim())
    || signingStatuses.some((status) => status === "SIGNED" || status === "INTERNAL_VERIFIED")
    || Boolean(String(input.internalVerifiedAt ?? "").trim());
}

function isTitleItem(item: QuotationRevenueItem) {
  return String(item.itemType ?? "").trim().toLowerCase() === "title";
}

function itemRevenueWeight(item: QuotationRevenueItem) {
  return Math.max(0, firstFinite(item.projectSellingTotal, item.quotationTotal, item.sellingTotal));
}

function itemContractorCost(item: QuotationRevenueItem) {
  const explicitTotal = finiteNumber(item.contractorTotalCost);
  if (explicitTotal !== undefined) return Math.max(0, explicitTotal);
  return Math.max(0, firstFinite(item.quantity) * firstFinite(item.contractorUnitCost));
}

/**
 * Calculate the financial amount that can be recognized without mutating the
 * quotation. Quote-wide overhead, profit and discount are allocated by each
 * item's selling-weight ratio, preserving the document total while excluding
 * only the conditional RESTORATION WORK category from analytics.
 */
export function quotationRevenueBreakdown(input: QuotationRevenueInput): QuotationRevenueBreakdown {
  const items = Array.isArray(input.items) ? input.items : [];
  const conditionalTitleIds = new Set(
    items
      .filter((item) => isTitleItem(item) && isConditionalRestorationTitle(item.description))
      .map((item) => String(item.itemId ?? "").trim())
      .filter(Boolean),
  );

  let activeTitleIsConditional = false;
  let hasConditionalRestoration = false;
  let allRevenueWeight = 0;
  let conditionalRevenueWeight = 0;
  let allItemCost = 0;
  let conditionalItemCost = 0;

  for (const item of items) {
    if (isTitleItem(item)) {
      activeTitleIsConditional = isConditionalRestorationTitle(item.description);
      hasConditionalRestoration ||= activeTitleIsConditional;
      continue;
    }

    const revenueWeight = itemRevenueWeight(item);
    const contractorCost = itemContractorCost(item);
    const parentTitleId = String(item.parentTitleId ?? "").trim();
    // Prefer the explicit relationship when present. Sequential title state is
    // only a legacy fallback; combining both can incorrectly classify an item
    // when rows are reordered by Google Sheets.
    const belongsToConditionalTitle = parentTitleId
      ? conditionalTitleIds.has(parentTitleId)
      : activeTitleIsConditional;

    allRevenueWeight += revenueWeight;
    allItemCost += contractorCost;
    if (belongsToConditionalTitle) {
      conditionalRevenueWeight += revenueWeight;
      conditionalItemCost += contractorCost;
    }
  }

  const fullRevenue = Math.max(0, firstFinite(input.totalSellingAmount, input.totalAfterDiscount, input.totalAmount));
  const fullContractorCost = Math.max(0, firstFinite(input.totalContractorCost, allItemCost));
  const revenueExclusionRatio = hasConditionalRestoration && allRevenueWeight > 0
    ? Math.min(1, conditionalRevenueWeight / allRevenueWeight)
    : 0;
  const costExclusionRatio = hasConditionalRestoration && allItemCost > 0
    ? Math.min(1, conditionalItemCost / allItemCost)
    : revenueExclusionRatio;

  const conditionalRestorationRevenue = roundMoney(fullRevenue * revenueExclusionRatio);
  const conditionalRestorationCost = roundMoney(fullContractorCost * costExclusionRatio);
  const recognizedRevenue = roundMoney(Math.max(0, fullRevenue - conditionalRestorationRevenue));
  const recognizedContractorCost = roundMoney(Math.max(0, fullContractorCost - conditionalRestorationCost));
  const recognizedProfit = roundMoney(recognizedRevenue - recognizedContractorCost);
  const conditionalRestorationProfit = roundMoney(conditionalRestorationRevenue - conditionalRestorationCost);

  return {
    hasConditionalRestoration,
    recognizedRevenue,
    conditionalRestorationRevenue,
    recognizedContractorCost,
    conditionalRestorationCost,
    recognizedProfit,
    conditionalRestorationProfit,
    recognizedRatio: fullRevenue > 0 ? recognizedRevenue / fullRevenue : 1,
  };
}

/**
 * Build the three Value Comparison metrics from one identical quotation pool.
 * Draft and cancelled quotations are excluded. Customer Approved is a union,
 * so a quotation that is both internally approved and customer signed is only
 * counted once. RESTORATION WORK means the item title, never the RN project type.
 */
export function quotationValueComparison(
  quotations: QuotationValueComparisonInput[],
): QuotationValueComparison {
  const quoted = quotations.filter((quotation) => (
    !isCancelledQuotation(quotation)
    && normalizedStatus(quotation.status) !== "DRAFT"
  ));
  const customerApproved = quoted.filter((quotation) => (
    isInternallyApprovedQuotation(quotation) || isCustomerSignedQuotation(quotation)
  ));

  const aggregate = (rows: QuotationValueComparisonInput[]) => rows.reduce(
    (total, quotation) => {
      const breakdown = quotationRevenueBreakdown(quotation);
      return {
        recognized: roundMoney(total.recognized + breakdown.recognizedRevenue),
        restoration: roundMoney(total.restoration + breakdown.conditionalRestorationRevenue),
      };
    },
    { recognized: 0, restoration: 0 },
  );

  const quotedTotals = aggregate(quoted);
  const approvedTotals = aggregate(customerApproved);

  return {
    quotationCount: quoted.length,
    customerApprovedCount: customerApproved.length,
    totalQuotedValue: quotedTotals.recognized,
    customerApprovedValue: approvedTotals.recognized,
    restorationWorkValue: quotedTotals.restoration,
  };
}
