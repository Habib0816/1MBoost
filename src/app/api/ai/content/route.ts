import { NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";
import { getUser } from "@/lib/supabase/session";

export const runtime = "nodejs";
const Input = z.object({
  topic: z.string().trim().min(3).max(1000),
  platform: z.enum(["YouTube", "Facebook", "X"]),
  tone: z.enum(["Engaging", "Educational", "Professional", "Funny"]).default("Engaging"),
});

export async function POST(request: Request) {
  const { user } = await getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const parsed = Input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Please provide a topic and valid platform/tone." }, { status: 400 });
  if (!process.env.AI_API_KEY) return NextResponse.json({ error: "AI is not configured yet. Add AI_API_KEY to your server environment." }, { status: 503 });

  try {
    const client = new OpenAI({
      apiKey: process.env.AI_API_KEY.trim(),
      baseURL: (process.env.AI_BASE_URL || "https://api.openai.com/v1").trim(),
    });
    const response = await client.chat.completions.create({
      model: (process.env.AI_MODEL || "gpt-4o-mini").trim(),
      messages: [
        { role: "system", content: "You are 1MBoost AI, a responsible social media content assistant. Create original, platform-appropriate drafts. Write the draft in the same language as the topic (for example Hausa if the topic is written in Hausa). Do not promise viral results, fabricate facts, encourage fake engagement, or suggest platform-rule evasion. Clearly flag claims that need fact-checking, and for religious topics advise checking sources with a qualified scholar." },
        { role: "user", content: `Create a useful ${parsed.data.tone.toLowerCase()} content draft for ${parsed.data.platform}. Topic: ${parsed.data.topic}. Include a strong opening, main draft, a suitable call to action, and relevant hashtags where appropriate. For YouTube, include a title and description. Keep it ready for human review.` }
      ],
      temperature: 0.7,
      max_tokens: 1500,
    });
    const content = response.choices[0]?.message?.content?.trim();
    if (!content) throw new Error("The AI provider returned an empty response.");
    return NextResponse.json({ content });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "unknown error";
    console.error("AI content endpoint failed:", msg);
    return NextResponse.json({ error: `AI generation failed: ${msg}`.slice(0, 300) }, { status: 502 });
  }
}
