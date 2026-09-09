import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const VERIFY_TOKEN = process.env.INSTAGRAM_VERIFY_TOKEN;
const ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN;
const IG_ACCOUNT_ID = process.env.INSTAGRAM_ACCOUNT_ID;
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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token && challenge && token === VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

async function getInstagramUsername(senderId: string) {
  if (!ACCESS_TOKEN) return "";
  try {
    const url = new URL(`https://graph.instagram.com/${encodeURIComponent(senderId)}`);
    url.searchParams.set("fields", "id,username");
    url.searchParams.set("access_token", ACCESS_TOKEN);
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return "";
    const data = (await response.json()) as { username?: string };
    return data.username || "";
  } catch {
    return "";
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as any;

    if (body?.object !== "instagram") {
      return NextResponse.json({ ok: true });
    }

    const db = adminClient();

    for (const entry of body.entry || []) {
      const accountId = String(entry.id || "");
      if (IG_ACCOUNT_ID && accountId && accountId !== IG_ACCOUNT_ID) continue;

      for (const event of entry.messaging || []) {
        const senderId = String(event?.sender?.id || "");
        const recipientId = String(event?.recipient?.id || "");
        const message = event?.message;
        const messageId = message?.mid ? String(message.mid) : "";
        const text = typeof message?.text === "string" ? message.text.trim() : "";

        // Ignore events without a customer sender/message. Postbacks and other
        // events can be added later without creating an empty CRM lead.
        if (!senderId || !messageId || !message) continue;
        if (IG_ACCOUNT_ID && senderId === IG_ACCOUNT_ID) continue;
        if (recipientId && IG_ACCOUNT_ID && recipientId !== IG_ACCOUNT_ID) continue;

        const existingMessage = await db
          .from("instagram_messages")
          .select("id")
          .eq("instagram_message_id", messageId)
          .maybeSingle();

        if (existingMessage.data) continue;

        const username = await getInstagramUsername(senderId);
        const sentAt = event?.timestamp
          ? new Date(Number(event.timestamp)).toISOString()
          : new Date().toISOString();

        const existingDeal = await db
          .from("deals")
          .select("id,instagram,stage,manager_id,manager")
          .eq("instagram_user_id", senderId)
          .maybeSingle();

        let dealId: number | null = existingDeal.data?.id || null;

        if (dealId) {
          const update: Record<string, unknown> = {
            instagram_last_message: text || null,
            instagram_last_message_at: sentAt,
            updated_at: new Date().toISOString(),
          };
          if (username && !existingDeal.data?.instagram) update.instagram = `@${username}`;
          await db.from("deals").update(update).eq("id", dealId);
        } else {
          const lead = await db
            .from("deals")
            .insert({
              lead_date: new Date(sentAt).toISOString().slice(0, 10),
              instagram: username ? `@${username}` : "",
              name: "",
              phone: "",
              product: "",
              product_price: 0,
              source: "Instagram DM",
              stage: "Yangi lead",
              manager: "",
              manager_id: null,
              next_contact: null,
              note: "Instagram DM orqali avtomatik yaratildi",
              instagram_user_id: senderId,
              instagram_last_message: text || null,
              instagram_last_message_at: sentAt,
            })
            .select("id")
            .single();

          if (lead.error) {
            // A duplicate can happen if Meta retries two webhook deliveries at
            // the same time. Re-read the lead before giving up.
            const retry = await db
              .from("deals")
              .select("id")
              .eq("instagram_user_id", senderId)
              .maybeSingle();
            dealId = retry.data?.id || null;
            if (!dealId) throw lead.error;
          } else {
            dealId = lead.data.id;
          }
        }

        await db.from("instagram_messages").insert({
          instagram_user_id: senderId,
          deal_id: dealId,
          instagram_message_id: messageId,
          message_text: text || null,
          direction: "inbound",
          sent_at: sentAt,
          raw_payload: event,
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Instagram webhook error", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
