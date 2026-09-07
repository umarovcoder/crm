"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const stages = ["Yangi lead","Aloqa qilindi","Mahsulot yuborildi","Narx aytildi","Qiziqdi","Buyurtma tasdiqlandi","Yetkazmaga berildi","Sotib oldi","Yo‘qotildi","Javob bermadi","Keyinroq oladi"];
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const supabase = createClient(url, key);

type Deal = { id:number; lead_date:string; instagram:string; name:string; phone:string; product:string; product_price:number; source:string; campaign:string; stage:string; manager:string; next_contact:string; sale_amount:number };

export default function Home(){
  const [deals,setDeals]=useState<Deal[]>([]); const [drag,setDrag]=useState<number|null>(null); const [loading,setLoading]=useState(true);
  async function load(){const {data,error}=await supabase.from("deals").select("*").order("id",{ascending:false}); if(!error)setDeals((data||[]) as Deal[]); setLoading(false)}
  useEffect(()=>{load()},[]);
  async function move(id:number,stage:string){setDeals(ds=>ds.map(d=>d.id===id?{...d,stage}:d)); const {error}=await supabase.from("deals").update({stage,updated_at:new Date().toISOString()}).eq("id",id); if(error)load()}
  const sales=deals.reduce((a,d)=>a+Number(d.sale_amount||0),0); const bought=deals.filter(d=>d.stage==="Sotib oldi").length;
  if(loading)return <main className="loading">CRM yuklanmoqda...</main>;
  return <main><header><b>Latta Putta CRM</b><nav><span>Dashboard</span><span className="active">Sdelki</span><button onClick={()=>location.reload()}>Yangilash</button></nav></header>
  <section className="stats"><div><small>Jami leadlar</small><strong>{deals.length}</strong></div><div><small>Sotib oldi</small><strong>{bought}</strong></div><div><small>Conversion</small><strong>{deals.length?(bought/deals.length*100).toFixed(1):"0.0"}%</strong></div><div><small>Sotuv</small><strong>{new Intl.NumberFormat("uz-UZ").format(sales)} so‘m</strong></div></section>
  <section className="board">{stages.map(stage=><div className="column" key={stage} onDragOver={e=>e.preventDefault()} onDrop={()=>drag&&move(drag,stage)}><div className="head"><b>{stage}</b><em>{deals.filter(d=>d.stage===stage).length}</em></div><div className="drop">{deals.filter(d=>d.stage===stage).map(d=><article key={d.id} draggable onDragStart={()=>setDrag(d.id)} onDragEnd={()=>setDrag(null)}><small>#{d.id} · {d.lead_date}</small><b>{d.instagram||"Instagram yo‘q"}</b><span>{d.name}{d.phone?` · ${d.phone}`:""}</span><strong>{d.product||"Mahsulot"}</strong><strong>{new Intl.NumberFormat("uz-UZ").format(d.sale_amount||d.product_price||0)} so‘m</strong><div>{d.source&&<i>{d.source}</i>}{d.manager&&<i>{d.manager}</i>}</div></article>)}</div></div>)}</section>
  <style jsx>{`*{box-sizing:border-box}body{margin:0}main{min-height:100vh;background:#f1f2f4;color:#172033;font-family:Arial,sans-serif}header{height:64px;background:#172b4d;color:white;display:flex;align-items:center;padding:0 24px;gap:35px}header b{font-size:19px}nav{display:flex;gap:10px;align-items:center}nav span,nav button{padding:9px 12px;border-radius:7px;color:#d7e0ee;background:transparent;border:0;font-weight:700}nav .active{background:#ffffff1a;color:#fff}.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;padding:20px 24px}.stats div{background:#fff;border:1px solid #dfe1e6;border-radius:10px;padding:14px}.stats small{display:block;color:#6b7280}.stats strong{display:block;font-size:24px;margin-top:6px}.board{display:flex;gap:10px;overflow-x:auto;padding:0 24px 25px}.column{flex:0 0 285px;background:#e2e4e9;border-radius:10px;padding:8px;min-height:500px}.head{display:flex;justify-content:space-between;padding:6px;font-size:13px}.head em{font-style:normal;background:#c7c9d1;border-radius:12px;padding:2px 8px}.drop{min-height:440px}.drop article{background:#fff;border:1px solid #e6e7ea;border-radius:7px;padding:11px;margin:7px 0;cursor:grab;box-shadow:0 1px 2px #0002}.drop article>*{display:block;margin:3px 0}.drop article small{color:#8993a4;font-size:11px}.drop article span{font-size:12px;color:#4b5563}.drop article strong{font-size:13px}.drop article i{display:inline-block;font-style:normal;font-size:10px;background:#e9f2ff;color:#0c66e4;padding:4px 6px;border-radius:5px;margin:5px 5px 0 0}.loading{display:grid;place-items:center;min-height:100vh}@media(max-width:800px){.stats{grid-template-columns:repeat(2,1fr)}header{padding:0 12px}.board{padding-left:12px;padding-right:12px}}`}</style></main>
}