import { NextResponse } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/supabase/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { LIMITS, effectivePlan } from "@/lib/plan";

export const runtime = "nodejs";
const Input = z.object({
  platform: z.enum(["YouTube", "Facebook", "X", "Instagram", "TikTok"]),
  topic: z.string().trim().min(3).max(200),
  posts_per_day: z.number().int().min(1).max(10),
  days: z.number().int().min(1).max(30),
  start_date: z.string().date(),
});
const ANGLES = [
  "Quick tip about {t}", "Common mistake people make with {t}", "Question for your audience about {t}",
  "Myth vs fact: {t}", "Step-by-step: how to start with {t}", "Short story or example about {t}",
  "Top 3 things to know about {t}", "Your own experience with {t}", "Invite followers to comment about {t}", "Recap and what comes next in {t}",
];
const FREE_DAYS = 30;

export async function POST(request: Request) {
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const p = Input.safeParse(await request.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "Please check the form." }, { status: 400 });
  const { platform, topic, posts_per_day: n, days, start_date } = p.data;

  const { data: prof } = await supabase.from("profiles").select("plan,plan_expires_at,trial_started_at").eq("id", user.id).maybeSingle();
  const plan = effectivePlan(prof?.plan ?? null, prof?.plan_expires_at ?? null);
  const db = createSupabaseServerClient();

  if (plan === "free") {
    const started = prof?.trial_started_at ? new Date(prof.trial_started_at) : null;
    if (started && Date.now() > started.getTime() + FREE_DAYS * 86400000)
      return NextResponse.json({ error: "Your free month has ended. Boost to continue.", needBoost: true }, { status: 402 });
  }
  if (n > LIMITS[plan]) return NextResponse.json({ error: `Your plan allows up to ${LIMITS[plan]} posts per day. Boost for more.`, needBoost: true }, { status: 402 });

  const { count } = await supabase.from("content_plans").select("id", { count: "exact", head: true });
  if ((count ?? 0) + n * days > 600) return NextResponse.json({ error: "Too many scheduled posts. Delete some first." }, { status: 400 });

  const rows: object[] = [];
  const base = Date.UTC(+start_date.slice(0, 4), +start_date.slice(5, 7) - 1, +start_date.slice(8, 10));
  for (let d = 0; d < days; d++) {
    const day = new Date(base + d * 86400000).toISOString().slice(0, 10);
    for (let i = 0; i < n; i++) {
      const mins = n === 1 ? 12 * 60 : 7 * 60 + Math.round((840 * i) / (n - 1)); // 07:00 to 21:00 (Nigeria time)
      const hh = String(Math.floor(mins / 60)).padStart(2, "0"), mm = String(mins % 60).padStart(2, "0");
      rows.push({
        user_id: user.id, platform, status: "planned",
        title: ANGLES[(d * n + i) % ANGLES.length].replace("{t}", topic).slice(0, 200),
        notes: `Auto plan · day ${d + 1}, post ${i + 1}`,
        scheduled_for: new Date(`${day}T${hh}:${mm}:00+01:00`).toISOString(),
      });
    }
  }
  const { error } = await supabase.from("content_plans").insert(rows);
  if (error) return NextResponse.json({ error: "Could not create the plan." }, { status: 500 });
  if (plan === "free" && !prof?.trial_started_at) await db.from("profiles").update({ trial_started_at: new Date().toISOString() }).eq("id", user.id);
  return NextResponse.json({ created: rows.length, plan });
}
