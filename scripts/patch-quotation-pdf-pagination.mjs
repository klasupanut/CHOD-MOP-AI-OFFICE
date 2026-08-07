import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bundlePath = path.join(root, "quotation-app-dist", "assets", "index-HmUxnN6T.js");
const indexPath = path.join(root, "quotation-app-dist", "index.html");

const replaceRange = (source, startMarker, endMarker, replacement, label) => {
  const start = source.indexOf(startMarker);
  if (start < 0) {
    throw new Error(`${label}: start marker was not found`);
  }

  const duplicate = source.indexOf(startMarker, start + startMarker.length);
  if (duplicate >= 0) {
    throw new Error(`${label}: start marker is not unique`);
  }

  const end = source.indexOf(endMarker, start);
  if (end < 0) {
    throw new Error(`${label}: end marker was not found`);
  }

  return source.slice(0, start) + replacement + source.slice(end);
};

const paginationHelpersAndExport = [
  'chodPdfStylePage=o=>(o.removeAttribute("id"),o.setAttribute("data-pdf-page","true"),Object.assign(o.style,{position:"relative",left:"0",top:"0",width:"210mm",height:"297mm",minHeight:"297mm",maxHeight:"297mm",overflow:"hidden",transform:"none",transformOrigin:"top left",boxShadow:"none",margin:"0",zIndex:"0",backgroundColor:"#ffffff"}),o)',
  ',chodPdfClonePage=(o,f,C)=>{const u=chodPdfStylePage(o.cloneNode(!0)),N=u.querySelector("tbody");return N&&N.replaceChildren(...f.map(v=>v.cloneNode(!0)),...C.map(v=>v.cloneNode(!0))),u}',
  ',chodPdfPageFits=o=>o.scrollHeight<=o.clientHeight+2&&(!o.firstElementChild||o.firstElementChild.scrollHeight<=o.clientHeight+2)',
  ',chodPdfBuildPages=(o,f)=>{const C=document.createElement("div");Object.assign(C.style,{position:"fixed",left:"-10000px",top:"0",width:"210mm",height:"auto",zIndex:"-1",pointerEvents:"none",backgroundColor:"#ffffff"}),C.setAttribute("aria-hidden","true"),document.body.appendChild(C);const u=o.querySelector("tbody");if(!u){const h=chodPdfStylePage(o.cloneNode(!0));return C.appendChild(h),{host:C,pages:[h]}}const N=Array.from(u.children),v=Math.min(Math.max(0,Number(f)||0),N.length),x=N.slice(0,v),S=N.slice(v),k=[],h="[data-testid^=quotation-title-row-]";for(let z=0;z<x.length;z+=1){const _=x[z];_.matches(h)&&z+1<x.length&&!x[z+1].matches(h)?(k.push([_,x[z+1]]),z+=1):k.push([_])}const O=[],M=(z,_)=>{const J=chodPdfClonePage(o,z,_);return C.appendChild(J),J},E=(z,_)=>{const J=M(z,_),F=chodPdfPageFits(J);return J.remove(),F};let T=[];for(const z of k){const _=T.concat(z);T.length&&!E(_,[])?(O.push(M(T,[])),T=[...z]):T=_}if(E(T,S))O.push(M(T,S));else{T.length&&O.push(M(T,[]));const z=M([],S);O.push(z)}return O.length||O.push(M([],S)),{host:C,pages:O}}',
  ',chodPdfRenderDocument=async(o,f,C,u)=>{await document.fonts.ready;const{host:N,pages:v}=chodPdfBuildPages(o,Array.isArray(f==null?void 0:f.items)?f.items.length:0);try{await Promise.all(Array.from(N.querySelectorAll("img")).map(h=>h.complete?Promise.resolve():h.decode().catch(()=>{})));const x=new u({orientation:"portrait",unit:"mm",format:"a4",compress:!0});for(let S=0;S<v.length;S+=1){const k=v[S],h=await C(k,{scale:2,useCORS:!0,backgroundColor:"#ffffff",logging:!1,width:k.scrollWidth,height:k.clientHeight,windowWidth:k.scrollWidth,windowHeight:k.clientHeight});S>0&&x.addPage("a4","portrait");const O=h.toDataURL("image/jpeg",.96);x.addImage(O,"JPEG",0,0,210,297,void 0,"FAST"),h.width=1,h.height=1}return x}finally{N.remove()}}',
  ',yp=async(o,f,C={})=>{const[{default:u},{jsPDF:N}]=await Promise.all([Yl(()=>import("./html2canvas.esm-QH1iLAAe.js"),[]),Yl(()=>import("./jspdf.es.min-DEZyPbCd.js").then(oe=>oe.j),[])]),v=await chodPdfRenderDocument(o,f,u,N),x=C.internalVerified?`${dc(chodQuotationReference(f,!0))}*${dc(f.client||"Client")}*${f.date}*INTERNAL_VERIFIED.pdf`:vp(f);if(C.download!==!1&&v.save(x),!Ut())return{filename:x};const S=v.output("datauristring").replace(/^data:application\\/pdf;[^,]*;base64,/,"data:application/pdf;base64,"),k={quotationId:f.quotationId,quotationNo:f.quotationNo,filename:x,dataUrl:S,createdBy:f.preparedBy},h=await(C.internalVerified?Ke.uploadInternalVerifiedPdf(k):Ke.uploadPdf(k));return{filename:x,pdfUrl:h.signedPdfUrl||h.pdfUrl}}',
].join("");

const signedExport = [
  'Bp=async(o,f)=>{const[{default:u},{jsPDF:N}]=await Promise.all([Yl(()=>import("./html2canvas.esm-QH1iLAAe.js"),[]),Yl(()=>import("./jspdf.es.min-DEZyPbCd.js").then(x=>x.j),[])]),v=await chodPdfRenderDocument(o,f,u,N);return{dataUrl:v.output("datauristring").replace(/^data:application\\/pdf;[^,]*;base64,/,"data:application/pdf;base64,"),blob:v.output("blob"),filename:`${hc(chodQuotationReference(f,!0))}-${hc(f.client||"Client")}-${hc(f.date)}-SIGNED.pdf`}}',
].join("");

let bundle = fs.readFileSync(bundlePath, "utf8");

if (!bundle.includes("chodPdfRenderDocument=")) {
  bundle = replaceRange(
    bundle,
    "yp=async(",
    ";function wp(",
    paginationHelpersAndExport,
    "replace standard quotation PDF export with pagination",
  );

  bundle = replaceRange(
    bundle,
    "Bp=async(",
    ",Wp=",
    signedExport,
    "replace customer-signed PDF export with pagination",
  );
} else if (
  bundle.includes("Math.min(k/x.width,297/x.height)") ||
  bundle.includes("Math.min(210/x.width,297/x.height)")
) {
  throw new Error("Pagination helper exists alongside legacy one-page scaling");
}

fs.writeFileSync(bundlePath, bundle, "utf8");

let indexHtml = fs.readFileSync(indexPath, "utf8");
indexHtml = indexHtml.replace(
  /index-HmUxnN6T\.js\?v=[^"]+/,
  "index-HmUxnN6T.js?v=20260807-pdf-pagination",
);
fs.writeFileSync(indexPath, indexHtml, "utf8");

console.log("Added repeated-header A4 pagination to standard and signed quotation PDFs.");
