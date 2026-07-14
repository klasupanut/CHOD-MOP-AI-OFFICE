from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
JS = ROOT / "quotation-app-dist" / "assets" / "index-HmUxnN6T.js"


def replace_once(source: str, old: str, new: str, label: str) -> str:
    if new in source:
        return source
    count = source.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 match, found {count}")
    return source.replace(old, new, 1)


def main() -> None:
    source = JS.read_text(encoding="utf-8")

    legacy_cancel_helper = 'isQuotationCancelled=o=>["CANCELLED","CANCELED"].includes(String(o.status||o.approvalStatus||"").trim().toUpperCase()),'
    cancel_helper = 'isQuotationCancelled=o=>[o.status,o.approvalStatus,o.internalApprovalStatus].some(f=>["CANCELLED","CANCELED"].includes(String(f||"").trim().toUpperCase())),'
    if legacy_cancel_helper in source:
        source = source.replace(legacy_cancel_helper, cancel_helper, 1)
    elif cancel_helper not in source:
        source = replace_once(
            source,
            '},quotationWorkType=o=>{const f=String(o.projectType||o.quotationNo||o.subject||"").toUpperCase();',
            f'}},{cancel_helper}quotationWorkType=o=>{{const f=String(o.projectType||o.quotationNo||o.subject||"").toUpperCase();',
            "cancelled status helper",
        )

    old_api = (
        'internalVerifyQuotation:o=>fetch((window.location.pathname.includes("local-quotation-app")||window.location.pathname.includes("local-quotation"))?"/api/local-quotations/backend":"/api/quotations/backend",'
        '{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"internalVerifyQuotation",payload:o})}).then(async f=>{const u=await f.json();if(!u.ok)throw new Error(u.error||"Internal Verify failed.");return u.data}),' 
        'revokeSigningLink:o=>Le("revokeSigningLink",{quotationId:o})'
    )
    new_api = (
        'internalVerifyQuotation:o=>fetch((window.location.pathname.includes("local-quotation-app")||window.location.pathname.includes("local-quotation"))?"/api/local-quotations/backend":"/api/quotations/backend",'
        '{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"internalVerifyQuotation",payload:o})}).then(async f=>{const u=await f.json();if(!u.ok)throw new Error(u.error||"Internal Verify failed.");return u.data}),' 
        'setQuotationCancelled:o=>fetch("/api/quotations/backend",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"setQuotationCancelled",payload:o})}).then(async f=>{const u=await f.json();if(!u.ok)throw new Error(u.error||"Unable to update quotation cancellation.");return u.data}),' 
        'revokeSigningLink:o=>Le("revokeSigningLink",{quotationId:o})'
    )
    source = replace_once(source, old_api, new_api, "authenticated cancellation API")

    old_status_options = '["Draft","Sent","Approved","Rejected"].map'
    new_status_options = '["Draft","Sent","Approved","Rejected","Cancelled"].map'
    if new_status_options not in source:
        count = source.count(old_status_options)
        if count != 2:
            raise SystemExit(f"status options: expected 2 matches, found {count}")
        source = source.replace(old_status_options, new_status_options)

    source = replace_once(
        source,
        'function fc(o){return o.approvalStatus||o.internalApprovalStatus||o.status||"Waiting Approval"}',
        'function fc(o){return isQuotationCancelled(o)?"Cancelled":o.approvalStatus||o.internalApprovalStatus||o.status||"Waiting Approval"}',
        "quotation list cancelled label",
    )
    source = replace_once(
        source,
        'function Rp(o){return o==="Approved"?"bg-green-50 text-green-700":o==="Rejected"||o==="Revision Required"?"bg-red-50 text-red-700":o==="Waiting Final Approval"?"bg-orange-50 text-orange":"bg-slate-100 text-slate-600"}',
        'function Rp(o){return o==="Approved"?"bg-green-50 text-green-700":o==="Cancelled"||o==="Rejected"||o==="Revision Required"?"bg-red-50 text-red-700":o==="Waiting Final Approval"?"bg-orange-50 text-orange":"bg-slate-100 text-slate-600"}',
        "cancelled status tone",
    )

    source = replace_once(
        source,
        'function Lp({quotations:o,onOpen:f,onDuplicate:u,onDelete:N,onCreateSigningLink:v,onRevokeSigningLink:x,onInternalVerify:y})',
        'function Lp({quotations:o,onOpen:f,onDuplicate:u,onDelete:N,onCreateSigningLink:v,onRevokeSigningLink:x,onInternalVerify:y,onToggleCancelled:w})',
        "quotation list cancellation callback",
    )
    source = replace_once(
        source,
        'o.map(h=>i.jsxs("tr",{className:"border-t border-slate-100 hover:bg-slate-50",children:',
        'o.map(h=>i.jsxs("tr",{className:`border-t border-slate-100 ${isQuotationCancelled(h)?"bg-red-50 opacity-70":"hover:bg-slate-50"}`,children:',
        "cancelled quotation row styling",
    )

    old_delete = (
        'i.jsx("button",{title:"Delete",className:"rounded p-2 text-slate-500 hover:bg-red-50 hover:text-red-500",'
        'onClick:()=>{confirm(`Delete ${h.quotationNo}? Related Sheet records, PDFs and client signature files will also be removed.`)&&N(h.quotationId)},'
        'children:i.jsx(Kl,{size:15})})'
    )
    cancel_toggle = (
        'i.jsx("button",{"data-testid":`cancel-toggle-${h.quotationId}`,type:"button",'
        '"aria-label":isQuotationCancelled(h)?"Restore cancelled quotation as Draft":"Cancel quotation",'
        '"aria-pressed":isQuotationCancelled(h),title:isQuotationCancelled(h)?"Restore as Draft (approval required again)":"Cancel and exclude from Total Quoted Value",'
        'disabled:S===h.quotationId,className:"shrink-0 disabled:cursor-not-allowed disabled:opacity-30",'
        'style:{width:34,height:20,borderRadius:9999,backgroundColor:isQuotationCancelled(h)?"#dc2626":"#cbd5e1",position:"relative",transition:"background-color .18s ease"},'
        'onClick:()=>m(h.quotationId,()=>w(h)),children:i.jsx("span",{style:{position:"absolute",top:2,left:2,width:16,height:16,borderRadius:9999,backgroundColor:"#fff",boxShadow:"0 1px 3px rgba(15,23,42,.3)",transform:isQuotationCancelled(h)?"translateX(14px)":"translateX(0)",transition:"transform .18s ease"}})}),'
        + old_delete
    )
    source = replace_once(source, old_delete, cancel_toggle, "cancel action toggle")

    source = replace_once(
        source,
        'onRevokeSigningLink:o.onRevokeSigningLink,onInternalVerify:o.onInternalVerify})',
        'onRevokeSigningLink:o.onRevokeSigningLink,onInternalVerify:o.onInternalVerify,onToggleCancelled:o.onToggleCancelled})',
        "forward cancellation callback through filtered list",
    )

    old_handler_anchor = 'M("Deleted locally - Google sync pending")}},[]),Pe=V.useCallback(async L=>'
    new_handler_anchor = (
        'M("Deleted locally - Google sync pending")}},[]),'
        'toggleQuotationCancelled=V.useCallback(async L=>{const $=isQuotationCancelled(L),G=$?"Draft":"Cancelled";'
        'if(!confirm($?`Restore ${L.quotationNo} as Draft? Internal approval will be required again.`:`Cancel ${L.quotationNo}? Its price will be excluded from Total Quoted Value.`))return;'
        'try{const F=await Ke.setQuotationCancelled({quotationId:L.quotationId,quotationNo:L.quotationNo,cancelled:!$}),U=It({...L,...F,status:F.status||G,approvalStatus:F.approvalStatus||G,updatedAt:F.updatedAt||Ar()});'
        'h(C=>{const b=C.map(A=>A.quotationId===L.quotationId?U:A);return pe.setQuotations(b),b}),z(C=>C.quotationId===L.quotationId?U:C),'
        'M($?"Restored as Draft - internal approval required":"Cancelled - excluded from Total Quoted Value")}catch(F){alert(F instanceof Error?F.message:"Unable to update quotation cancellation.")}},[]),'
        'Pe=V.useCallback(async L=>'
    )
    source = replace_once(source, old_handler_anchor, new_handler_anchor, "cancellation state handler")
    source = replace_once(
        source,
        'onRevokeSigningLink:je,onInternalVerify:Ve,onNew:ee',
        'onRevokeSigningLink:je,onInternalVerify:Ve,onToggleCancelled:toggleQuotationCancelled,onNew:ee',
        "wire cancellation handler",
    )

    old_report_start = (
        'function Fp({quotations:o}){const f=o.filter(E=>E.status==="Draft"),u=Rr(f),N=o.filter(E=>E.status!=="Draft"),'
        'v=Rr(N),x=o.filter(E=>E.status==="Approved"),S=o.filter(isCustomerSigned),k=Rr(S),m=o.filter(E=>E.status==="Approved"&&!isCustomerSigned(E)),'
        'h=Rr(m),O=o.filter(E=>!isCustomerSigned(E)&&E.status!=="Draft"),z=Rr(O),'
    )
    new_report_start = (
        'function Fp({quotations:o}){const qActive=o.filter(E=>!isQuotationCancelled(E)),qCancelled=o.filter(isQuotationCancelled),cancelledTotals=Rr(qCancelled),'
        'f=qActive.filter(E=>E.status==="Draft"),u=Rr(f),N=qActive.filter(E=>E.status!=="Draft"),'
        'v=Rr(N),x=qActive.filter(E=>E.status==="Approved"),S=qActive.filter(isCustomerSigned),k=Rr(S),m=qActive.filter(E=>E.status==="Approved"&&!isCustomerSigned(E)),'
        'h=Rr(m),O=qActive.filter(E=>!isCustomerSigned(E)&&E.status!=="Draft"),z=Rr(O),'
    )
    source = replace_once(source, old_report_start, new_report_start, "exclude cancelled report values")
    source = source.replace(
        "Drafts are excluded. All values exclude VAT.",
        "Drafts and cancelled quotations are excluded. All values exclude VAT.",
        1,
    )
    old_report_note = (
        'children:["Draft pipeline excluded: ",f.length," quotation(s), \u0e3f",me(u.selling),'
        '". Internal approved but not signed: \u0e3f",me(h.selling),"."]'
    )
    new_report_note = (
        'children:["Draft pipeline excluded: ",f.length," quotation(s), \u0e3f",me(u.selling),'
        '". Internal approved but not signed: \u0e3f",me(h.selling),". Cancelled excluded: ",qCancelled.length," quotation(s), \u0e3f",me(cancelledTotals.selling),"."]'
    )
    source = replace_once(source, old_report_note, new_report_note, "cancelled report audit note")
    source = replace_once(
        source,
        'const he=isCustomerSigned(oe);return i.jsxs("tr"',
        'const he=isCustomerSigned(oe)&&!isQuotationCancelled(oe);return i.jsxs("tr"',
        "cancelled report row values",
    )
    source = replace_once(
        source,
        'const $=Rr(m.filter(isCustomerSigned));return{total:m.length',
        'const $=Rr(m.filter(G=>isCustomerSigned(G)&&!isQuotationCancelled(G)));return{total:m.length',
        "exclude cancelled dashboard financials",
    )

    JS.write_text(source, encoding="utf-8")
    print(f"patched {JS}")


if __name__ == "__main__":
    main()
