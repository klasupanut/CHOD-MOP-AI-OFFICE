from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BUNDLE = ROOT / "quotation-app-dist" / "assets" / "index-Bvr2xpFw.js"

source = BUNDLE.read_text(encoding="utf-8")

start = source.find("const kt=o=>")
end = source.find(",Ep=[", start)
if start == -1 or end == -1:
    raise SystemExit("Could not locate quotation numbering block.")

new_numbering_block = (
    'const kt=o=>`${o}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`,'
    'Qc=o=>{const m=String(o||"").toUpperCase();return m.includes("RESTORATION")||m.includes("CHOD-RN")||m==="RN"?"RN":"FO"},'
    'Rc=o=>`CHOD-${Qc(o)}`,'
    'Pp=(o,m,u)=>{const N=new Date(m).getFullYear(),y=String(N).slice(-2),p=Qc(u||o),S=Rc(p),j=String(o||"");'
    'if(j.match(new RegExp(`^${S}-${y}-(\\\\d{3})$`)))return j;'
    'const h=j.match(new RegExp(`^CHOD-(FO|RN)-${y}-(\\\\d{3})$`));if(h)return`CHOD-${p}-${y}-${String(Number(h[2])).padStart(3,"0")}`;'
    'const x=j.match(new RegExp(`^(?:CHOD-FO|CHOD-FITOUT)-${N}-(\\\\d{4})$`));return x&&p==="FO"?`CHOD-FO-${y}-${String(Number(x[1])).padStart(3,"0")}`:j},'
    'Nc=(o,m=[],u="FIT-OUT")=>{const N=String(o).slice(-2),y=Qc(u),p=[new RegExp(`^CHOD-${y}-${N}-(\\\\d{3})$`)];'
    'y==="FO"&&p.push(new RegExp(`^(?:CHOD-FO|CHOD-FITOUT)-${o}-(\\\\d{4})$`));'
    'const S=m.reduce((j,h)=>{const x=String(h||""),L=p.map(U=>x.match(U)).find(Boolean);return L?Math.max(j,Number(L[1])):j},0);'
    'return`CHOD-${y}-${N}-${String(S+1).padStart(3,"0")}`},'
    'Lr=o=>{const m=new Map,u=new Map;return[...o].sort((N,y)=>{const p=String(N.date).localeCompare(String(y.date));return p!==0?p:String(N.createdAt).localeCompare(String(y.createdAt))||N.quotationId.localeCompare(y.quotationId)}).forEach(N=>{const y=new Date(N.date).getFullYear(),p=Qc(N.projectType||N.quotationNo),S=`${y}-${p}`,j=(m.get(S)||0)+1;m.set(S,j),u.set(N.quotationId,`CHOD-${p}-${String(y).slice(-2)}-${String(j).padStart(3,"0")}`)}),o.map(N=>({...N,quotationNo:u.get(N.quotationId)||N.quotationNo}))}'
)
source = source[:start] + new_numbering_block + source[end:]

source = source.replace(
    "quotationNo:Pp(o.quotationNo,o.date)",
    "quotationNo:Pp(o.quotationNo,o.date,o.projectType)",
)
source = source.replace(
    "quotationNo:Nc(new Date(N).getFullYear(),m.map(S=>S.quotationNo))",
    'quotationNo:Nc(new Date(N).getFullYear(),m.map(S=>S.quotationNo),"FIT-OUT")',
)
source = source.replace(
    "quotationNo:Nc(new Date(F).getFullYear(),h.map(se=>se.quotationNo))",
    "quotationNo:Nc(new Date(F).getFullYear(),h.map(se=>se.quotationNo),B.projectType)",
)
source = source.replace(
    "onChange:B=>U(Ut(B))",
    "onChange:B=>U(Ut(B.projectType!==L.projectType?{...B,quotationNo:Nc(new Date(B.date||Xl()).getFullYear(),h.map(A=>A.quotationNo),B.projectType)}:B))",
    1,
)

BUNDLE.write_text(source, encoding="utf-8")
print(f"Patched {BUNDLE}")
