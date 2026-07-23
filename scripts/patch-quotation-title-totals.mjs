import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const bundlePath = resolve(
  process.cwd(),
  "quotation-app-dist/assets/index-Bvr2xpFw.js",
);

const before =
  'i.jsx("td",{colSpan:8,className:"p-2",children:i.jsx("div",{className:"flex items-center",children:i.jsx("input",{"aria-label":`Work Title ${x+1}`,className:"field-input !h-10 flex-1 font-bold text-navy",value:h.description,placeholder:"Title / Work category",onChange:L=>N(x,"description",L.target.value)})})})';

const after =
  'i.jsx("td",{colSpan:8,className:"p-2",children:i.jsxs("div",{className:"flex flex-wrap items-center gap-3",children:[i.jsx("input",{"aria-label":`Work Title ${x+1}`,className:"field-input !h-10 min-w-56 flex-1 font-bold text-navy",value:h.description,placeholder:"Title / Work category",onChange:L=>N(x,"description",L.target.value)}),i.jsxs("div",{"data-testid":`work-title-total-${x}`,className:"ml-auto flex h-10 min-w-44 items-center justify-between gap-3 rounded-lg border border-blue/25 bg-blue/5 px-3 text-xs font-semibold uppercase tracking-wide text-slate-500",children:[i.jsx("span",{children:"Title Total"}),i.jsx("strong",{className:"text-sm text-blue",children:me(o.items.reduce((L,U)=>U.itemType!=="title"&&U.parentTitleId===h.itemId?L+(Number(U.sellingTotal)||0):L,0))})]})]})})';

const bundle = await readFile(bundlePath, "utf8");

if (bundle.includes(after)) {
  console.log("Quotation title totals are already patched.");
  process.exit(0);
}

if (!bundle.includes(before)) {
  throw new Error("New Quotation title row signature was not found.");
}

await writeFile(bundlePath, bundle.replace(before, after), "utf8");
console.log("Patched New Quotation title totals.");

