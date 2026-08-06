import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bundlePath = path.join(root, "quotation-app-dist", "assets", "index-HmUxnN6T.js");
const indexPath = path.join(root, "quotation-app-dist", "index.html");

const replaceOnce = (source, before, after, label) => {
  const matches = source.split(before).length - 1;
  if (matches !== 1) {
    throw new Error(`${label}: expected exactly one target, found ${matches}`);
  }
  return source.replace(before, after);
};

let bundle = fs.readFileSync(bundlePath, "utf8");

bundle = replaceOnce(
  bundle,
  'i.jsxs("tr",{children:[i.jsx("td",{colSpan:3,className:"border border-transparent"}),i.jsx("td",{className:"border border-slate-300 px-2 py-1.5 text-right text-[11px]",children:"SUB TOTAL"})',
  'i.jsxs("tr",{children:[i.jsx("td",{colSpan:2,className:"border border-transparent"}),i.jsx("td",{colSpan:2,className:"whitespace-nowrap border border-slate-300 px-2 py-1.5 text-right text-[10px]",children:"SUB TOTAL"})',
  "extend subtotal rule to the quantities column",
);

bundle = replaceOnce(
  bundle,
  'i.jsx("td",{colSpan:3,className:"border border-transparent"}),i.jsx("td",{className:"whitespace-nowrap border border-slate-300 px-2 py-1.5 text-right text-[10px]",children:S})',
  'i.jsx("td",{colSpan:2,className:"border border-transparent"}),i.jsx("td",{colSpan:2,className:"whitespace-nowrap border border-slate-300 px-2 py-1.5 text-right text-[10px]",children:S})',
  "extend summary rules to the quantities column",
);

bundle = replaceOnce(
  bundle,
  'i.jsxs("tr",{className:"font-bold text-navy",children:[i.jsx("td",{colSpan:3,className:"border border-transparent"}),i.jsx("td",{className:"border-y border-slate-700 px-2 py-2 text-right text-[11px]",children:"GRAND TOTAL"})',
  'i.jsxs("tr",{className:"font-bold text-navy",children:[i.jsx("td",{colSpan:2,className:"border border-transparent"}),i.jsx("td",{colSpan:2,className:"whitespace-nowrap border-y border-slate-700 px-2 py-2 text-right text-[11px]",children:"GRAND TOTAL"})',
  "extend grand total rule to the quantities column",
);

bundle = replaceOnce(
  bundle,
  'data-testid":"signature-section",className:"mt-auto grid grid-cols-2 gap-[22mm] pb-[8mm] text-center text-[12px]"',
  'data-testid":"signature-section",className:"mt-auto grid grid-cols-2 gap-[22mm] pb-[8mm] pt-[6mm] text-center text-[12px]"',
  "add breathing room above signature labels",
);

fs.writeFileSync(bundlePath, bundle, "utf8");

let indexHtml = fs.readFileSync(indexPath, "utf8");
indexHtml = indexHtml.replace(
  /index-HmUxnN6T\.js\?v=[^"]+/,
  "index-HmUxnN6T.js?v=20260806-pdf-summary-spacing",
);
fs.writeFileSync(indexPath, indexHtml, "utf8");

console.log("Adjusted quotation PDF summary width and signature spacing.");
