"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient, type User } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string>("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(async ({ data }) => {
      if (!mounted) return;
      if (!data.user) { router.replace("/login"); return; }
      setUser(data.user);
      const { data: profile } = await supabase.from("profiles").select("role,is_active").eq("id", data.user.id).single();
      if (!mounted) return;
      if (!profile?.is_active || profile.role === "pending") { setRole(profile?.role || "pending"); setReady(true); return; }
      setRole(profile.role); setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace("/login");
      else setUser(session.user);
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, [router]);

  if (!ready) return <main style={{minHeight:"100vh",display:"grid",placeItems:"center",fontFamily:"Arial"}}>Yuklanmoqda...</main>;
  if (!user) return null;
  if (role === "pending" || !role) return <main style={{minHeight:"100vh",display:"grid",placeItems:"center",background:"#f1f2f4",fontFamily:"Arial"}}><section style={{background:"white",padding:32,borderRadius:16,textAlign:"center"}}><h2>Kirish tasdiqlanishini kuting</h2><p style={{color:"#6b778c"}}>Admin sizga rol va huquqlarni biriktirishi kerak.</p><button onClick={() => supabase.auth.signOut().then(() => router.replace("/login"))}>Chiqish</button></section></main>;
  return <>{children}<div style={{position:"fixed",right:16,bottom:16,background:"#172b4d",color:"white",padding:"8px 12px",borderRadius:8,fontSize:12,zIndex:50}}>{user.email} · {role} <button style={{marginLeft:8}} onClick={() => supabase.auth.signOut().then(() => router.replace("/login"))}>Chiqish</button></div></>;
}
