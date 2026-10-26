import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const reference = new URL(request.url).searchParams.get("reference");
  const parsed = z.string().min(5).max(100).safeParse(reference);
  if (!parsed.success) return NextResponse.json({ error: "A valid transaction reference is required." }, { status: 400 });
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return NextResponse.json({ error: "Paystack is not configured on the server." }, { status: 503 });

  try {
    const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(parsed.data)}`, {
      headers: { Authorization: `Bearer ${secret}` }, cache: "no-store",
    });
    const payload = await response.json();
    if (!response.ok || !payload.status) return NextResponse.json({ verified: false, error: "Could not verify this transaction." }, { status: 502 });
    const data = payload.data;
    const verified = data.status === "success" && data.currency === "NGN";

    // Activate the plan only after Paystack confirms the payment AND it matches our own pending order.
    // Idempotent: the expiry date is based on the first verification time, so repeat calls change nothing.
    let activated = false;
    if (verified) {
      const db = createSupabaseServerClient();
      const { data: order } = await db.from("payment_orders").select("*").eq("paystack_reference", data.reference).maybeSingle();
      if (order && Number(order.amount_kobo) === Number(data.amount) && order.currency === data.currency) {
        const base = order.verified_at ? new Date(order.verified_at).getTime() : Date.now();
        if (order.status !== "success") {
          await db.from("payment_orders").update({ status: "success", verified_at: new Date(base).toISOString() }).eq("id", order.id).eq("status", "pending");
        }
        if (order.user_id) {
          const { data: rows } = await db.from("profiles")
            .update({ plan: order.plan, plan_expires_at: new Date(base + 30 * 86400000).toISOString() })
            .eq("id", order.user_id).select("id");
          activated = !!rows && rows.length > 0;
        }
      }
    }
    return NextResponse.json({ verified, activated, status: data.status, reference: data.reference });
  } catch {
    return NextResponse.json({ verified: false, error: "Could not reach Paystack." }, { status: 502 });
  }
}
