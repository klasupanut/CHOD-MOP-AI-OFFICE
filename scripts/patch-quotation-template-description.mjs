import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const indexPath = path.join(projectRoot, "quotation-app-dist", "index.html");

const indexHtml = fs.readFileSync(indexPath, "utf8");
const assetMatch = indexHtml.match(/\/assets\/(index-[A-Za-z0-9_-]+\.js)/);
if (!assetMatch) {
  throw new Error("Active quotation JavaScript asset was not found.");
}

const assetPath = path.join(
  projectRoot,
  "quotation-app-dist",
  "assets",
  assetMatch[1],
);
let bundle = fs.readFileSync(assetPath, "utf8");

// Some legacy template rows legitimately have an empty Description cell.
// Inserting those rows must still create a useful work-item description, so
// Category is the safe fallback. No live Sheet row is mutated by this patch.
const oldInsertion = 'description:(m==null?void 0:m.description)??""';
const newInsertion =
  'description:String((m==null?void 0:m.description)||(m==null?void 0:m.category)||"").trim()';
if (bundle.includes(oldInsertion)) {
  bundle = bundle.replace(oldInsertion, newInsertion);
} else if (!bundle.includes(newInsertion)) {
  throw new Error("Template insertion signature changed; patch was not applied.");
}

// Normalize future saves so an empty Description does not keep producing an
// empty work item. The user-entered Description remains authoritative when set.
const oldSave =
  'h=async O=>{v(O.templateId),S(null);try{await u(O),S({type:"success",text:"Saved "+(O.description.trim()||O.category)+" to Google Sheets."})';
const newSave =
  'h=async O=>{const T={...O,category:String(O.category||"").trim(),description:String(O.description||O.category||"").trim(),unit:String(O.unit||"LS").trim()||"LS"};v(O.templateId),S(null);try{await u(T),S({type:"success",text:"Saved "+(T.description||T.category)+" to Google Sheets."})';
if (bundle.includes(oldSave)) {
  bundle = bundle.replace(oldSave, newSave);
} else if (!bundle.includes(newSave)) {
  throw new Error("Template save signature changed; patch was not applied.");
}

// Keep this patch file ASCII-only while preserving the em dash in the bundle.
const oldOption = '[m.category," \u2014 ",m.description]';
const newOption = '[m.category," \u2014 ",m.description||m.category]';
if (bundle.includes(oldOption)) {
  bundle = bundle.replace(oldOption, newOption);
} else if (!bundle.includes(newOption)) {
  throw new Error("Template option signature changed; patch was not applied.");
}

fs.writeFileSync(assetPath, bundle, "utf8");

const cacheVersion = "20260717-template-description-fallback";
const updatedIndex = indexHtml.replace(
  /(\/assets\/index-[A-Za-z0-9_-]+\.js)(?:\?v=[^"']*)?/,
  `$1?v=${cacheVersion}`,
);
fs.writeFileSync(indexPath, updatedIndex, "utf8");

console.log(`Template description patch verified: ${path.basename(assetPath)}`);
