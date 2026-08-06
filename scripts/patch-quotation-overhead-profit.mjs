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
  'x=[["SUB TOTAL",o.subTotal],[`OVERHEAD ${o.overheadPercent}%`,o.overheadAmount],[`PROFIT ${o.profitPercent}%`,o.profitAmount],["TOTAL AMOUNT",o.totalAmount]',
  'x=[["SUB TOTAL",o.subTotal],["OVERHEAD PROFIT 10%",we(Number(o.overheadAmount||0)+Number(o.profitAmount||0))],["TOTAL AMOUNT",o.totalAmount]',
  "combine overhead and profit summary rows",
);

bundle = replaceOnce(
  bundle,
  'className:m===2||m===4?"font-bold":""',
  'className:m===1||m===3?"font-bold":""',
  "preserve bold total rows after removing one summary row",
);

bundle = replaceOnce(
  bundle,
  'i.jsx("td",{className:"border border-slate-300 px-2 py-1.5 text-right text-[11px]",children:S})',
  'i.jsx("td",{className:"whitespace-nowrap border border-slate-300 px-2 py-1.5 text-right text-[10px]",children:S})',
  "keep summary labels on one line",
);

fs.writeFileSync(bundlePath, bundle, "utf8");

let indexHtml = fs.readFileSync(indexPath, "utf8");
indexHtml = indexHtml.replace(
  /index-HmUxnN6T\.js\?v=[^"]+/,
  "index-HmUxnN6T.js?v=20260806-overhead-profit-10",
);
fs.writeFileSync(indexPath, indexHtml, "utf8");

console.log("Combined quotation overhead/profit display and refreshed asset cache key.");
