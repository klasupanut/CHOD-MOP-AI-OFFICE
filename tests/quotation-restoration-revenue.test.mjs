import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  isConditionalRestorationTitle,
  quotationValueComparison,
  quotationRevenueBreakdown,
} from "../src/lib/quotations/revenue-recognition.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("RESTORATION WORK title is recognized without excluding Restoration project types", () => {
  assert.equal(isConditionalRestorationTitle(" Restoration Work "), true);
  assert.equal(isConditionalRestorationTitle("RESTORATION WORKS"), true);
  assert.equal(isConditionalRestorationTitle("RESTORATION"), false);

  const ordinaryRestorationQuote = quotationRevenueBreakdown({
    projectType: "RESTORATION",
    totalSellingAmount: 1_100,
    totalContractorCost: 800,
    items: [{ itemType: "item", quotationTotal: 1_000, contractorTotalCost: 800 }],
  });
  assert.equal(ordinaryRestorationQuote.recognizedRevenue, 1_100);
  assert.equal(ordinaryRestorationQuote.hasConditionalRestoration, false);
});

test("conditional RESTORATION WORK is excluded proportionally from revenue, cost and profit", () => {
  const result = quotationRevenueBreakdown({
    totalSellingAmount: 1_100,
    totalContractorCost: 600,
    items: [
      { itemId: "TITLE-1", itemType: "title", description: "GENERAL WORK" },
      { itemType: "item", parentTitleId: "TITLE-1", projectSellingTotal: 800, contractorTotalCost: 500 },
      { itemId: "TITLE-2", itemType: "title", description: "RESTORATION WORK" },
      { itemType: "item", parentTitleId: "TITLE-2", projectSellingTotal: 200, contractorTotalCost: 100 },
    ],
  });

  assert.deepEqual(result, {
    hasConditionalRestoration: true,
    recognizedRevenue: 880,
    conditionalRestorationRevenue: 220,
    recognizedContractorCost: 500,
    conditionalRestorationCost: 100,
    recognizedProfit: 380,
    conditionalRestorationProfit: 120,
    recognizedRatio: 0.8,
  });
});

test("legacy sequential items work when title relationship IDs are absent", () => {
  const result = quotationRevenueBreakdown({
    totalAfterDiscount: 1_000,
    totalContractorCost: 500,
    items: [
      { itemType: "title", description: "General work" },
      { itemType: "item", quotationTotal: 700, contractorTotalCost: 350 },
      { itemType: "title", description: "restoration-work" },
      { itemType: "item", quotationTotal: 300, contractorTotalCost: 150 },
    ],
  });

  assert.equal(result.recognizedRevenue, 700);
  assert.equal(result.conditionalRestorationRevenue, 300);
  assert.equal(result.recognizedContractorCost, 350);
});

test("explicit parent title prevents reordered rows from being classified as RESTORATION WORK", () => {
  const result = quotationRevenueBreakdown({
    totalSellingAmount: 1_000,
    totalContractorCost: 500,
    items: [
      { itemId: "TITLE-GENERAL", itemType: "title", description: "GENERAL WORK" },
      { itemId: "TITLE-RESTORE", itemType: "title", description: "RESTORATION WORK" },
      {
        itemType: "item",
        parentTitleId: "TITLE-GENERAL",
        quotationTotal: 1_000,
        contractorTotalCost: 500,
      },
    ],
  });

  assert.equal(result.conditionalRestorationRevenue, 0);
  assert.equal(result.recognizedRevenue, 1_000);
});

test("Value Comparison keeps signed value separate from internal approval", () => {
  const comparison = quotationValueComparison([
    {
      status: "Approved",
      totalSellingAmount: 1_200,
      items: [
        { itemId: "A", itemType: "title", description: "GENERAL WORK" },
        { itemType: "item", parentTitleId: "A", quotationTotal: 1_000 },
        { itemId: "B", itemType: "title", description: "RESTORATION WORK" },
        { itemType: "item", parentTitleId: "B", quotationTotal: 200 },
      ],
    },
    {
      status: "Sent",
      signingStatus: "SIGNED",
      totalSellingAmount: 500,
      items: [{ itemType: "item", quotationTotal: 500 }],
    },
    {
      status: "Approved",
      signingStatus: "SIGNED",
      totalSellingAmount: 400,
      items: [{ itemType: "item", quotationTotal: 400 }],
    },
    {
      status: "Approved",
      approvalStatus: "Cancelled",
      totalSellingAmount: 1_000,
      items: [
        { itemType: "title", description: "RESTORATION WORK" },
        { itemType: "item", quotationTotal: 1_000 },
      ],
    },
    {
      status: "Draft",
      totalSellingAmount: 600,
      items: [
        { itemType: "title", description: "RESTORATION WORK" },
        { itemType: "item", quotationTotal: 600 },
      ],
    },
    {
      status: "Approved",
      projectType: "RESTORATION",
      totalSellingAmount: 300,
      items: [{ itemType: "item", quotationTotal: 300 }],
    },
  ]);

  assert.deepEqual(comparison, {
    quotationCount: 4,
    customerApprovedCount: 2,
    totalQuotedValue: 2_200,
    customerApprovedValue: 900,
    internalApprovedValue: 1_700,
    waitingCustomerSignatureValue: 1_300,
    restorationWorkValue: 200,
  });
});

test("server dashboards and embedded quotation analytics share the exclusion rule", () => {
  const approvalSource = fs.readFileSync(path.join(root, "src/lib/approvals/quotation-approval-source.ts"), "utf8");
  const dashboardSource = fs.readFileSync(path.join(root, "src/lib/dashboard/live-dashboard-data.ts"), "utf8");
  const sheetSource = fs.readFileSync(path.join(root, "src/lib/quotations/google-sheet-extra-fields.ts"), "utf8");
  const bundle = fs.readFileSync(path.join(root, "quotation-app-dist/assets/index-HmUxnN6T.js"), "utf8");
  const indexHtml = fs.readFileSync(path.join(root, "quotation-app-dist/index.html"), "utf8");

  assert.match(approvalSource, /quotationRevenueBreakdown\(row\)/);
  assert.match(dashboardSource, /approval\.recognizedRevenueAmount/);
  assert.match(sheetSource, /Quotation_Items!A1:Z/);
  assert.match(sheetSource, /parentTitleId:\s*recordString/);
  assert.match(bundle, /chodRestorationTitle/);
  assert.match(bundle, /,le=chodRecognizedQuotation\(oe\)/);
  assert.match(bundle, /conditional RESTORATION WORK categories are excluded/);
  assert.match(indexHtml, /index-HmUxnN6T\.js\?v=20260811-approval-currency-fix/);
});

test("Value Comparison uses signed value and approval comparison uses bars instead of donut", () => {
  const bundle = fs.readFileSync(path.join(root, "quotation-app-dist/assets/index-HmUxnN6T.js"), "utf8");
  const reportStart = bundle.indexOf("function Fp({quotations:o})");
  const reportEnd = bundle.indexOf("function Qp(", reportStart);
  const report = bundle.slice(reportStart, reportEnd);
  const scoreCardsStart = report.indexOf('className:"mt-6 grid grid-cols-4');
  const scoreCardsEnd = report.indexOf('className:"mt-2 text-right', scoreCardsStart);
  const scoreCards = report.slice(scoreCardsStart, scoreCardsEnd);

  assert.match(report, /isInternalApproved=/);
  assert.match(report, /chodRestorationWorkValue=Rr\(N\)\.conditionalSelling/);
  assert.match(report, /chodValueComparisonRows=\[\{status:"Total Quoted Value",value:v\.selling/);
  assert.match(report, /\{status:"Customer Approved",value:k\.selling/);
  assert.match(report, /\{status:"RESTORATION WORK",value:chodRestorationWorkValue/);
  assert.match(report, /approvalComparisonRows=\[\{status:"Internal Approved",value:internalApprovedTotals\.selling/);
  assert.match(report, /\{status:"Customer Signed \/ Internal Verified",value:k\.selling/);
  assert.match(report, /\{status:"Waiting Customer Signature",value:h\.selling/);
  assert.match(report, /data-testid":"status-bar-chart"[^]*children:chodValueComparisonRows\.map/);
  assert.match(report, /data-testid":"approval-status-bar-chart"[^]*children:approvalComparisonRows\.map/);
  assert.match(report, /children:\["\\u0e3f",me\(oe\.value\)\]/);
  assert.doesNotMatch(report, /\u0e40\u0e18\u0e1f/);
  assert.doesNotMatch(report, /data-testid":"status-donut-chart"/);
  assert.match(scoreCards, /\["Actual Work Value \(signed\)",`฿\$\{me\(k\.selling\)\}`/);
  assert.doesNotMatch(scoreCards, /RESTORATION WORK/);
});
