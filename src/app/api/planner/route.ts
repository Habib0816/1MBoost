import { NextResponse } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/supabase/session";

export const runtime = "nodejs";
const P = ["YouTube", "Facebook", "X", "Instagram", "TikTok"] as const;
const Input = z.object({ platform: z.enum(P), title: z.string().trim().min(3).max(200), notes: z.string().trim().max(2000).optional(), scheduled_for: z.string().datetime({ offset: true }) });

export async function GET() {
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const { data, error } = await supabase.from("content_plans").select("*").order("scheduled_for");
  if (error) return NextResponse.json({ error: "Could not load plans." }, { status: 500 });
  return NextResponse.json({ items: data });
}
export async function POST(request: Request) {
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const p = Input.safeParse(await request.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "Invalid plan." }, { status: 400 });
  const { error } = await supabase.from("content_plans").insert({ ...p.data, user_id: user.id });
  if (error) return NextResponse.json({ error: "Could not save." }, { status: 500 });
  return NextResponse.json({ saved: true });
}
export async function DELETE(request: Request) {
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id") || "";
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  await supabase.from("content_plans").delete().eq("id", id);
  return NextResponse.json({ deleted: true });
}
