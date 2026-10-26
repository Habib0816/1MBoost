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
  lang: z.enum(["ha", "en", "ar", "fr", "sw", "yo", "ig", "zh"]).default("ha"),
});
const ANGLES: Record<string, string[]> = {
  ha: ["Shawara a taƙaice kan {t}", "Kuskuren da mutane ke yi game da {t}", "Tambaya ga masu bibiyarka kan {t}", "Gaskiya ko jita-jita: {t}", "Yadda ake farawa da {t}, mataki-mataki", "Labari ko misali game da {t}", "Muhimman abubuwa 3 da ya kamata a sani game da {t}", "Abin da ka gani ko ka fuskanta game da {t}", "Gayyaci masu bibiyarka su yi tsokaci kan {t}", "Taƙaitawa da abin da zai biyo baya kan {t}"],
  en: ["Quick tip about {t}", "Common mistake people make with {t}", "Question for your audience about {t}", "Myth vs fact: {t}", "Step-by-step: how to start with {t}", "Short story or example about {t}", "Top 3 things to know about {t}", "Your own experience with {t}", "Invite followers to comment about {t}", "Recap and what comes next in {t}"],
  ar: ["نصيحة سريعة حول {t}", "خطأ شائع يقع فيه الناس بخصوص {t}", "سؤال لمتابعيك حول {t}", "حقيقة أم خرافة: {t}", "كيف تبدأ مع {t} خطوة بخطوة", "قصة قصيرة أو مثال عن {t}", "3 أمور مهمة يجب معرفتها عن {t}", "تجربتك الشخصية مع {t}", "ادعُ متابعيك إلى التعليق حول {t}", "ملخّص وما سيأتي بعد ذلك حول {t}"],
  fr: ["Conseil rapide sur {t}", "Erreur courante à propos de {t}", "Question à poser à votre audience sur {t}", "Mythe ou réalité : {t}", "Comment commencer avec {t}, étape par étape", "Petite histoire ou exemple sur {t}", "3 choses essentielles à savoir sur {t}", "Votre expérience personnelle avec {t}", "Invitez vos abonnés à commenter sur {t}", "Récapitulatif et suite du sujet : {t}"],
  sw: ["Ushauri wa haraka kuhusu {t}", "Kosa la kawaida watu hufanya kuhusu {t}", "Swali kwa wafuasi wako kuhusu {t}", "Ukweli au uzushi: {t}", "Jinsi ya kuanza na {t}, hatua kwa hatua", "Hadithi fupi au mfano kuhusu {t}", "Mambo 3 muhimu ya kujua kuhusu {t}", "Uzoefu wako binafsi kuhusu {t}", "Waalike wafuasi wako watoe maoni kuhusu {t}", "Muhtasari na kinachofuata kuhusu {t}"],
  yo: ["Ìmọ̀ràn kíákíá lórí {t}", "Àṣìṣe tí àwọn ènìyàn máa ń ṣe nípa {t}", "Ìbéèrè fún àwọn olùtẹ̀lé rẹ lórí {t}", "Òtítọ́ tàbí àhesọ: {t}", "Bí a ṣe lè bẹ̀rẹ̀ pẹ̀lú {t}, ní ìgbésẹ̀ kọ̀ọ̀kan", "Ìtàn kúkúrú tàbí àpẹẹrẹ nípa {t}", "Àwọn nǹkan pàtàkì mẹ́ta láti mọ̀ nípa {t}", "Ìrírí ara rẹ nípa {t}", "Késí àwọn olùtẹ̀lé rẹ láti sọ èrò wọn lórí {t}", "Àkópọ̀ àti ohun tí ó tẹ̀lé e nípa {t}"],
  ig: ["Ndụmọdụ dị mkpirikpi gbasara {t}", "Njehie ndị mmadụ na-eme gbasara {t}", "Ajụjụ maka ndị na-eso gị gbasara {t}", "Eziokwu ma ọ bụ asịrị: {t}", "Otu esi amalite {t}, nzọụkwụ site na nzọụkwụ", "Akụkọ dị mkpirikpi ma ọ bụ ihe atụ gbasara {t}", "Ihe atọ dị mkpa ịmata gbasara {t}", "Ahụmịhe nke gị gbasara {t}", "Kpọọ ndị na-eso gị ka ha kwuo echiche ha gbasara {t}", "Nchịkọta na ihe na-esote gbasara {t}"],
  zh: ["关于{t}的小贴士", "人们在{t}上常犯的错误", "向粉丝提问：你怎么看{t}？", "真相还是谣言：{t}", "如何开始{t}：一步一步来", "关于{t}的小故事或例子", "关于{t}必须知道的3件事", "你自己在{t}方面的经验", "邀请粉丝就{t}留言评论", "回顾总结以及{t}的下一步"],
};
const FREE_DAYS = 30;

export async function POST(request: Request) {
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const p = Input.safeParse(await request.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "Please check the form." }, { status: 400 });
  const { platform, topic, posts_per_day: n, days, start_date, lang } = p.data;

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
        title: ANGLES[lang][(d * n + i) % ANGLES[lang].length].replace("{t}", topic).slice(0, 200),
        notes: `Auto · ${d + 1}/${days} · ${i + 1}/${n}`,
        scheduled_for: new Date(`${day}T${hh}:${mm}:00+01:00`).toISOString(),
      });
    }
  }
  const { error } = await supabase.from("content_plans").insert(rows);
  if (error) return NextResponse.json({ error: "Could not create the plan." }, { status: 500 });
  if (plan === "free" && !prof?.trial_started_at) await db.from("profiles").update({ trial_started_at: new Date().toISOString() }).eq("id", user.id);
  return NextResponse.json({ created: rows.length, plan });
}
