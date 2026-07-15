import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const assetsDirectory = path.join(projectRoot, "quotation-app-dist", "assets");
const indexPath = path.join(projectRoot, "quotation-app-dist", "index.html");
const indexHtml = await readFile(indexPath, "utf8");
const activeAsset = indexHtml.match(/<script[^>]+src="\/assets\/(index-[^"?]+\.js)/)?.[1];

if (!activeAsset) {
  throw new Error("Unable to identify the active quotation JavaScript asset.");
}

const replacements = [
  {
    before: 'hc=o=>o.trim().replace(/[\\\\/:?"<>|]/g,"-")',
    after: 'hc=o=>o.trim().replace(/[\\\\/:*?"<>|]/g,"-")',
  },
  {
    before:
      ',filename:`${hc(f.quotationNo)}*${hc(f.client||"Client")}*${f.date}*SIGNED.pdf`',
    after:
      ',blob:S.output("blob"),filename:`${hc(f.quotationNo)}-${hc(f.client||"Client")}-${hc(f.date)}-SIGNED.pdf`',
  },
  {
    before: 'J(L.dataUrl),Z(L.filename),u("signedSuccess")',
    after:
      'J(URL.createObjectURL(L.blob)),Z(L.filename),u("signedSuccess")',
  },
  {
    before:
      'i.jsx("a",{href:M,download:E,className:"mt-6 inline-flex h-11 items-center rounded-lg bg-blue px-5 text-sm font-semibold text-white",children:"Download signed PDF"})',
    after:
      'i.jsx("button",{type:"button",onClick:()=>{if(!M){le("Signed PDF is not ready. Please try signing again.");return}const A=document.createElement("a");A.href=M,A.download=E||"signed-quotation.pdf",A.rel="noopener",document.body.appendChild(A),A.click(),A.remove()},className:"mt-6 inline-flex h-11 items-center rounded-lg bg-blue px-5 text-sm font-semibold text-white",children:"Download signed PDF"})',
  },
];

const filePath = path.join(assetsDirectory, activeAsset);
let source = await readFile(filePath, "utf8");
if (!source.includes("Quotation signed successfully")) {
  throw new Error(`The active asset ${activeAsset} does not contain customer signing.`);
}

let changed = false;
for (const { before, after } of replacements) {
  if (source.includes(before)) {
    source = source.replace(before, after);
    changed = true;
    continue;
  }
  if (!source.includes(after)) {
    throw new Error(`Expected signed-PDF marker was not found in ${activeAsset}.`);
  }
}

if (changed) await writeFile(filePath, source, "utf8");

console.log(`Customer signed-PDF download patch verified in ${activeAsset}.`);
