import { NextResponse } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/supabase/session";
import { validProfileUrl } from "@/lib/social";

export const runtime = "nodejs";
const Platform = z.enum(["YouTube", "Facebook", "X", "Instagram", "TikTok"]);

export async function GET() {
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const { data, error } = await supabase.from("social_links").select("id,platform,url");
  if (error) return NextResponse.json({ error: "Could not load links." }, { status: 500 });
  return NextResponse.json({ items: data });
}
export async function POST(request: Request) {
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const body = await request.json().catch(() => null);
  const platform = Platform.safeParse(body?.platform);
  if (!platform.success || typeof body?.url !== "string") return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const url = validProfileUrl(platform.data, body.url);
  if (!url) return NextResponse.json({ error: `Paste your public ${platform.data} profile link (https://...). Never enter a password.` }, { status: 400 });
  const { error } = await supabase.from("social_links").upsert({ user_id: user.id, platform: platform.data, url }, { onConflict: "user_id,platform" });
  if (error) return NextResponse.json({ error: "Could not save." }, { status: 500 });
  return NextResponse.json({ saved: true });
}
export async function DELETE(request: Request) {
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id") || "";
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  await supabase.from("social_links").delete().eq("id", id);
  return NextResponse.json({ deleted: true });
}
