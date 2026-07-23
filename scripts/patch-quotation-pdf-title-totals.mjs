import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const bundlePath = resolve(
  process.cwd(),
  "quotation-app-dist/assets/index-Bvr2xpFw.js",
);

const before =
  'S.itemType==="title"?i.jsx("tr",{"data-testid":`quotation-title-row-${j}`,className:"bg-slate-100 font-bold text-navy",children:i.jsx("td",{colSpan:5,className:"border border-slate-400 px-2 py-2.5 text-left",children:S.description||"Untitled work category"})},S.itemId)';

const after =
  'S.itemType==="title"?i.jsxs("tr",{"data-testid":`quotation-title-row-${j}`,className:"bg-slate-100 font-bold text-navy",children:[i.jsx("td",{colSpan:4,className:"border border-slate-400 px-2 py-2.5 text-left",children:S.description||"Untitled work category"}),i.jsx("td",{"data-testid":`quotation-title-total-${j}`,className:"border border-slate-400 px-2 py-2.5 text-right",children:me(o.items.reduce((h,x)=>x.itemType!=="title"&&x.parentTitleId===S.itemId?h+(Number(x.quotationTotal)||0):h,0))})]},S.itemId)';

const bundle = await readFile(bundlePath, "utf8");

if (bundle.includes(after)) {
  console.log("Quotation PDF title totals are already patched.");
  process.exit(0);
}

if (!bundle.includes(before)) {
  throw new Error("Quotation PDF title row signature was not found.");
}

await writeFile(bundlePath, bundle.replace(before, after), "utf8");
console.log("Patched quotation PDF title totals.");

