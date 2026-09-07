"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
const roles=["pending","super_admin","pm","seller","marketing"];
const labels:Record<string,string>={pending:"Pending",super_admin:"Super Admin",pm:"PM",seller:"Sotuvchi",marketing:"Marketing"};

type Profile={id:string;full_name:string|null;email:string|null;role:string;is_active:boolean};
export default function Users(){const router=useRouter();const [users,setUsers]=useState<Profile[]>([]);const [loading,setLoading]=useState(true);const [allowed,setAllowed]=useState(false);const [msg,setMsg]=useState("");
 const load=async()=>{const {data:{user}}=await supabase.auth.getUser();if(!user){router.replace('/login');return}const {data:me}=await supabase.from('profiles').select('role').eq('id',user.id).single();if(me?.role!=='super_admin'){router.replace('/');return}setAllowed(true);const {data,error}=await supabase.from('profiles').select('*').order('created_at');if(error)setMsg(error.message);else setUsers((data||[]) as Profile[]);setLoading(false)};
 useEffect(()=>{load()},[]);
 async function update(id:string,patch:Partial<Profile>){const {error}=await supabase.from('profiles').update(patch).eq('id',id);if(error)setMsg(error.message);else setUsers(us=>us.map(u=>u.id===id?{...u,...patch}:u))}
 if(!allowed||loading)return <main style={{padding:40,fontFamily:'Arial'}}>Yuklanmoqda...</main>;
 return <main style={{minHeight:'100vh',background:'#f1f2f4',fontFamily:'Arial',color:'#172033'}}><header style={{height:64,background:'#172b4d',color:'#fff',display:'flex',alignItems:'center',padding:'0 24px',gap:20}}><b>Latta Putta CRM</b><button onClick={()=>router.push('/')} style={{marginLeft:'auto'}}>CRM</button><button onClick={()=>supabase.auth.signOut().then(()=>router.replace('/login'))}>Chiqish</button></header><section style={{maxWidth:1000,margin:'30px auto',padding:'0 20px'}}><h1>Xodimlar</h1><p style={{color:'#6b778c'}}>Foydalanuvchilar, rollar va kirish huquqlarini boshqarish</p>{msg&&<p style={{color:'#de350b'}}>{msg}</p>}<div style={{background:'#fff',borderRadius:12,overflow:'hidden',boxShadow:'0 2px 8px #0000000d'}}>{users.map(u=><div key={u.id} style={{display:'grid',gridTemplateColumns:'1fr 220px 120px',gap:16,alignItems:'center',padding:'16px 20px',borderBottom:'1px solid #eee'}}><div><b>{u.full_name||'Nomsiz'}</b><div style={{fontSize:13,color:'#6b778c'}}>{u.email}</div></div><select value={u.role} onChange={e=>update(u.id,{role:e.target.value})}>{roles.map(r=><option key={r} value={r}>{labels[r]}</option>)}</select><label style={{fontSize:13}}><input type="checkbox" checked={u.is_active} onChange={e=>update(u.id,{is_active:e.target.checked})}/> Active</label></div>)}{!users.length&&<div style={{padding:30}}>Hali foydalanuvchi yo‘q.</div>}</div></section></main>}
