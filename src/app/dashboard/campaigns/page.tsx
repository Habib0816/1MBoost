"use client";
import { useEffect, useState } from "react";

type Item = { id: string; platform: string; goal: string; budget_ngn: number; start_date: string; end_date: string; audience: string | null };
const today = () => new Date().toISOString().slice(0, 10);

export default function Campaigns() {
  const [items, setItems] = useState<Item[]>([]);
  const [f, setF] = useState({ platform: "Facebook", goal: "Views", budget: "5000", start: today(), end: today(), audience: "" });
  const [err, setErr] = useState("");

  async function load() { const r = await fetch("/api/campaigns"); if (r.ok) setItems((await r.json()).items); }
  useEffect(() => { load(); }, []);

  const days = Math.max(1, Math.round((+new Date(f.end) - +new Date(f.start)) / 86400000) + 1);
  const perDay = Math.round(Number(f.budget || 0) / days);

  async function add() {
    setErr("");
    const r = await fetch("/api/campaigns", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ platform: f.platform, goal: f.goal, budget_ngn: Number(f.budget), start_date: f.start, end_date: f.end, audience: f.audience || undefined }) });
    if (!r.ok) return setErr((await r.json()).error || "Could not save.");
    load();
  }

  return <main className="dashboardShell">
    <a className="back" href="/dashboard">← Dashboard</a>
    <div className="dashboardHead"><div><p className="eyebrow">CAMPAIGN PLANNER</p><h1>Ad campaign plan</h1><p className="intro">Plan your goal and budget, then run the ad on the platform’s own Ads Manager (Meta, YouTube/Google, X). Real people see real ads. Results are not guaranteed.</p></div></div>
    <section className="studio card">
      <div className="formRow"><label>Platform<select value={f.platform} onChange={e => setF({ ...f, platform: e.target.value })}>{["Facebook", "Instagram", "YouTube", "X", "TikTok"].map(p => <option key={p}>{p}</option>)}</select></label>
        <label>Goal<select value={f.goal} onChange={e => setF({ ...f, goal: e.target.value })}>{["Views", "Followers", "Engagement", "Website visits"].map(p => <option key={p}>{p}</option>)}</select></label></div>
      <div className="formRow"><label>Start<input type="date" className="input" value={f.start} onChange={e => setF({ ...f, start: e.target.value })} /></label><label>End<input type="date" className="input" value={f.end} onChange={e => setF({ ...f, end: e.target.value })} /></label></div>
      <label>Total budget (₦)<input type="number" min={1000} className="input" value={f.budget} onChange={e => setF({ ...f, budget: e.target.value })} /></label>
      <p className="fineprint">About ₦{perDay.toLocaleString()} per day for {days} day(s).</p>
      <label>Audience (age, place, interests)<textarea rows={3} value={f.audience} onChange={e => setF({ ...f, audience: e.target.value })} placeholder="Example: students 16-25 in Kano, interested in education" /></label>
      <button className="button primary full" disabled={Number(f.budget) < 1000 || f.end < f.start} onClick={add}>Save campaign plan</button>
      {err && <p className="error">{err}</p>}
    </section>
    <div className="draftList">{items.length === 0 && <p className="fineprint">No campaign plans yet.</p>}
      {items.map(i => <div className="draftItem" key={i.id}><b>{i.platform} · {i.goal}</b><br />₦{i.budget_ngn.toLocaleString()} · {i.start_date} to {i.end_date}{i.audience ? `\n${i.audience}` : ""}</div>)}</div>
  </main>;
}
