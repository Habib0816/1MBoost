 "use client";
import { useEffect, useState } from "react";
import { effectivePlan } from "@/lib/plan";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function Dashboard() {
  const [topic, setTopic] = useState("");
  const [platform, setPlatform] = useState("YouTube");
  const [tone, setTone] = useState("Engaging");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [plan, setPlan] = useState("free");
  const [paying, setPaying] = useState("");

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.from("profiles").select("plan,plan_expires_at").maybeSingle().then(({ data }) => { setPlan(effectivePlan(data?.plan ?? null, data?.plan_expires_at ?? null)); });
  }, []);

  async function boost(p: "starter" | "professional") {
    setPaying(p); setError("");
    try {
      const r = await fetch("/api/payments/initialize", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan: p }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Could not start payment.");
      window.location.href = d.authorization_url;
    } catch (e) { setError(e instanceof Error ? e.message : "Something went wrong."); setPaying(""); }
  }

  async function signOut() { await createSupabaseBrowserClient().auth.signOut(); window.location.href = "/"; }

  async function save() {
    const r = await fetch("/api/drafts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ topic, platform, tone, content: result }) });
    if (r.ok) setSaved(true); else setError("Could not save draft.");
  }

  async function generate() {
    setLoading(true); setError(""); setResult(""); setSaved(false);
    try {
      const response = await fetch("/api/ai/content", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, platform, tone })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not generate content.");
      setResult(data.content);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally { setLoading(false); }
  }

  return <main className="dashboardShell">
    <a className="back" href="/">← Back to home</a> · <a className="back" href="/dashboard/accounts">My accounts</a> · <a className="back" href="#" onClick={e => { e.preventDefault(); signOut(); }}>Sign out</a>
    <div className="dashboardHead"><div><p className="eyebrow">CREATOR WORKSPACE</p><h1>Content Studio</h1><p className="intro">Generate a draft, then review it before publishing.</p></div><span className="pill">PLAN: {plan.toUpperCase()}</span></div>
    <section className="studio card">
      <label>What is your content about?<textarea value={topic} onChange={e => setTopic(e.target.value)} placeholder="Example: 5 surprising facts about space" rows={4}/></label>
      <div className="formRow"><label>Platform<select value={platform} onChange={e => setPlatform(e.target.value)}><option>YouTube</option><option>Facebook</option><option>X</option></select></label><label>Tone<select value={tone} onChange={e => setTone(e.target.value)}><option>Engaging</option><option>Educational</option><option>Professional</option><option>Funny</option></select></label></div>
      <button className="button primary full" disabled={loading || topic.trim().length < 3} onClick={generate}>{loading ? "Generating…" : "Generate content draft"}</button>
      {error && <p className="error">{error}</p>}
      {result && <div className="result"><h3>Your draft</h3><pre>{result}</pre><button className="button secondary" onClick={() => navigator.clipboard.writeText(result)}>Copy draft</button> <button className="button secondary" disabled={saved} onClick={save}>{saved ? "Saved ✓" : "Save draft"}</button></div>}
      <p className="fineprint">AI output may be inaccurate. Review before posting. This starter does not publish to social media automatically.</p>
    </section>
    <section className="featureGrid dashboardFeatures"><article className="feature"><div className="emoji">📅</div><h3>Publishing planner</h3><p>Plan what to post and when. <a className="back" href="/dashboard/planner">Open planner →</a></p></article><article className="feature"><div className="emoji">📣</div><h3>Campaign planner</h3><p>Plan campaign goals and budgets before spending on ads. <a className="back" href="/dashboard/campaigns">Open campaigns →</a></p></article><article className="feature"><div className="emoji">🔐</div><h3>Account security</h3><p>Connect authentication and ownership checks before opening this to customers.</p></article></section>

    <section id="boost" className="card" style={{ marginTop: 8 }}>
      <p className="eyebrow">BOOST</p>
      <h2>Want a Boost?</h2>
      <p className="intro">Everything above is free after you register. Pay only when you want a Boost.</p>
      {plan === "free" ? <div className="formRow">
        <button className="button primary" disabled={!!paying} onClick={() => boost("starter")}>{paying === "starter" ? "Please wait…" : "Boost: Starter ₦5,000"}</button>
        <button className="button primary" disabled={!!paying} onClick={() => boost("professional")}>{paying === "professional" ? "Please wait…" : "Boost: Professional ₦15,000"}</button>
      </div> : <p><b>Your {plan} Boost is active ✓ (30 days from payment, then renew)</b></p>}
    </section>
  </main>;
}
