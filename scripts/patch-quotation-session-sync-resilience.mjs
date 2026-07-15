import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const indexPath = path.join(root, "quotation-app-dist", "index.html");
const indexHtml = await readFile(indexPath, "utf8");
const assetMatch = indexHtml.match(/src="\/assets\/(index-[^"]+\.js)(?:\?[^\"]*)?"/);

if (!assetMatch) {
  throw new Error("Active quotation JavaScript asset was not found in quotation-app-dist/index.html.");
}

const assetPath = path.join(root, "quotation-app-dist", "assets", assetMatch[1]);
let source = await readFile(assetPath, "utf8");

function replaceOnce(before, after, label) {
  const count = source.split(before).length - 1;
  if (count !== 1) {
    throw new Error(`${label}: expected exactly one match, found ${count}.`);
  }
  source = source.replace(before, after);
}

if (!source.includes("__chodQuotationSessionExpired")) {
  replaceOnce(
    'Zi="/api/quotations/backend",Le=async(o,f)=>{if(!Zi)throw new Error("Google Apps Script URL is not configured.");const N=await(await fetch(Zi,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify({action:o,payload:f})})).json();if(!N.ok)throw new Error(N.error||"Google Apps Script request failed.");return N.data}',
    'Zi="/api/quotations/backend",Le=async(o,f)=>{if(!Zi)throw new Error("Google Apps Script URL is not configured.");const u=await fetch(Zi,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify({action:o,payload:f})}),N=await u.json().catch(()=>({ok:!1,error:`Request failed (HTTP ${u.status}).`}));if(u.status===401){window.__chodQuotationSessionExpired=!0;throw new Error("SESSION_EXPIRED")}if(u.ok)window.__chodQuotationSessionExpired=!1;if(!N.ok)throw new Error(N.error||"Google Apps Script request failed.");return N.data}',
    "authenticated quotation request helper",
  );

  replaceOnce(
    '.catch(()=>M("Google offline - local cache active"))',
    '.catch(L=>M(L instanceof Error&&L.message==="SESSION_EXPIRED"?"Session expired - sign in again; local quotation cache is safe":"Google connection interrupted - local cache active"))',
    "initial sync error message",
  );

  replaceOnce(
    'if(!(!Ut()||Z.current)){',
    'if(!(!Ut()||Z.current||window.__chodQuotationSessionExpired)){',
    "expired-session polling guard",
  );

  replaceOnce(
    '}catch{M("Google offline - live sync paused")}finally',
    '}catch(L){M(L instanceof Error&&L.message==="SESSION_EXPIRED"?"Session expired - sign in again to resume live sync":"Google connection interrupted - local cache active")}finally',
    "live sync error message",
  );

  replaceOnce(
    'window.setInterval(()=>{oe()},1e4)',
    'window.setInterval(()=>{oe()},6e4)',
    "live sync interval",
  );

  replaceOnce(
    '}catch{M("Saved locally - Google sync pending")}return $',
    '}catch(L){M(L instanceof Error&&L.message==="SESSION_EXPIRED"?"Saved locally - session expired; sign in again to sync":"Saved locally - Google sync pending")}return $',
    "save sync error message",
  );
}

await writeFile(assetPath, source, "utf8");

const nextIndexHtml = indexHtml.replace(
  /src="\/assets\/(index-[^"]+\.js)(?:\?[^\"]*)?"/,
  `src="/assets/$1?v=20260715-session-sync-resilience"`,
);
await writeFile(indexPath, nextIndexHtml, "utf8");

console.log(`Patched quotation session/sync resilience in ${path.basename(assetPath)}.`);
