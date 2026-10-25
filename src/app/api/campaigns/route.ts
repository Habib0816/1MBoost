import { NextResponse } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/supabase/session";

export const runtime = "nodejs";
const Input = z.object({
  platform: z.enum(["YouTube", "Facebook", "X", "Instagram", "TikTok"]),
  goal: z.enum(["Views", "Followers", "Engagement", "Website visits"]),
  budget_ngn: z.number().int().min(1000).max(100000000),
  start_date: z.string().date(), end_date: z.string().date(),
  audience: z.string().trim().max(1000).optional(),
}).refine(d => d.end_date >= d.start_date);

export async function GET() {
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const { data, error } = await supabase.from("ad_campaigns").select("*").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: "Could not load campaigns." }, { status: 500 });
  return NextResponse.json({ items: data });
}
export async function POST(request: Request) {
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const p = Input.safeParse(await request.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "Invalid campaign." }, { status: 400 });
  const { error } = await supabase.from("ad_campaigns").insert({ ...p.data, user_id: user.id });
  if (error) return NextResponse.json({ error: "Could not save." }, { status: 500 });
  return NextResponse.json({ saved: true });
}
