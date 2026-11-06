"use client";
import { ChangeEvent, useEffect, useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import ProviderMfaGate from "../../components/ProviderMfaGate";
import { supabase } from "../../../lib/supabase";

type Card = { card_code: string; qr_url: string; internal_code: string; label: string };
const SIDE = 1417; // 12 cm @ 300 DPI; actual 10 cm export at ~360 DPI
const clean = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64);
function parseCSV(source: string): string[][] {
  // Accept standard CSV, Excel's semicolon-delimited CSV, and TSV.
  const text = source.replace(/^\uFEFF/, "");
  const firstLine = text.split(/\r?\n/, 1)[0] || "";
  const count = (sep: string) => {
    let inQuote = false, found = 0;
    for (let i = 0; i < firstLine.length; i++) {
      if (firstLine[i] === '"') {
        if (inQuote && firstLine[i + 1] === '"') i++;
        else inQuote = !inQuote;
      } else if (!inQuote && firstLine[i] === sep) found++;
    }
    return found;
  };
  const sep = count("\t") > count(",") && count("\t") > count(";") ? "\t"
    : count(";") > count(",") ? ";" : ",";
  const rows: string[][] = []; let row: string[] = [], field = "", quote = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quote && text[i + 1] === '"') { field += '"'; i++; } else quote = !quote;
    } else if (!quote && c === sep) { row.push(field); field = ""; }
    else if (!quote && (c === "\n" || c === "\r")) {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); if (row.some(v => v.trim())) rows.push(row); row = []; field = "";
    } else field += c;
  }
  row.push(field); if (row.some(v => v.trim())) rows.push(row);
  return rows;
}
function getCards(csv: string): Card[] {
  const rows = parseCSV(csv);
  const normalize = (s: string) => s.toLowerCase().trim().replace(/^\uFEFF/, "")
    .replace(/[\s_\-./()]+/g, "").replace(/&/g, "dan");
  const aliases = {
    code: ["card_code", "kode kartu", "kode_kartu", "card code", "kode", "cardcode"],
    url: ["qr_url", "url qr", "url qr/nfc", "qr / nfc url", "urlqrnfc", "qr/nfc url", "qr nfc url", "url kartu", "url nfc", "nfc_url", "link qr", "link kartu", "link"],
    label: ["label", "nama label"],
    internal: ["internal_code", "kode internal", "kode internal / sku", "sku", "internal code"],
  };
  const findColumn = (headers: string[], choices: string[]) =>
    headers.findIndex(h => choices.map(normalize).includes(normalize(h)));
  // Some spreadsheets have a title row before the real header.
  const headerRow = rows.findIndex(r => findColumn(r, aliases.code) >= 0 &&
    findColumn(r, aliases.url) >= 0);
  if (headerRow < 0) {
    throw Error("Kolom kartu tidak ditemukan. CSV perlu kolom 'Kode Kartu' dan 'URL QR/NFC' (atau 'card_code' dan 'qr_url').");
  }
  const head = rows[headerRow];
  const codeCol = findColumn(head, aliases.code);
  const urlCol = findColumn(head, aliases.url);
  const labelCol = findColumn(head, aliases.label);
  const internalCol = findColumn(head, aliases.internal);
  const seen = new Set<string>();
  const cards: Card[] = [];
  for (const r of rows.slice(headerRow + 1)) {
    const card_code = (r[codeCol] || "").trim().toUpperCase();
    const qr_url = (r[urlCol] || "").trim();
    if (!card_code && !qr_url) continue;
    if (!/^ULAS-[A-Z0-9-]+$/.test(card_code)) {
      throw Error("Kode kartu tidak valid pada baris " + (headerRow + cards.length + 2) + ": " + card_code);
    }
    if (seen.has(card_code)) throw Error("Kode kartu duplikat di CSV: " + card_code);
    seen.add(card_code);
    let url: URL;
    try { url = new URL(qr_url); }
    catch { throw Error("URL QR kosong atau tidak valid untuk " + card_code); }
    if (url.protocol !== "https:" || !["yukreview.id", "www.yukreview.id"].includes(url.hostname) ||
        url.username || url.password) {
      throw Error("URL QR harus menggunakan domain yukreview.id untuk " + card_code);
    }
    cards.push({
      card_code,
      qr_url: url.href,
      internal_code: internalCol >= 0 ? (r[internalCol] || "").trim() : "",
      label: labelCol >= 0 ? (r[labelCol] || "").trim() : "",
    });
  }
  return cards;
}
function templateDb():Promise<IDBDatabase>{
 return new Promise((resolve,reject)=>{const q=indexedDB.open("yukreview-print-artworks",1);
 q.onupgradeneeded=()=>{if(!q.result.objectStoreNames.contains("templates"))q.result.createObjectStore("templates");};
 q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error);});
}
async function saveArtwork(slot:number,file:Blob):Promise<void>{
 const db=await templateDb();
 try{await new Promise<void>((resolve,reject)=>{const tx=db.transaction("templates","readwrite");tx.objectStore("templates").put(file,slot);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});}
 finally{db.close();}
}
async function getArtwork(slot:number):Promise<Blob|undefined>{
 const db=await templateDb();
 try{return await new Promise<Blob|undefined>((resolve,reject)=>{const tx=db.transaction("templates","readonly");const q=tx.objectStore("templates").get(slot);q.onsuccess=()=>resolve(q.result as Blob|undefined);q.onerror=()=>reject(q.error);});}
 finally{db.close();}
}
async function imageFromBlob(blob:Blob):Promise<HTMLImageElement>{
 const url=URL.createObjectURL(blob);
 try{const img=new Image();img.src=url;await img.decode();return img;}
 finally{URL.revokeObjectURL(url);}
}
type Design = 0|1|2|3;
type QrStyle = "standard"|"rainbow";
const oppositeDesign: Record<Design, Design> = {0:1,1:0,2:3,3:2};
// A dark-spectrum rainbow preserves scanner contrast on the white QR background.
function rainbowQr(source: HTMLCanvasElement): HTMLCanvasElement {
 const out=document.createElement("canvas");out.width=source.width;out.height=source.height;
 const g=out.getContext("2d");if(!g)throw Error("Canvas QR tidak tersedia");
 g.fillStyle="#ffffff";g.fillRect(0,0,out.width,out.height);
 const mask=document.createElement("canvas");mask.width=out.width;mask.height=out.height;
 const m=mask.getContext("2d");if(!m)throw Error("Mask QR tidak tersedia");
 m.drawImage(source,0,0);
 const pixels=m.getImageData(0,0,mask.width,mask.height);
 for(let i=0;i<pixels.data.length;i+=4){
   const dark=pixels.data[i]<128 && pixels.data[i+1]<128 && pixels.data[i+2]<128;
   pixels.data[i+3]=dark?255:0;
 }
 m.putImageData(pixels,0,0);
 m.globalCompositeOperation="source-in";
 const grad=m.createLinearGradient(0,0,mask.width,mask.height);
 grad.addColorStop(0,"#142b56");grad.addColorStop(.24,"#552176");grad.addColorStop(.5,"#005a65");grad.addColorStop(.75,"#923044");grad.addColorStop(1,"#142b56");
 m.fillStyle=grad;m.fillRect(0,0,mask.width,mask.height);
 g.drawImage(mask,0,0);
 return out;
}
const names=["Navy QR kiri","Navy QR kanan","Putih QR kanan","Putih QR kiri"];
async function renderArtwork(card:Card, artwork:HTMLImageElement, design:Design, p:{x:number;y:number;size:number}, qrStyle:QrStyle):Promise<HTMLCanvasElement>{
 const c=document.createElement("canvas");c.width=SIDE;c.height=SIDE;
 const g=c.getContext("2d");if(!g)throw Error("Canvas gagal");
 g.drawImage(artwork,0,0,SIDE,SIDE);
 const k=SIDE/1254;
 const x=p.x*k,y=p.y*k,w=p.size*k;
 // Remove the old template QR (including irregular white corners and the
 // right-edge strip) before drawing a compact, symmetrical new panel.
 // Reconstruct the local navy background from all four outer boundaries,
 // so shrinking the white border does not expose parts of the old QR.
 // The center "atau" badge and vertical divider are part of the template,
 // not part of the QR placeholder. Keep an untouched center safety zone.
 const qrOnLeft = design === 0 || design === 3;
 const cleanup=70*k;
 const innerMargin=30*k;
 const centerLeftLimit=565*k, centerRightLimit=690*k;
 const left=Math.max(1,Math.floor(qrOnLeft ? x-cleanup : Math.max(x-innerMargin,centerRightLimit)));
 const top=Math.max(1,Math.floor(y-cleanup));
 const right=Math.min(SIDE-2,Math.ceil(qrOnLeft ? Math.min(x+w+innerMargin,centerLeftLimit) : x+w+cleanup));
 const bottom=Math.min(SIDE-2,Math.ceil(y+w+cleanup));
 const ww=right-left, hh=bottom-top;
 const source=g.getImageData(left,top,ww+1,hh+1);
 const repaired=g.createImageData(ww+1,hh+1);
 const src=source.data, out=repaired.data;
 const index=(xx:number,yy:number)=>4*(yy*(ww+1)+xx);
 for(let yy=0;yy<=hh;yy++){
   const v=yy/hh;
   for(let xx=0;xx<=ww;xx++){
     const u=xx/ww;
     const dst=index(xx,yy);
     const tl=index(0,0),tr=index(ww,0),bl=index(0,hh),br=index(ww,hh);
     const l=index(0,yy),r=index(ww,yy),t=index(xx,0),b=index(xx,hh);
     for(let ch=0;ch<3;ch++){
       const horiz=(1-u)*src[l+ch]+u*src[r+ch];
       const vert=(1-v)*src[t+ch]+v*src[b+ch];
       const corners=(1-u)*(1-v)*src[tl+ch]+u*(1-v)*src[tr+ch]+
         (1-u)*v*src[bl+ch]+u*v*src[br+ch];
       out[dst+ch]=Math.max(0,Math.min(255,Math.round(horiz+vert-corners)));
     }
     out[dst+3]=255;
   }
 }
 g.putImageData(repaired,left,top);
 // Tight white card: equal 24-unit padding on every side (~8.6% QR size).
 const panelPadding=24*k;
 const panelSize=w+panelPadding*2;
 const panelX=x-panelPadding,panelY=y-panelPadding;
 g.save();
 g.fillStyle="#ffffff";
 g.beginPath();
 g.roundRect(panelX,panelY,panelSize,panelSize,14*k);
 g.fill();
 g.restore();
 const qr=document.createElement("canvas");
 await QRCode.toCanvas(qr,card.qr_url,{width:900,margin:2,errorCorrectionLevel:"H",color:{dark:"#000000",light:"#ffffff"}});
 g.imageSmoothingEnabled=false;g.drawImage(qrStyle==="rainbow"?rainbowQr(qr):qr,x,y,w,w);g.imageSmoothingEnabled=true;
 return c;
}
async function renderCard(card: Card): Promise<HTMLCanvasElement> {
  const c = document.createElement("canvas"); c.width = SIDE; c.height = SIDE;
  const g = c.getContext("2d"); if (!g) throw Error("Canvas tidak tersedia");
  g.fillStyle = "#ffffff"; g.fillRect(0, 0, SIDE, SIDE);
  // Vector-like geometric layout rasterized at high resolution
  g.fillStyle = "#122c61"; g.fillRect(0, 0, SIDE, 222);
  g.fillStyle = "#e63e46"; g.fillRect(0, 208, SIDE, 14);
  g.textAlign = "center"; g.fillStyle = "#fff"; g.font = "bold 86px Arial, sans-serif"; g.fillText("YukReview", SIDE / 2, 132);
  g.font = "bold 30px Arial, sans-serif"; g.fillStyle = "#dbeafe"; g.fillText("ULASAN JADI PELUANG", SIDE / 2, 185);
  g.fillStyle = "#142b56"; g.font = "bold 65px Arial, sans-serif"; g.fillText("BAGIKAN ULASAN ANDA", SIDE / 2, 322);
  g.font = "36px Arial, sans-serif"; g.fillStyle = "#52627b"; g.fillText("Scan QR atau tap NFC untuk terhubung", SIDE / 2, 380);
  const qr = document.createElement("canvas");
  await QRCode.toCanvas(qr, card.qr_url, { width: 760, margin: 3, errorCorrectionLevel: "H", color: { dark: "#10264d", light: "#ffffff" } });
  g.fillStyle = "#f1f5fa"; g.beginPath(); g.roundRect(302, 426, 814, 814, 32); g.fill();
  g.drawImage(qr, 329, 453, 760, 760);
  g.fillStyle = "#e63e46"; g.fillRect(0, 1272, SIDE, 12);
  g.fillStyle = "#142b56"; g.font = "bold 48px Arial, sans-serif"; g.fillText(card.card_code, SIDE / 2, 1354);
  g.font = "27px Arial, sans-serif"; g.fillStyle = "#52627b"; g.fillText(card.internal_code || "YUKREVIEW NFC + QR", SIDE / 2, 1394);
  return c;
}
function crc32(bytes: Uint8Array): number {
  let crc = -1;
  for (const b of bytes) { crc ^= b; for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0); }
  return (crc ^ -1) >>> 0;
}
function zipFiles(files: { name: string; data: Uint8Array }[]): Blob {
  const chunks: Uint8Array[] = [], directory: Uint8Array[] = [];
  const encoder = new TextEncoder(); let offset = 0;
  const u16 = (v: DataView, i: number, n: number) => v.setUint16(i, n, true);
  const u32 = (v: DataView, i: number, n: number) => v.setUint32(i, n >>> 0, true);
  for (const f of files) {
    const name = encoder.encode(f.name), crc = crc32(f.data);
    const local = new Uint8Array(30 + name.length), v = new DataView(local.buffer);
    u32(v, 0, 0x04034b50); u16(v, 4, 20); u16(v, 8, 0); u32(v, 14, crc);
    u32(v, 18, f.data.length); u32(v, 22, f.data.length); u16(v, 26, name.length); local.set(name, 30);
    chunks.push(local, f.data);
    const entry = new Uint8Array(46 + name.length), e = new DataView(entry.buffer);
    u32(e, 0, 0x02014b50); u16(e, 4, 20); u16(e, 6, 20); u32(e, 16, crc);
    u32(e, 20, f.data.length); u32(e, 24, f.data.length); u16(e, 28, name.length);
    u32(e, 42, offset); entry.set(name, 46); directory.push(entry);
    offset += local.length + f.data.length;
  }
  const centralLength = directory.reduce((n, x) => n + x.length, 0);
  const end = new Uint8Array(22), e = new DataView(end.buffer);
  u32(e, 0, 0x06054b50); u16(e, 8, files.length); u16(e, 10, files.length);
  u32(e, 12, centralLength); u32(e, 16, offset);
  return new Blob([...chunks.map(x => x as BlobPart), ...directory.map(x => x as BlobPart), end], { type: "application/zip" });
}
// A3+ 329 × 483 mm, 300 DPI. Twelve 100 × 100 mm cards per sheet.
const PRINT_DPI = 300;
const mm = (v: number) => Math.round(v / 25.4 * PRINT_DPI);
async function renderSheet(cards: Card[], render: (card:Card)=>Promise<HTMLCanvasElement>, flip: "none"|"horizontal"|"vertical"="none"): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas");
  canvas.width = mm(329); canvas.height = mm(483);
  const g = canvas.getContext("2d"); if (!g) throw Error("Canvas tidak tersedia");
  g.fillStyle = "#ffffff"; g.fillRect(0, 0, canvas.width, canvas.height);
  // 3 columns × 4 rows; 5 mm gaps and centered on the sheet.
  const cardSize = mm(100), gap = mm(5);
  const left = Math.round((canvas.width - (3 * cardSize + 2 * gap)) / 2);
  const top = Math.round((canvas.height - (4 * cardSize + 3 * gap)) / 2);
  for (let i = 0; i < cards.length; i++) {
    const x = left + (flip==="horizontal" ? 2-i%3 : i%3) * (cardSize + gap);
    const y = top + (flip==="vertical" ? 3-Math.floor(i/3) : Math.floor(i/3)) * (cardSize + gap);
    const card = await render(cards[i]);
    g.drawImage(card, x, y, cardSize, cardSize);
    g.strokeStyle = "#9ca3af"; g.lineWidth = 1;
    const mark = mm(2), d = mm(1);
    // Crop marks stay outside the card trim area.
    for (const [cx, cy, dx, dy] of [[x,y,-1,-1],[x+cardSize,y,1,-1],[x,y+cardSize,-1,1],[x+cardSize,y+cardSize,1,1]]) {
      g.beginPath(); g.moveTo(cx + dx * d, cy); g.lineTo(cx + dx * (d + mark), cy);
      g.moveTo(cx, cy + dy * d); g.lineTo(cx, cy + dy * (d + mark)); g.stroke();
    }
  }
  return canvas;
}
function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob), a = document.createElement("a");
  a.href = url; a.download = filename; a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  // Keep the object URL alive long enough for browsers to start large ZIP downloads.
  setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 60_000);
}
// Write PNG pHYs metadata so print software recognizes the intended physical DPI.
function setPngDpi(png: Uint8Array, dpi: number): Uint8Array {
  const signature = [137,80,78,71,13,10,26,10];
  if (png.length < 33 || !signature.every((v,i) => png[i] === v)) throw Error("PNG tidak valid");
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  if (view.getUint32(8) !== 13 || String.fromCharCode(...png.slice(12,16)) !== "IHDR") throw Error("Header PNG tidak valid");
  const ppm = Math.round(dpi / 0.0254);
  const chunk = new Uint8Array(21), cv = new DataView(chunk.buffer);
  cv.setUint32(0,9); chunk.set([112,72,89,115],4);
  cv.setUint32(8,ppm); cv.setUint32(12,ppm); chunk[16]=1;
  cv.setUint32(17,crc32(chunk.subarray(4,17)));
  const out = new Uint8Array(png.length + chunk.length);
  out.set(png.subarray(0,33),0); out.set(chunk,33); out.set(png.subarray(33),54);
  return out;
}
async function canvasPng(c: HTMLCanvasElement): Promise<Uint8Array> {
  const blob = await new Promise<Blob>((resolve, reject) => c.toBlob(b => b ? resolve(b) : reject(Error("Gagal membuat PNG")), "image/png"));
  return setPngDpi(new Uint8Array(await blob.arrayBuffer()), c.width === SIDE ? 360 : PRINT_DPI);
}
export default function BulkDesignerPage() {
  return <ProviderMfaGate><Designer /></ProviderMfaGate>;
}
function Designer() {
  const [allowed, setAllowed] = useState(false), [checking, setChecking] = useState(true);
  const [cards, setCards] = useState<Card[]>([]), [error, setError] = useState("");
  const [busy, setBusy] = useState(false), [progress, setProgress] = useState("");
  const [preview, setPreview] = useState(""), [backPreview,setBackPreview]=useState("");
  const [artworks,setArtworks]=useState<(HTMLImageElement|null)[]>([null,null,null,null]);
  const [front,setFront]=useState<Design>(0);
  const back=oppositeDesign[front];
  const [duplex,setDuplex]=useState(false),[flip,setFlip]=useState<"horizontal"|"vertical">("horizontal");
  const [positions,setPositions]=useState([{x:241,y:520,size:280},{x:741,y:520,size:280},{x:741,y:540,size:280},{x:241,y:540,size:280}]);
  const [adjust,setAdjust]=useState(false);
  const [qrStyle,setQrStyle]=useState<QrStyle>("rainbow");
  function changePosition(key:"x"|"y"|"size",v:number){setPositions(p=>p.map((item,i)=>i===front?{...item,[key]:v}:item));}
  useEffect(()=>{let live=true;Promise.all([0,1,2,3].map(async i=>{const b=await getArtwork(i);return b?imageFromBlob(b):null;})).then(a=>{if(live)setArtworks(a);}).catch(()=>{});return()=>{live=false;};},[]);
  async function uploadArtwork(i:number,file?:File){
    if(!file)return;
    if(!file.type.startsWith("image/")||file.size>15_000_000){setError("File harus gambar maksimal 15 MB.");return;}
    const url=URL.createObjectURL(file);
    try{const img=new Image();img.src=url;await img.decode();
      if(img.width<1000||Math.abs(img.width-img.height)>5)throw Error("Desain harus persegi minimal 1000px.");
      await saveArtwork(i,file);
      setArtworks(a=>a.map((v,j)=>i===j?img:v));setError("");
    }catch(e){setError(e instanceof Error?e.message:"Gagal membuka gambar.");}
    finally{URL.revokeObjectURL(url);}
  }
  const missingArtworks=[front,...(duplex?[back]:[])].filter(i=>!artworks[i]);
  const readyToExport=cards.length>0 && missingArtworks.length===0 && !busy;
  const draw=(card:Card,design:Design)=>{const img=artworks[design];if(!img)throw Error("Upload desain "+names[design]);return renderArtwork(card,img,design,positions[design],qrStyle);};
  useEffect(()=>{if(!cards.length||!artworks[front]){setPreview("");setBackPreview("");return;}
    let live=true;
    draw(cards[0],front).then(c=>{if(live)setPreview(c.toDataURL("image/png"));}).catch(()=>{});
    if(duplex&&artworks[back])draw(cards[0],back).then(c=>{if(live)setBackPreview(c.toDataURL("image/png"));}).catch(()=>{if(live)setBackPreview("");});
    else setBackPreview("");
    return()=>{live=false};
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[cards,front,back,duplex,artworks,positions,qrStyle]);
  useEffect(() => {
    let live = true;
    (async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) { if (live) setChecking(false); return; }
      const { data, error } = await supabase.rpc("v3_is_provider_admin");
      if (live) { setAllowed(!error && data === true); setChecking(false); }
    })().catch(() => { if (live) setChecking(false); });
    return () => { live = false; };
  }, []);
  async function importFile(e: ChangeEvent<HTMLInputElement>) {
    setError(""); setCards([]); setPreview("");
    const file = e.target.files?.[0]; if (!file) return;
    if (file.size > 2_000_000) { setError("CSV maksimal 2 MB."); return; }
    try {
      const parsed = getCards(await file.text());
      if (!parsed.length || parsed.length > 500) throw Error("Jumlah kartu harus 1–500.");
      setCards(parsed);
      // Preview refreshes when a design is selected.
    } catch (err) { setError(err instanceof Error ? err.message : "CSV tidak dapat dibaca."); }
  }
  async function exportZip() {
    if (!readyToExport) {setError(missingArtworks.length?"Upload template yang belum siap: "+missingArtworks.map(i=>names[i]).join(", "):"Upload CSV sebelum download.");return;}
    setBusy(true); setError("");
    try {
      const files: { name: string; data: Uint8Array }[] = [];
      for (let i = 0; i < cards.length; i++) {
        setProgress("Rendering kartu " + (i + 1) + "/" + cards.length);
        const c = await draw(cards[i],front);
        files.push({ name: clean(cards[i].card_code) + "-DEPAN.png", data: await canvasPng(c) });
        if(duplex){const b=await draw(cards[i],back);files.push({name:clean(cards[i].card_code)+"-BELAKANG.png",data:await canvasPng(b)});}
        if (i % 5 === 0) await new Promise(r => setTimeout(r, 0));
      }
      setProgress("Membuat ZIP...");
      download(zipFiles(files), "YukReview-Print-HD-" + cards.length + "-kartu.zip");
      setProgress("Selesai. " + cards.length + " PNG siap cetak.");
    } catch (err) { setError(err instanceof Error ? err.message : "Gagal membuat ZIP."); }
    finally { setBusy(false); }
  }
  async function exportA3() {
    if (!readyToExport) {setError(missingArtworks.length?"Upload template yang belum siap: "+missingArtworks.map(i=>names[i]).join(", "):"Upload CSV sebelum download.");return;}
    setBusy(true); setError("");
    try {
      const files: { name: string; data: Uint8Array }[] = [];
      for (let i = 0; i < cards.length; i += 12) {
        setProgress("Menyiapkan lembar A3+ " + (Math.floor(i / 12) + 1) + "/" + Math.ceil(cards.length / 12));
        const sheet = await renderSheet(cards.slice(i, i + 12),card=>draw(card,front));
        const n=String(Math.floor(i/12)+1).padStart(3,"0");
        files.push({name:"YukReview-A3plus-"+n+"-DEPAN.png",data:await canvasPng(sheet)});
        if(duplex){const b=await renderSheet(cards.slice(i,i+12),card=>draw(card,back),flip);files.push({name:"YukReview-A3plus-"+n+"-BELAKANG.png",data:await canvasPng(b)});}
        await new Promise(r => setTimeout(r, 0));
      }
      download(zipFiles(files), "YukReview-A3plus-300DPI-" + cards.length + "-kartu.zip");
      setProgress("Selesai. " + files.length + " lembar A3+ siap untuk proof print.");
    } catch (err) { setError(err instanceof Error ? err.message : "Gagal membuat layout A3+."); }
    finally { setBusy(false); }
  }
  return <main style={{maxWidth:1050,margin:"36px auto",padding:24,fontFamily:"Arial,sans-serif",color:"#142b56"}}>
    <Link href="/provider/cards">← Kembali ke Provider Cards</Link>
    <h1 style={{fontSize:34,marginBottom:8}}>YukReview Bulk Card Designer</h1>
    <p>Import CSV Bulk Creator, otomatis buat QR unik dan desain kartu PNG resolusi tinggi. Semua proses dilakukan di browser; PIN aktivasi tidak dicetak atau diunggah.</p>
    {checking ? <p>Memeriksa akses Provider...</p> : !allowed ? <p role="alert">Akses khusus Provider. Silakan login sebagai Provider terlebih dahulu.</p> :
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:28,marginTop:28}}>
      <section style={{padding:24,border:"1px solid #cbd5e1",borderRadius:18}}>
        <h2>1. Upload CSV</h2>
        <input aria-label="Upload CSV Bulk Creator" type="file" accept=".csv,text/csv" onChange={importFile} disabled={busy}/>
        <p>CSV dari <strong>Bulk Create</strong> atau <strong>Master Kartu</strong> dapat dipakai langsung. Kolom wajib: <code>Kode Kartu</code> + <code>URL QR/NFC</code> (atau <code>card_code</code> + <code>qr_url</code>). Mendukung hingga 500 kartu per batch.</p>
        {error && <p role="alert" style={{color:"#9a3412",background:"#fff7ed",border:"1px solid #fdba74",borderRadius:8,padding:10}}>{error}</p>}
        <p><strong>{cards.length} kartu</strong> siap diproses.</p>
        {cards.length > 0 && <p>Contoh: {cards[0].card_code} → {cards[cards.length - 1].card_code}</p>}
        <h2>2. Pilih desain kartu</h2>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          {names.map((name,i)=><label key={name} style={{padding:10,border:"1px solid #cbd5e1",borderRadius:10}}><strong>{i+1}. {name}</strong><input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>void uploadArtwork(i,e.target.files?.[0])} style={{width:"100%",marginTop:8}}/>{artworks[i]&&<span style={{color:"green"}}> Siap</span>}</label>)}
        </div>
        <p style={{fontSize:12}}>Upload empat gambar asli. Template tersimpan lokal di browser ini, bukan di database atau server YukReview.</p>
        <label>Desain depan <select value={front} onChange={e=>setFront(Number(e.target.value) as Design)}>{names.map((n,i)=><option value={i} key={n}>{n}</option>)}</select></label>
        <fieldset style={{marginTop:14,padding:12,border:"1px solid #cbd5e1",borderRadius:10}}>
          <legend style={{fontWeight:700}}>Warna QR Code</legend>
          <label style={{display:"block",marginBottom:8}}><input type="radio" name="qr-style" value="rainbow" checked={qrStyle==="rainbow"} onChange={()=>setQrStyle("rainbow")}/> Rainbow — gradasi warna gelap</label>
          <label style={{display:"block"}}><input type="radio" name="qr-style" value="standard" checked={qrStyle==="standard"} onChange={()=>setQrStyle("standard")}/> Hitam-putih — standar</label>
          <p style={{fontSize:12,marginBottom:0}}>Pilihan berlaku untuk preview, ZIP PNG HD, dan layout A3+ (depan dan belakang). QR tetap berlatar putih agar mudah dipindai. Uji scan sebelum cetak massal.</p>
        </fieldset>
        <button type="button" onClick={()=>setAdjust(!adjust)} style={{display:"block",margin:"12px 0",padding:10,border:"1px solid #94a3b8",borderRadius:8,background:"white"}}>{adjust?"Tutup pengaturan QR":"Atur posisi dan ukuran QR"}</button>
        {adjust&&<div style={{padding:12,background:"#eff6ff",borderRadius:10}}>
          <strong>Penempatan QR: {names[front]}</strong>
          {(["x","y","size"] as const).map(k=><label key={k} style={{display:"block",marginTop:12}}>{k==="x"?"Posisi horizontal":k==="y"?"Posisi vertikal":"Ukuran QR"} ({positions[front][k]})
            <input type="range" min={k==="size"?160:0} max={k==="size"?400:900} value={positions[front][k]} onChange={e=>changePosition(k,Number(e.target.value))} style={{display:"block",width:"100%"}}/>
          </label>)}
          <p style={{fontSize:12}}>Perhatikan preview. QR baru harus menutup QR contoh seluruhnya, tanpa menutupi ikon NFC.</p>
        </div>}
        <label style={{display:"block",marginTop:10}}><input type="checkbox" checked={duplex} onChange={e=>setDuplex(e.target.checked)}/> Cetak bolak-balik</label>
        {duplex&&<><p style={{fontSize:13}}>Desain belakang otomatis: <strong>{names[back]}</strong> (QR dan NFC bertukar posisi). Upload template pasangan jika belum siap.</p>
        <label style={{display:"block",marginTop:10}}>Arah pembalikan <select value={flip} onChange={e=>setFlip(e.target.value as "horizontal"|"vertical")}><option value="horizontal">Balik kiri-kanan (mirror kolom)</option><option value="vertical">Balik atas-bawah (mirror baris)</option></select></label>
        <p style={{fontSize:12,color:"#b45309"}}>Wajib proof print 1 lembar untuk menguji orientasi depan/belakang.</p></>}
        <h2>3. Export HD</h2>
        {missingArtworks.length>0&&<p role="alert" style={{padding:12,border:"1px solid #f59e0b",background:"#fffbeb",color:"#92400e",borderRadius:8}}>Download belum tersedia: upload template <strong>{missingArtworks.map(i=>names[i]).join(", ")}</strong> terlebih dahulu. {duplex?"Untuk mencoba satu sisi, matikan Cetak bolak-balik.":""}</p>}
        {!cards.length&&<p role="status">Upload CSV untuk mengaktifkan download.</p>}
        <p>PNG individual 1417 × 1417 px (~360 DPI pada 10 × 10 cm), QR error correction H. Layout A3+ 329 × 483 mm pada 300 DPI: 12 kartu per lembar (3 × 4), ukuran potong 10 × 10 cm dengan jarak 5 mm dan crop marks.</p>
        <button type="button" disabled={!readyToExport} onClick={exportZip} style={{background:"#122c61",color:"white",border:0,borderRadius:10,padding:"15px 22px",fontWeight:700,cursor:readyToExport?"pointer":"not-allowed",opacity:readyToExport?1:.5}}>{busy ? "Memproses..." : "Download ZIP PNG HD"}</button>
        <button type="button" disabled={!readyToExport} onClick={exportA3} style={{display:"block",marginTop:12,background:"#e53d46",color:"#fff",border:0,borderRadius:10,padding:"15px 22px",fontWeight:700,cursor:readyToExport?"pointer":"not-allowed",opacity:readyToExport?1:.5}}>{busy ? "Memproses..." : "Download Layout A3+ 300 DPI"}</button>
        {progress && <p role="status">{progress}</p>}
        {error && <p role="alert" style={{color:"#b91c1c"}}>{error}</p>}
        <p style={{fontSize:13,color:"#64748b"}}>Pastikan hasil proof print dan uji scan QR sebelum cetak massal. Template ini adalah desain produksi awal, bukan salinan persis template Figma.</p>
      </section>
      <section><h2>Preview kartu pertama — depan</h2>{preview ? <img src={preview} alt="Preview depan kartu YukReview" style={{width:"100%",maxWidth:480,borderRadius:14,boxShadow:"0 10px 40px #142b5622"}}/> : <p>Preview akan muncul setelah CSV diunggah.</p>}{duplex&&<><h2>Preview belakang — QR berlawanan</h2>{backPreview?<img src={backPreview} alt="Preview belakang kartu YukReview" style={{width:"100%",maxWidth:480,borderRadius:14,boxShadow:"0 10px 40px #142b5622"}}/>:<p>Upload template pasangan {names[back]} untuk preview belakang.</p>}</>}</section>
    </div>}
  </main>;
}
