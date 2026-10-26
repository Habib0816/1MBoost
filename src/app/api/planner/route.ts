
import { NextResponse } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/supabase/session";

export const runtime = "nodejs";
const P = ["YouTube", "Facebook", "X", "Instagram", "TikTok"] as const;
const MediaType = z.enum(["image", "video"]);
const Input = z.object({
  platform: z.enum(P),
  title: z.string().trim().min(3).max(200),
  notes: z.string().trim().max(2000).optional(),
  scheduled_for: z.string().datetime({ offset: true }),
  media_url: z.string().url().max(500).optional(),
  media_type: MediaType.optional(),
});
const Attach = z.object({
  id: z.string().uuid(),
  media_url: z.string().url().max(500).nullable(),
  media_type: MediaType.nullable(),
});
// Only files this user uploaded to our own storage bucket are accepted.
const mediaOk = (url: string, uid: string) =>
  url.startsWith(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/post-media/${uid}/`);

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
  if (p.data.media_url && (!p.data.media_type || !mediaOk(p.data.media_url, user.id)))
    return NextResponse.json({ error: "Invalid media file." }, { status: 400 });
  const { error } = await supabase.from("content_plans").insert({ ...p.data, user_id: user.id });
  if (error) return NextResponse.json({ error: "Could not save." }, { status: 500 });
  return NextResponse.json({ saved: true });
}
export async function PATCH(request: Request) {
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const p = Attach.safeParse(await request.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  if (p.data.media_url && (!p.data.media_type || !mediaOk(p.data.media_url, user.id)))
    return NextResponse.json({ error: "Invalid media file." }, { status: 400 });
  const { error } = await supabase.from("content_plans").update({ media_url: p.data.media_url, media_type: p.data.media_type }).eq("id", p.data.id);
  if (error) return NextResponse.json({ error: "Could not attach the file." }, { status: 500 });
  return NextResponse.json({ saved: true });
}
export async function DELETE(request: Request) {
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id") || "";
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  const { data: row } = await supabase.from("content_plans").select("media_url").eq("id", id).maybeSingle();
  await supabase.from("content_plans").delete().eq("id", id);
  const path = row?.media_url?.split("/post-media/")[1];
  if (path) await supabase.storage.from("post-media").remove([decodeURIComponent(path)]);
  return NextResponse.json({ deleted: true });
}
