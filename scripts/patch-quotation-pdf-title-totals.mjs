import { readFile, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";

const distPath = resolve(process.cwd(), "quotation-app-dist");
const html = await readFile(resolve(distPath, "index.html"), "utf8");
const activeBundleName = html.match(
  /<script[^>]+src="\/assets\/(index-[^?"/]+\.js)/,
)?.[1];

if (!activeBundleName) {
  throw new Error("Active quotation bundle was not found in index.html.");
}

const bundlePath = resolve(distPath, "assets", activeBundleName);
const before =
  'S.itemType==="title"?i.jsx("tr",{"data-testid":`quotation-title-row-${k}`,className:"bg-slate-100 font-bold text-navy",children:i.jsx("td",{colSpan:5,className:"border border-slate-400 px-2 py-2.5 text-left",children:S.description||"Untitled work category"})},S.itemId)';
const after =
  'S.itemType==="title"?i.jsxs("tr",{"data-testid":`quotation-title-row-${k}`,className:"bg-slate-100 font-bold text-navy",children:[i.jsx("td",{colSpan:4,className:"border border-slate-400 px-2 py-2.5 text-left",children:S.description||"Untitled work category"}),i.jsx("td",{"data-testid":`quotation-title-total-${k}`,className:"border border-slate-400 px-2 py-2.5 text-right",children:me(o.items.reduce((h,x)=>x.itemType!=="title"&&x.parentTitleId===S.itemId?h+(Number(x.quotationTotal)||0):h,0))})]},S.itemId)';

const bundle = await readFile(bundlePath, "utf8");
if (!bundle.includes(after) && !bundle.includes(before)) {
  throw new Error(
    `Quotation PDF title row signature was not found in ${activeBundleName}.`,
  );
}
if (!bundle.includes(after)) {
  await writeFile(bundlePath, bundle.replace(before, after), "utf8");
}

// Remove the earlier patch from the inactive bundle so only the file loaded by
// index.html owns this behavior.
const inactiveBundlePath = resolve(distPath, "assets", "index-Bvr2xpFw.js");
if (basename(inactiveBundlePath) !== activeBundleName) {
  const inactiveBefore =
    'S.itemType==="title"?i.jsx("tr",{"data-testid":`quotation-title-row-${j}`,className:"bg-slate-100 font-bold text-navy",children:i.jsx("td",{colSpan:5,className:"border border-slate-400 px-2 py-2.5 text-left",children:S.description||"Untitled work category"})},S.itemId)';
  const inactiveAfter =
    'S.itemType==="title"?i.jsxs("tr",{"data-testid":`quotation-title-row-${j}`,className:"bg-slate-100 font-bold text-navy",children:[i.jsx("td",{colSpan:4,className:"border border-slate-400 px-2 py-2.5 text-left",children:S.description||"Untitled work category"}),i.jsx("td",{"data-testid":`quotation-title-total-${j}`,className:"border border-slate-400 px-2 py-2.5 text-right",children:me(o.items.reduce((h,x)=>x.itemType!=="title"&&x.parentTitleId===S.itemId?h+(Number(x.quotationTotal)||0):h,0))})]},S.itemId)';
  const inactiveBundle = await readFile(inactiveBundlePath, "utf8");
  if (inactiveBundle.includes(inactiveAfter)) {
    await writeFile(
      inactiveBundlePath,
      inactiveBundle.replace(inactiveAfter, inactiveBefore),
      "utf8",
    );
  }
}

console.log(`Patched quotation PDF title totals in ${activeBundleName}.`);
