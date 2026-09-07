"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function login() {
    setLoading(true); setError("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) { setError(error.message); setLoading(false); }
  }

  return <main style={{minHeight:"100vh",display:"grid",placeItems:"center",background:"#f1f2f4",fontFamily:"Arial,sans-serif"}}>
    <section style={{width:380,maxWidth:"calc(100% - 32px)",background:"white",borderRadius:16,padding:32,boxShadow:"0 10px 35px #00000012",textAlign:"center"}}>
      <div style={{fontSize:30,fontWeight:800,color:"#172b4d"}}>Latta Putta <span style={{fontSize:16,color:"#7b8798"}}>CRM</span></div>
      <p style={{color:"#6b778c",margin:"10px 0 28px"}}>Jamoa CRM tizimiga kirish</p>
      <button onClick={login} disabled={loading} style={{width:"100%",padding:"13px 16px",border:"1px solid #dfe1e6",borderRadius:9,background:"white",fontWeight:700,fontSize:15,cursor:"pointer"}}>{loading ? "Kutilmoqda..." : "G  Google orqali kirish"}</button>
      {error && <p style={{color:"#de350b",fontSize:13,marginTop:14}}>{error}</p>}
      <p style={{fontSize:12,color:"#8993a4",marginTop:24}}>Kirish orqali kompaniya CRM'iga kirish huquqiga ega bo'lasiz.</p>
    </section>
  </main>;
}
