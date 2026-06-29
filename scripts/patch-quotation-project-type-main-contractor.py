from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BUNDLE = ROOT / "quotation-app-dist" / "assets" / "index-Bvr2xpFw.js"

source = BUNDLE.read_text(encoding="utf-8")

start = source.find('const vp=["CHOD 1","CHOD 2","CHOD 3","CHOD 5","CHODBIZ KM.8","CHODBIZ SAI 4","CHODBIZ CHAENG"],yp=')
end = source.find("const Np=()=>", start)
if start == -1 or end == -1:
    raise SystemExit("Could not locate quotation header form block.")

new_form_block = (
    'const vp=["CHOD 1","CHOD 2","CHOD 3","CHOD 5","CHODBIZ KM.8","CHODBIZ SAI 4","CHODBIZ CHAENG"],'
    'ProjectTypeOptions=["FIT-OUT","RESTORATION"],'
    'yp=[["date","Date","date"],["client","Client","text"],["subject","Subject","text"],["to","To","text"],["projectSite","Project / Site","select"],["projectType","PROJECT TYPE","projectTypeSelect"],["mainContractor","MAIN CONTRACTOR","text"],["preparedBy","Quoter Name","text"]];'
    'function wp({quotation:o,onChange:m}){return i.jsx("div",{className:"grid grid-cols-2 gap-x-4 gap-y-3 max-sm:grid-cols-1",children:yp.map(([u,N,y])=>i.jsxs("label",{children:[i.jsx("span",{className:"field-label",children:N}),y==="select"?i.jsxs("select",{"aria-label":N,className:"field-input",value:String(o[u]??""),onChange:p=>m({...o,[u]:p.target.value}),children:[i.jsx("option",{value:"",children:"Select Project / Site"}),vp.map(p=>i.jsx("option",{value:p,children:p},p))]}):y==="projectTypeSelect"?i.jsx("select",{"aria-label":N,className:"field-input",value:String(o[u]??"FIT-OUT"),onChange:p=>m({...o,[u]:p.target.value}),children:ProjectTypeOptions.map(p=>i.jsx("option",{value:p,children:p},p))}):i.jsx("input",{type:y,className:"field-input",value:String(o[u]??""),placeholder:N==="Client"?"Client company name":N==="MAIN CONTRACTOR"?"Main contractor name":N,onChange:p=>m({...o,[u]:p.target.value})})]},u))})}'
)
source = source[:start] + new_form_block + source[end:]

source = source.replace(
    'projectSite:"",contractorName:"",preparedBy:""',
    'projectSite:"",projectType:"FIT-OUT",mainContractor:"",contractorName:"",preparedBy:""',
    1,
)

source = source.replace(
    'const n=(a.contractorName||"Unassigned Contractor").trim()||"Unassigned Contractor";',
    'const n=(a.mainContractor||a.contractorName||"Unassigned Contractor").trim()||"Unassigned Contractor";',
)

BUNDLE.write_text(source, encoding="utf-8")
print(f"Patched {BUNDLE}")
