import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  isConditionalRestorationTitle,
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
  assert.match(indexHtml, /index-HmUxnN6T\.js\?v=20260810-restoration-revenue-chart/);
});

test("Value Comparison adds RESTORATION WORK last without adding a score card or donut segment", () => {
  const bundle = fs.readFileSync(path.join(root, "quotation-app-dist/assets/index-HmUxnN6T.js"), "utf8");
  const reportStart = bundle.indexOf("function Fp({quotations:o})");
  const reportEnd = bundle.indexOf("function Qp(", reportStart);
  const report = bundle.slice(reportStart, reportEnd);
  const scoreCardsStart = report.indexOf('className:"mt-6 grid grid-cols-4');
  const scoreCardsEnd = report.indexOf('className:"mt-2 text-right', scoreCardsStart);
  const scoreCards = report.slice(scoreCardsStart, scoreCardsEnd);

  assert.match(report, /chodRestorationWorkValue=Rr\(qActive\)\.conditionalSelling/);
  assert.match(report, /chodValueComparisonRows=\[\.\.\.J,\{status:"RESTORATION WORK \(Excluded\)"/);
  assert.match(report, /data-testid":"status-bar-chart"[^]*children:chodValueComparisonRows\.map/);
  assert.match(report, /data-testid":"status-donut-chart"[^]*children:J\.map/);
  assert.doesNotMatch(scoreCards, /RESTORATION WORK/);
});
