import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function adminClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase server environment variables are missing");
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function POST(req: NextRequest) {
  try {
    if (!ACCESS_TOKEN) {
      return NextResponse.json({ error: "Instagram access token is not configured" }, { status: 503 });
    }

    const body = (await req.json()) as {
      instagram_user_id?: string;
      deal_id?: number;
      text?: string;
    };

    const text = body.text?.trim() || "";
    if (!text) return NextResponse.json({ error: "text is required" }, { status: 400 });

    const db = adminClient();
    let recipientId = body.instagram_user_id || "";

    if (!recipientId && body.deal_id) {
      const deal = await db
        .from("deals")
        .select("instagram_user_id")
        .eq("id", body.deal_id)
        .single();
      recipientId = deal.data?.instagram_user_id || "";
    }

    if (!recipientId) {
      return NextResponse.json({ error: "Instagram user is not linked to this lead" }, { status: 400 });
    }

    const response = await fetch("https://graph.instagram.com/me/messages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text },
      }),
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error("Instagram send error", result);
      return NextResponse.json({ error: "Instagram message was not sent", details: result }, { status: response.status });
    }

    const sentAt = new Date().toISOString();
    const messageId = result?.message_id || result?.id || `outbound-${Date.now()}`;

    const deal = await db
      .from("deals")
      .select("id")
      .eq("instagram_user_id", recipientId)
      .maybeSingle();
    const dealId = body.deal_id || deal.data?.id || null;

    await db.from("instagram_messages").insert({
      instagram_user_id: recipientId,
      deal_id: dealId,
      instagram_message_id: String(messageId),
      message_text: text,
      direction: "outbound",
      sent_at: sentAt,
      raw_payload: result,
    });

    if (dealId) {
      await db
        .from("deals")
        .update({
          instagram_last_message: text,
          instagram_last_message_at: sentAt,
          updated_at: sentAt,
        })
        .eq("id", dealId);
    }

    return NextResponse.json({ ok: true, message_id: messageId, deal_id: dealId });
  } catch (error) {
    console.error("Instagram send route error", error);
    return NextResponse.json({ error: "Instagram message failed" }, { status: 500 });
  }
}
