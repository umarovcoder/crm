"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

export default function ProjectsLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }
      const { data } = await supabase.rpc("has_permission", { permission_name: "tasks_view" });
      if (!active) return;
      if (data !== true) {
        setAllowed(false);
        router.replace("/");
        return;
      }
      setAllowed(true);
    })();
    return () => { active = false; };
  }, [router]);

  if (allowed !== true) {
    return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#f1f2f4", fontFamily: "Arial,sans-serif", color: "#172033" }}>Kirish tekshirilmoqda...</main>;
  }

  return <>{children}</>;
}
