"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);

const roles = ["pending", "super_admin", "pm", "seller", "marketing"] as const;
const roleLabels: Record<string, string> = {
  pending: "Pending",
  super_admin: "Super Admin",
  pm: "PM",
  seller: "Sotuvchi",
  marketing: "Marketing",
};
const permissionKeys = [
  "dashboard", "deals_view", "deals_create", "deals_edit", "deals_delete",
  "tasks_view", "tasks_create", "tasks_edit", "tasks_delete", "users_manage",
] as const;
const permissionLabels: Record<string, string> = {
  dashboard: "Dashboard",
  deals_view: "Sdelkalarni ko‘rish",
  deals_create: "Sdelka yaratish",
  deals_edit: "Sdelka tahrirlash",
  deals_delete: "Sdelka o‘chirish",
  tasks_view: "Tasklarni ko‘rish",
  tasks_create: "Task yaratish",
  tasks_edit: "Task tahrirlash",
  tasks_delete: "Task o‘chirish",
  users_manage: "Xodimlar va rollarni boshqarish",
};

type Profile = { id: string; full_name: string | null; email: string | null; role: string; is_active: boolean };
type Permission = { role: string; [key: string]: boolean | string };

export default function SettingsPage() {
  const router = useRouter();
  const [users, setUsers] = useState<Profile[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [me, setMe] = useState<string>("");
  const [tab, setTab] = useState<"users" | "permissions">("users");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string>("");
  const [msg, setMsg] = useState("");

  async function load() {
    setLoading(true);
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) { router.replace("/login"); return; }
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", auth.user.id).single();
    if (profile?.role !== "super_admin") { router.replace("/"); return; }
    setMe(auth.user.id);
    const [u, p] = await Promise.all([
      supabase.from("profiles").select("id,full_name,email,role,is_active").order("created_at"),
      supabase.from("permissions").select("*").order("role"),
    ]);
    if (u.error) setMsg(u.error.message); else setUsers((u.data || []) as Profile[]);
    if (p.error) setMsg(p.error.message); else setPermissions((p.data || []) as Permission[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function updateUser(id: string, patch: Partial<Profile>) {
    setSaving(id);
    const { error } = await supabase.from("profiles").update(patch).eq("id", id);
    if (error) setMsg(error.message);
    else setUsers(us => us.map(u => u.id === id ? { ...u, ...patch } : u));
    setSaving("");
  }

  async function updatePermission(role: string, key: string, value: boolean) {
    setSaving(`${role}:${key}`);
    const { error } = await supabase.from("permissions").update({ [key]: value }).eq("role", role);
    if (error) setMsg(error.message);
    else setPermissions(ps => ps.map(p => p.role === role ? { ...p, [key]: value } : p));
    setSaving("");
  }

  if (loading) return <main style={{padding:40,fontFamily:"Arial"}}>Sozlamalar yuklanmoqda...</main>;

  return <main style={{minHeight:"100vh",background:"#f1f2f4",fontFamily:"Arial,sans-serif",color:"#172033"}}>
    <header style={{height:64,background:"#172b4d",color:"#fff",display:"flex",alignItems:"center",padding:"0 24px",gap:12}}>
      <b style={{fontSize:19}}>Latta Putta <small style={{color:"#aebbd0"}}>CRM</small></b>
      <button onClick={() => router.push("/")} style={navBtn}>CRM</button>
      <button onClick={() => router.push("/tasks")} style={navBtn}>Tasks</button>
      <button onClick={() => supabase.auth.signOut().then(() => router.replace("/login"))} style={{...navBtn,marginLeft:"auto"}}>Chiqish</button>
    </header>
    <section style={{maxWidth:1100,margin:"30px auto",padding:"0 20px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div><h1 style={{margin:"0 0 5px"}}>⚙️ Sozlamalar</h1><p style={{margin:0,color:"#6b778c"}}>Xodimlar, rollar va tizim huquqlarini boshqaring.</p></div>
      </div>
      {msg && <div style={{background:"#ffebe6",color:"#bf2600",padding:12,borderRadius:8,marginBottom:16}}>{msg}</div>}
      <div style={{display:"flex",gap:8,marginBottom:16}}>
        <button onClick={() => setTab("users")} style={tabBtn(tab === "users")}>👥 Xodimlar</button>
        <button onClick={() => setTab("permissions")} style={tabBtn(tab === "permissions")}>🔐 Rollar va huquqlar</button>
      </div>

      {tab === "users" ? <section style={panel}>
        <div style={{padding:20,borderBottom:"1px solid #eee"}}><h2 style={{margin:0}}>Xodimlar</h2><p style={{margin:"6px 0 0",color:"#6b778c"}}>Google orqali kirgan xodim shu yerda paydo bo‘ladi. Unga rol bering yoki vaqtincha bloklang.</p></div>
        {users.map(u => <div key={u.id} style={{display:"grid",gridTemplateColumns:"1fr 190px 120px",gap:16,alignItems:"center",padding:"16px 20px",borderBottom:"1px solid #eee"}}>
          <div><b>{u.full_name || "Nomsiz xodim"}</b><div style={{fontSize:13,color:"#6b778c",marginTop:3}}>{u.email}</div></div>
          <select value={u.role} disabled={u.id === me} onChange={e => updateUser(u.id,{role:e.target.value})} style={inputStyle} title={u.id === me ? "O‘zingizning Super Admin rolingizni bu yerdan o‘zgartirmang" : "Rol"}>{roles.map(r => <option key={r} value={r}>{roleLabels[r]}</option>)}</select>
          <label style={{fontSize:13}}><input type="checkbox" checked={u.is_active} disabled={u.id === me} onChange={e => updateUser(u.id,{is_active:e.target.checked})}/> Faol</label>
        </div>)}
        {!users.length && <div style={{padding:30}}>Hali foydalanuvchi yo‘q.</div>}
      </section> : <section style={panel}>
        <div style={{padding:20,borderBottom:"1px solid #eee"}}><h2 style={{margin:0}}>Rollar va huquqlar</h2><p style={{margin:"6px 0 0",color:"#6b778c"}}>Har bir rol uchun CRM ichida nimalarga ruxsat borligini belgilang.</p></div>
        <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:900}}><thead><tr><th style={th}>Rol</th>{permissionKeys.map(k => <th key={k} style={th}>{permissionLabels[k]}</th>)}</tr></thead><tbody>{roles.map(role => {const p=permissions.find(x=>x.role===role);return <tr key={role}><td style={{...td,fontWeight:700}}>{roleLabels[role]}</td>{permissionKeys.map(k => <td key={k} style={{...td,textAlign:"center"}}><input type="checkbox" checked={Boolean(p?.[k])} disabled={role === "super_admin" || saving === `${role}:${k}`} onChange={e=>updatePermission(role,k,e.target.checked)} /></td>)}</tr>})}</tbody></table></div>
        <div style={{padding:16,color:"#6b778c",fontSize:13}}>Super Admin barcha huquqlarga ega va uning huquqlari o‘zgartirilmaydi.</div>
      </section>}
    </section>
  </main>;
}

const navBtn: React.CSSProperties = { padding:"8px 12px", border:0, borderRadius:7, background:"transparent", color:"#d7e0ee", fontWeight:700, cursor:"pointer" };
const panel: React.CSSProperties = { background:"#fff", borderRadius:12, overflow:"hidden", boxShadow:"0 2px 8px #0000000d" };
const inputStyle: React.CSSProperties = { width:"100%",padding:"9px 10px",border:"1px solid #dfe1e6",borderRadius:7,background:"#fff" };
const th: React.CSSProperties = { padding:"12px 8px",background:"#f7f8fa",fontSize:12,textAlign:"center",borderBottom:"1px solid #ddd" };
const td: React.CSSProperties = { padding:"13px 8px",borderBottom:"1px solid #eee",fontSize:13 };
const tabBtn = (active:boolean): React.CSSProperties => ({ padding:"10px 14px",border:0,borderRadius:8,cursor:"pointer",fontWeight:700,background:active?"#172b4d":"#fff",color:active?"#fff":"#172033",boxShadow:"0 1px 4px #00000012" });
