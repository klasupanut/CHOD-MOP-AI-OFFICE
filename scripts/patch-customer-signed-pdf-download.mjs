import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const assetsDirectory = path.join(projectRoot, "quotation-app-dist", "assets");
const assetNames = await readdir(assetsDirectory);
const candidateNames = assetNames.filter(
  (name) => name.startsWith("index-") && name.endsWith(".js"),
);

const replacements = [
  {
    before: 'fc=o=>o.trim().replace(/[\\\\/:?"<>|]/g,"-")',
    after: 'fc=o=>o.trim().replace(/[\\\\/:*?"<>|]/g,"-")',
  },
  {
    before:
      ',filename:`${fc(m.quotationNo)}*${fc(m.client||"Client")}*${m.date}*SIGNED.pdf`',
    after:
      ',blob:S.output("blob"),filename:`${fc(m.quotationNo)}-${fc(m.client||"Client")}-${fc(m.date)}-SIGNED.pdf`',
  },
  {
    before: 'q(W.dataUrl),G(W.filename),u("signedSuccess")',
    after:
      'q(URL.createObjectURL(W.blob)),G(W.filename),u("signedSuccess")',
  },
  {
    before:
      'i.jsx("a",{href:D,download:I,className:"mt-6 inline-flex h-11 items-center rounded-lg bg-blue px-5 text-sm font-semibold text-white",children:"Download signed PDF"})',
    after:
      'i.jsx("button",{type:"button",onClick:()=>{if(!D){le("Signed PDF is not ready. Please try signing again.");return}const A=document.createElement("a");A.href=D,A.download=I||"signed-quotation.pdf",A.rel="noopener",document.body.appendChild(A),A.click(),A.remove()},className:"mt-6 inline-flex h-11 items-center rounded-lg bg-blue px-5 text-sm font-semibold text-white",children:"Download signed PDF"})',
  },
];

let patchedBundle = "";

for (const name of candidateNames) {
  const filePath = path.join(assetsDirectory, name);
  let source = await readFile(filePath, "utf8");
  if (!source.includes("Quotation signed successfully")) continue;

  let changed = false;
  for (const { before, after } of replacements) {
    if (source.includes(before)) {
      source = source.replace(before, after);
      changed = true;
      continue;
    }
    if (!source.includes(after)) {
      throw new Error(`Expected signed-PDF marker was not found in ${name}.`);
    }
  }

  if (changed) await writeFile(filePath, source, "utf8");
  patchedBundle = name;
  break;
}

if (!patchedBundle) {
  throw new Error("Could not find the active quotation bundle.");
}

console.log(`Customer signed-PDF download patch verified in ${patchedBundle}.`);
