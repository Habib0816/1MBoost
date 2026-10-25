import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const reference = new URL(request.url).searchParams.get("reference");
  const parsed = z.string().min(5).max(100).safeParse(reference);
  if (!parsed.success) return NextResponse.json({ error: "A valid transaction reference is required." }, { status: 400 });
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return NextResponse.json({ error: "Paystack is not configured on the server." }, { status: 503 });

  try {
    const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(parsed.data)}`, {
      headers: { Authorization: `Bearer ${secret}` }, cache: "no-store"
    });
    const payload = await response.json();
    if (!response.ok || !payload.status) return NextResponse.json({ verified: false, error: "Could not verify this transaction." }, { status: 502 });
    const data = payload.data;
    const verified = data.status === "success" && data.currency === "NGN";
    // TODO production: confirm amount/reference against a pending DB order, then update subscription idempotently.
    return NextResponse.json({
      verified,
      status: data.status,
      currency: data.currency,
      amount_kobo: data.amount,
      reference: data.reference,
      note: "This endpoint reports Paystack's verification result only. It does not activate a subscription until database order checks and webhook handling are implemented."
    });
  } catch {
    return NextResponse.json({ verified: false, error: "Could not reach Paystack." }, { status: 502 });
  }
}
