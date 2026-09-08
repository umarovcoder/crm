"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

export default function AuthCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState("Google hisobingiz tekshirilmoqda...");

  useEffect(() => {
    let cancelled = false;

    async function finishLogin() {
      const { data, error } = await supabase.auth.getSession();
      if (cancelled) return;

      if (error || !data.session) {
        setMessage("Kirish amalga oshmadi. Login sahifasiga qaytilmoqda...");
        setTimeout(() => router.replace("/login?error=auth"), 900);
        return;
      }

      router.replace("/");
      router.refresh();
    }

    finishLogin();
    return () => { cancelled = true; };
  }, [router]);

  return (
    <main style={{minHeight:"100vh",display:"grid",placeItems:"center",background:"#f1f2f4",fontFamily:"Arial,sans-serif"}}>
      <div style={{background:"white",padding:32,borderRadius:16,textAlign:"center",boxShadow:"0 10px 35px #00000012"}}>
        <div style={{fontSize:28,fontWeight:800,color:"#172b4d",marginBottom:12}}>Latta Putta CRM</div>
        <div style={{color:"#6b778c"}}>{message}</div>
      </div>
    </main>
  );
}
