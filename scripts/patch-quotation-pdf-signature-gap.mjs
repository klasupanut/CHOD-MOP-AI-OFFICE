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
  'data-testid":"signature-section",className:"mt-auto grid grid-cols-2 gap-[22mm] pb-[8mm] pt-[6mm] text-center text-[12px]",children:',
  'data-testid":"signature-section",className:"mt-auto grid grid-cols-2 gap-[22mm] text-center text-[12px]",style:{paddingTop:"8mm",paddingBottom:"4mm"},children:',
  "apply reliable PDF signature spacing",
);
fs.writeFileSync(bundlePath, bundle, "utf8");

let indexHtml = fs.readFileSync(indexPath, "utf8");
indexHtml = indexHtml.replace(
  /index-HmUxnN6T\.js\?v=[^"]+/,
  "index-HmUxnN6T.js?v=20260806-pdf-signature-gap",
);
fs.writeFileSync(indexPath, indexHtml, "utf8");

console.log("Applied reliable spacing between quotation note and signatures.");
