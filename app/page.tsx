"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const stages = ["Yangi lead","Aloqa qilindi","Mahsulot yuborildi","Narx aytildi","Qiziqdi","Buyurtma tasdiqlandi","Yetkazmaga berildi","Sotib oldi","Yo‘qotildi","Javob bermadi","Keyinroq oladi"];
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const supabase = createClient(url, key);

type Deal = { id:number; lead_date:string; instagram:string; name:string; phone:string; product:string; product_price:number; source:string; campaign:string; stage:string; manager:string; next_contact:string; sale_amount:number };
type Period = "today" | "week" | "month";

function startOfPeriod(period: Period) {
  const d = new Date();
  d.setHours(0,0,0,0);
  if (period === "today") return d;
  if (period === "week") {
    const day = d.getDay();
    const diff = day === 0 ? 6 : day - 1;
    d.setDate(d.getDate() - diff);
    return d;
  }
  d.setDate(1);
  return d;
}

function inPeriod(date:string, period:Period) {
  if (!date) return false;
  const [y,m,day] = date.slice(0,10).split("-").map(Number);
  const value = new Date(y,m-1,day);
  value.setHours(0,0,0,0);
  return value >= startOfPeriod(period);
}

export default function Home(){
  const [deals,setDeals]=useState<Deal[]>([]);
  const [drag,setDrag]=useState<number|null>(null);
  const [loading,setLoading]=useState(true);
  const [view,setView]=useState<"dashboard"|"deals">("deals");
  const [period,setPeriod]=useState<Period>("today");

  async function load(){
    const {data,error}=await supabase.from("deals").select("*").order("id",{ascending:false});
    if(!error)setDeals((data||[]) as Deal[]);
    setLoading(false);
  }
  useEffect(()=>{load()},[]);

  async function move(id:number,stage:string){
    setDeals(ds=>ds.map(d=>d.id===id?{...d,stage}:d));
    const {error}=await supabase.from("deals").update({stage,updated_at:new Date().toISOString()}).eq("id",id);
    if(error)load();
  }

  const periodDeals = useMemo(()=>deals.filter(d=>inPeriod(d.lead_date,period)),[deals,period]);
  const bought=periodDeals.filter(d=>d.stage==="Sotib oldi").length;
  const contacted=periodDeals.filter(d=>["Aloqa qilindi","Mahsulot yuborildi","Narx aytildi","Qiziqdi","Buyurtma tasdiqlandi","Yetkazmaga berildi","Sotib oldi"].includes(d.stage)).length;
  const interested=periodDeals.filter(d=>["Qiziqdi","Buyurtma tasdiqlandi","Yetkazmaga berildi","Sotib oldi"].includes(d.stage)).length;
  const orders=periodDeals.filter(d=>["Buyurtma tasdiqlandi","Yetkazmaga berildi","Sotib oldi"].includes(d.stage)).length;
  const sales=periodDeals.reduce((a,d)=>a+Number(d.sale_amount||0),0);
  const conversion=periodDeals.length ? (bought/periodDeals.length*100).toFixed(1) : "0.0";

  if(loading)return <main className="loading">CRM yuklanmoqda...</main>;

  return <main>
    <header>
      <b>Latta Putta CRM</b>
      <nav>
        <button className={view==="dashboard"?"active":""} onClick={()=>setView("dashboard")}>Dashboard</button>
        <button className={view==="deals"?"active":""} onClick={()=>setView("deals")}>Sdelki</button>
        <button onClick={load}>Yangilash</button>
      </nav>
    </header>

    {view === "dashboard" ? <>
      <section className="dashTop">
        <div><h1>Dashboard</h1><p>Leadlar va sotuvlar bo‘yicha umumiy ko‘rsatkichlar</p></div>
        <div className="periods">
          <button className={period==="today"?"selected":""} onClick={()=>setPeriod("today")}>Bugun</button>
          <button className={period==="week"?"selected":""} onClick={()=>setPeriod("week")}>Hafta</button>
          <button className={period==="month"?"selected":""} onClick={()=>setPeriod("month")}>Oy</button>
        </div>
      </section>
      <section className="stats">
        <div><small>Leads</small><strong>{periodDeals.length}</strong></div>
        <div><small>Aloqa qilindi</small><strong>{contacted}</strong></div>
        <div><small>Qiziqdi</small><strong>{interested}</strong></div>
        <div><small>Buyurtma</small><strong>{orders}</strong></div>
        <div><small>Sotib oldi</small><strong>{bought}</strong></div>
        <div><small>Conversion</small><strong>{conversion}%</strong></div>
      </section>
      <section className="dashGrid">
        <div className="panel"><h2>Voronka</h2>{["Yangi lead","Aloqa qilindi","Qiziqdi","Buyurtma tasdiqlandi","Sotib oldi"].map(s=>{const n=periodDeals.filter(d=>d.stage===s).length; const max=Math.max(periodDeals.length,1); return <div className="funnel" key={s}><div><span>{s}</span><b>{n}</b></div><i><em style={{width:`${Math.max(n/max*100,n?3:0)}%`}} /></i></div>})}</div>
        <div className="panel"><h2>Natija</h2><div className="result"><span>Sotuv summasi</span><strong>{new Intl.NumberFormat("uz-UZ").format(sales)} so‘m</strong></div><div className="result"><span>Yo‘qotildi</span><strong>{periodDeals.filter(d=>d.stage==="Yo‘qotildi").length}</strong></div><div className="result"><span>Javob bermadi</span><strong>{periodDeals.filter(d=>d.stage==="Javob bermadi").length}</strong></div></div>
      </section>
    </> : <>
      <section className="stats"><div><small>Jami leadlar</small><strong>{deals.length}</strong></div><div><small>Sotib oldi</small><strong>{deals.filter(d=>d.stage==="Sotib oldi").length}</strong></div><div><small>Conversion</small><strong>{deals.length?(deals.filter(d=>d.stage==="Sotib oldi").length/deals.length*100).toFixed(1):"0.0"}%</strong></div><div><small>Sotuv</small><strong>{new Intl.NumberFormat("uz-UZ").format(deals.reduce((a,d)=>a+Number(d.sale_amount||0),0))} so‘m</strong></div></section>
      <section className="board">{stages.map(stage=><div className="column" key={stage} onDragOver={e=>e.preventDefault()} onDrop={()=>drag!==null&&move(drag,stage)}><div className="head"><b>{stage}</b><em>{deals.filter(d=>d.stage===stage).length}</em></div><div className="drop">{deals.filter(d=>d.stage===stage).map(d=><article key={d.id} draggable onDragStart={()=>setDrag(d.id)} onDragEnd={()=>setDrag(null)}><small>#{d.id} · {d.lead_date}</small><b>{d.instagram||"Instagram yo‘q"}</b><span>{d.name}{d.phone?` · ${d.phone}`:""}</span><strong>{d.product||"Mahsulot"}</strong><strong>{new Intl.NumberFormat("uz-UZ").format(d.sale_amount||d.product_price||0)} so‘m</strong><div>{d.source&&<i>{d.source}</i>}{d.manager&&<i>{d.manager}</i>}</div></article>)}</div></div>)}</section>
    </>}

    <style jsx>{`*{box-sizing:border-box}body{margin:0}main{min-height:100vh;background:#f1f2f4;color:#172033;font-family:Arial,sans-serif}header{height:64px;background:#172b4d;color:white;display:flex;align-items:center;padding:0 24px;gap:35px}header b{font-size:19px}nav{display:flex;gap:10px;align-items:center}nav button{padding:9px 12px;border-radius:7px;color:#d7e0ee;background:transparent;border:0;font-weight:700;cursor:pointer}nav button.active{background:#ffffff1a;color:#fff}.dashTop{display:flex;justify-content:space-between;align-items:center;padding:24px}.dashTop h1{margin:0 0 5px;font-size:25px}.dashTop p{margin:0;color:#6b7280}.periods{display:flex;background:#e2e4e9;padding:4px;border-radius:9px}.periods button{border:0;background:transparent;padding:8px 16px;border-radius:7px;font-weight:700;cursor:pointer;color:#4b5563}.periods button.selected{background:#fff;color:#172033;box-shadow:0 1px 3px #0002}.stats{display:grid;grid-template-columns:repeat(6,1fr);gap:14px;padding:0 24px 20px}.stats div{background:#fff;border:1px solid #dfe1e6;border-radius:10px;padding:14px}.stats small{display:block;color:#6b7280}.stats strong{display:block;font-size:24px;margin-top:6px}.dashGrid{display:grid;grid-template-columns:1.4fr 1fr;gap:16px;padding:0 24px 25px}.panel{background:#fff;border:1px solid #dfe1e6;border-radius:10px;padding:20px}.panel h2{font-size:16px;margin:0 0 20px}.funnel{margin:15px 0}.funnel>div{display:flex;justify-content:space-between;font-size:13px;margin-bottom:7px}.funnel b{font-size:13px}.funnel i{display:block;height:9px;background:#e9ebef;border-radius:8px;overflow:hidden}.funnel em{display:block;height:100%;background:#0c66e4;border-radius:8px}.result{display:flex;justify-content:space-between;padding:18px 0;border-bottom:1px solid #edf0f2}.result:last-child{border-bottom:0}.result span{color:#6b7280}.result strong{font-size:18px}.board{display:flex;gap:10px;overflow-x:auto;padding:0 24px 25px}.column{flex:0 0 285px;background:#e2e4e9;border-radius:10px;padding:8px;min-height:500px}.head{display:flex;justify-content:space-between;padding:6px;font-size:13px}.head em{font-style:normal;background:#c7c9d1;border-radius:12px;padding:2px 8px}.drop{min-height:440px}.drop article{background:#fff;border:1px solid #e6e7ea;border-radius:7px;padding:11px;margin:7px 0;cursor:grab;box-shadow:0 1px 2px #0002}.drop article>*{display:block;margin:3px 0}.drop article small{color:#8993a4;font-size:11px}.drop article span{font-size:12px;color:#4b5563}.drop article strong{font-size:13px}.drop article i{display:inline-block;font-style:normal;font-size:10px;background:#e9f2ff;color:#0c66e4;padding:4px 6px;border-radius:5px;margin:5px 5px 0 0}.loading{display:grid;place-items:center;min-height:100vh}@media(max-width:900px){.stats{grid-template-columns:repeat(3,1fr)}.dashGrid{grid-template-columns:1fr}}@media(max-width:600px){.stats{grid-template-columns:repeat(2,1fr)}header{padding:0 12px}.dashTop{padding:18px 12px;align-items:flex-start;gap:12px;flex-direction:column}.dashGrid{padding:0 12px 20px}.board{padding-left:12px;padding-right:12px}}`}</style>
  </main>
}
