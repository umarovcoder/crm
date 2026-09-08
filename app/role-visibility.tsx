"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

export default function RoleVisibility({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [canViewTasks, setCanViewTasks] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (active) setReady(true);
        return;
      }
      const { data } = await supabase.rpc("has_permission", { permission_name: "tasks_view" });
      if (active) {
        setCanViewTasks(data === true);
        setReady(true);
      }
    })();
    return () => { active = false; };
  }, []);

  return <>
    <style jsx global>{`
      a[href="/tasks"] { display: ${ready && canViewTasks ? "inline-flex" : "none"} !important; }
    `}</style>
    {children}
  </>;
}
