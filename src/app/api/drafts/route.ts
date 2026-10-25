import { NextResponse } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/supabase/session";

export const runtime = "nodejs";
const Input = z.object({
  platform: z.enum(["YouTube", "Facebook", "X"]),
  topic: z.string().trim().min(3).max(1000),
  tone: z.enum(["Engaging", "Educational", "Professional", "Funny"]),
  content: z.string().trim().min(1).max(10000),
});

export async function GET() {
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const { data, error } = await supabase.from("content_drafts").select("id,platform,topic,content,created_at").order("created_at", { ascending: false }).limit(20);
  if (error) return NextResponse.json({ error: "Could not load drafts." }, { status: 500 });
  return NextResponse.json({ drafts: data });
}

export async function POST(request: Request) {
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const parsed = Input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid draft." }, { status: 400 });
  const { error } = await supabase.from("content_drafts").insert({ ...parsed.data, user_id: user.id });
  if (error) return NextResponse.json({ error: "Could not save draft." }, { status: 500 });
  return NextResponse.json({ saved: true });
}
