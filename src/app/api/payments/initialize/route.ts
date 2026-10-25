import { NextResponse } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/supabase/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
const Input = z.object({
    plan: z.enum(["starter", "professional"]),
});

export async function POST(request: Request) {
  const { user } = await getUser();
  if (!user || !user.email) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const parsed = Input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Provide a valid plan." }, { status: 400 });
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return NextResponse.json({ error: "Paystack is not configured on the server." }, { status: 503 });

  const amount = parsed.data.plan === "starter"
    ? Number(process.env.PAYSTACK_STARTER_AMOUNT_KOBO || 500000)
    : Number(process.env.PAYSTACK_PRO_AMOUNT_KOBO || 1500000);

  if (!Number.isSafeInteger(amount) || amount <= 0) return NextResponse.json({ error: "Invalid plan amount configuration." }, { status: 500 });

  const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  const reference = `1mb_${crypto.randomUUID().replaceAll("-", "")}`;

  try {
    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        email: user.email,
        amount,
        currency: "NGN",
        reference,
        callback_url: `${origin}/payment/callback`,
        metadata: { plan: parsed.data.plan, product: "1MBoost AI" }
      }),
      cache: "no-store",
    });
    const payload = await response.json();
    if (!response.ok || !payload.status) return NextResponse.json({ error: "Paystack could not initialize the transaction." }, { status: 502 });
    const { error: dbError } = await createSupabaseServerClient().from("payment_orders").insert({ user_id: user.id, email: user.email, plan: parsed.data.plan, amount_kobo: amount, paystack_reference: reference });
    if (dbError) return NextResponse.json({ error: "Could not record the order." }, { status: 500 });
    return NextResponse.json({
      authorization_url: payload.data.authorization_url,
      reference: payload.data.reference,
      message: "Redirect the customer to authorization_url. Verify the payment server-side before granting a subscription."
    });
  } catch {
    return NextResponse.json({ error: "Could not reach Paystack. Try again later." }, { status: 502 });
  }
}
