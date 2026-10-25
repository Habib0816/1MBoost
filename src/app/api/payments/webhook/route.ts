import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return NextResponse.json({ error: "Not configured" }, { status: 503 });
  const raw = await request.text();
  const sig = request.headers.get("x-paystack-signature") || "";
  const expected = crypto.createHmac("sha512", secret).update(raw).digest("hex");
  const a = Buffer.from(sig), b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return NextResponse.json({ error: "Invalid signature" }, { status: 401 });

  const event = JSON.parse(raw);
  if (event.event !== "charge.success") return NextResponse.json({ ok: true });

  const db = createSupabaseServerClient();
  const { reference, amount, currency } = event.data;
  const { data: order } = await db.from("payment_orders").select("*").eq("paystack_reference", reference).maybeSingle();
  if (!order || order.status === "success") return NextResponse.json({ ok: true }); // idempotent
  if (order.amount_kobo !== amount || order.currency !== currency) return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });

  const { error } = await db.from("payment_orders").update({ status: "success", verified_at: new Date().toISOString() }).eq("id", order.id).eq("status", "pending");
  if (!error && order.user_id) await db.from("profiles").update({ plan: order.plan, plan_expires_at: new Date(Date.now() + 30 * 86400000).toISOString() }).eq("id", order.user_id);
  return NextResponse.json({ ok: true });
}
