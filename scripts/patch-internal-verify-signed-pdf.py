from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
BUNDLE = ROOT / "quotation-app-dist" / "assets" / "index-HmUxnN6T.js"
INDEX = ROOT / "quotation-app-dist" / "index.html"


def replace_once(source: str, old: str, new: str, label: str) -> str:
    count = source.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 occurrence, found {count}")
    return source.replace(old, new, 1)


def main() -> None:
    source = BUNDLE.read_text("utf-8")

    source = replace_once(
        source,
        'internalVerifyQuotation:o=>fetch("/api/quotations/backend",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"internalVerifyQuotation",payload:o})})',
        'internalVerifyQuotation:o=>fetch((window.location.pathname.includes("local-quotation-app")||window.location.pathname.includes("local-quotation"))?"/api/local-quotations/backend":"/api/quotations/backend",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"internalVerifyQuotation",payload:o})})',
        "internal verify backend route",
    )

    source = replace_once(
        source,
        "yp=async(o,f)=>{",
        "yp=async(o,f,C={})=>{",
        "pdf export signature",
    )

    source = replace_once(
        source,
        'const J=vp(f);if(S.save(J),!Ut())return{filename:J};',
        'const J=C.internalVerified?`${dc(f.quotationNo)}*${dc(f.client||"Client")}*${f.date}*INTERNAL_VERIFIED.pdf`:vp(f);if(C.download!==!1&&S.save(J),!Ut())return{filename:J};',
        "pdf export internal filename/download switch",
    )

    old_start = source.index("Ve=V.useCallback(async L=>{if(!confirm(`Mark ${L.quotationNo} as internally verified")
    old_end = source.index(",De=V.useCallback((L,$)=>", old_start)
    old_handler = source[old_start:old_end]
    new_handler = (
        'Ve=V.useCallback(async L=>{'
        'if(!confirm(`Mark ${L.quotationNo} as internally verified from hard-copy client signature and save the sealed PDF to Google Drive?`))return;'
        "let $=null,G=null;"
        "try{"
        "const F=new Date().toISOString(),"
        'U={signingStatus:"INTERNAL_VERIFIED",clientSigningStatus:"INTERNAL_VERIFIED",signedAt:F,signedByName:"Internal Verification",internalVerifiedAt:F,signingTokenStatus:"INTERNAL_VERIFIED"},'
        'D=S.find(te=>te.signaturePngUrl===L.signatureUrl||te.name.trim().toLowerCase()===String(L.preparedBy||"").trim().toLowerCase());'
        'if(!L.signatureUrl&&!D)throw new Error("Select a saved Quoter & Signature before Internal Verify.");'
        'const C=It({...L,...U,signatureUrl:L.signatureUrl||((D==null?void 0:D.signaturePngUrl)||""),updatedAt:F}),'
        'b=document.createElement("div");'
        'Object.assign(b.style,{position:"fixed",left:"-10000px",top:"0",width:"210mm",zIndex:"-1",pointerEvents:"none"}),'
        "document.body.appendChild(b);"
        "const A=V.createRef();"
        "$=Mf.createRoot(b),G=b,$.render(i.jsx(lo,{ref:A,quotation:C,settings:u})),"
        "await new Promise(g=>requestAnimationFrame(()=>g())),"
        "await new Promise(g=>requestAnimationFrame(()=>g()));"
        'if(!A.current)throw new Error("Internal verified preview is not ready.");'
        "const g=await yp(A.current,C,{download:!1,internalVerified:!0}),"
        'P=await Ke.internalVerifyQuotation({quotationId:L.quotationId,quotationNo:L.quotationNo,signedPdfUrl:g.pdfUrl||"",signedPdfFilename:g.filename||""}),'
        "re=P.signedAt||F,"
        'ne={...U,signedAt:re,internalVerifiedAt:re,signedPdfUrl:P.signedPdfUrl||g.pdfUrl||"",signedPdfFilename:P.signedPdfFilename||g.filename||"",pdfUrl:L.pdfUrl||g.pdfUrl||"",updatedAt:re};'
        "h(Y=>{const te=Y.map(se=>se.quotationId===L.quotationId?It({...se,...ne}):se);return pe.setQuotations(te),te}),"
        "z(Y=>Y.quotationId===L.quotationId?It({...Y,...ne}):Y),"
        'M("Internal verification PDF saved to Google Drive")'
        '}catch(F){alert(F instanceof Error?F.message:"Unable to record Internal Verify.")}'
        'finally{try{$&&$.unmount()}catch{}G&&G.remove()}'
        "},[u,S])"
    )
    source = source[:old_start] + new_handler + source[old_end:]

    BUNDLE.write_text(source, "utf-8", newline="")

    index = INDEX.read_text("utf-8")
    index = index.replace(
        "/assets/index-HmUxnN6T.js?v=20260703-encoding-fix",
        "/assets/index-HmUxnN6T.js?v=20260703-internal-verify-pdf",
    )
    if "20260703-internal-verify-pdf" not in index:
        index = index.replace(
            "/assets/index-HmUxnN6T.js",
            "/assets/index-HmUxnN6T.js?v=20260703-internal-verify-pdf",
        )
    INDEX.write_text(index, "utf-8", newline="")

    print("patched internal verification signed PDF flow")


if __name__ == "__main__":
    main()
