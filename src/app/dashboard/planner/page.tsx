"use client";
import { useEffect, useState } from "react";

type Item = { id: string; platform: string; title: string; notes: string | null; scheduled_for: string };

export default function Planner() {
  const [items, setItems] = useState<Item[]>([]);
  const [f, setF] = useState({ platform: "YouTube", title: "", notes: "", when: "" });
  const [err, setErr] = useState("");
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const [a, setA] = useState({ platform: "Facebook", topic: "", perDay: "3", days: "30", start: tomorrow, lang: "ha" });
  const [aMsg, setAMsg] = useState("");
  const [needBoost, setNeedBoost] = useState(false);
  const [busy, setBusy] = useState(false);
  const [links, setLinks] = useState<{ platform: string; url: string }[]>([]);
  useEffect(() => { fetch("/api/accounts").then(r => r.ok ? r.json() : null).then(d => d && setLinks(d.items)); }, []);

  async function autoPlan() {
    setBusy(true); setAMsg(""); setNeedBoost(false);
    const r = await fetch("/api/planner/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ platform: a.platform, topic: a.topic, posts_per_day: Number(a.perDay), days: Number(a.days), start_date: a.start, lang: a.lang }) });
    const d = await r.json(); setBusy(false);
    if (!r.ok) { setNeedBoost(!!d.needBoost); return setAMsg(d.error || "Could not create the plan."); }
    setAMsg(`Done. ${d.created} posts added to your calendar below.`); load();
  }

  async function load() { const r = await fetch("/api/planner"); if (r.ok) setItems((await r.json()).items); }
  useEffect(() => { load(); }, []);

  async function add() {
    setErr("");
    const r = await fetch("/api/planner", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ platform: f.platform, title: f.title, notes: f.notes || undefined, scheduled_for: new Date(f.when).toISOString() }) });
    if (!r.ok) return setErr((await r.json()).error || "Could not save.");
    setF({ ...f, title: "", notes: "" }); load();
  }
  async function del(id: string) { await fetch(`/api/planner?id=${id}`, { method: "DELETE" }); load(); }

  return <main className="dashboardShell">
    <a className="back" href="/dashboard">← Dashboard</a>
    <div className="dashboardHead"><div><p className="eyebrow">PUBLISHING PLANNER</p><h1>Posting calendar</h1><p className="intro">Plan what to post and when. Consistent posting helps real growth.</p></div></div>
    <section className="studio card" style={{ marginBottom: 20 }}>
      <p className="eyebrow">AUTO PLAN</p><h2>Plan my posts for me</h2>
      <p className="fineprint">Free: up to 3 posts a day for 30 days. Need more posts per day, or a new month after the free month ends? Boost.</p>
      <label>What do you post about?<input className="input" value={a.topic} onChange={e => setA({ ...a, topic: e.target.value })} placeholder="Example: learning English" /></label>
      <label>Post language<select value={a.lang} onChange={e => setA({ ...a, lang: e.target.value })}>{[["ha", "Hausa"], ["en", "English"], ["ar", "العربية (Arabic)"], ["fr", "Français (French)"], ["sw", "Kiswahili"], ["yo", "Yorùbá"], ["ig", "Igbo"], ["zh", "中文 (Chinese)"]].map(([v, n]) => <option key={v} value={v}>{n}</option>)}</select></label>
      <div className="formRow"><label>Platform<select value={a.platform} onChange={e => setA({ ...a, platform: e.target.value })}>{["Facebook", "Instagram", "YouTube", "X", "TikTok"].map(p => <option key={p}>{p}</option>)}</select></label>
        <label>Start date<input type="date" className="input" value={a.start} onChange={e => setA({ ...a, start: e.target.value })} /></label></div>
      {(() => { const l = links.find(x => x.platform === a.platform); return l
        ? <p className="fineprint">Posting to: <a className="back" href={l.url} target="_blank" rel="noopener noreferrer">{l.url}</a></p>
        : <p className="fineprint">No {a.platform} link yet. <a className="back" href="/dashboard/accounts">Add your link →</a></p>; })()}
      <div className="formRow"><label>Posts per day (1 to 10)<input type="number" min={1} max={10} className="input" value={a.perDay} onChange={e => setA({ ...a, perDay: e.target.value })} /></label>
        <label>Number of days (1 to 30)<input type="number" min={1} max={30} className="input" value={a.days} onChange={e => setA({ ...a, days: e.target.value })} /></label></div>
      <button className="button primary full" disabled={busy || a.topic.trim().length < 3} onClick={autoPlan}>{busy ? "Please wait…" : "Create my posting plan"}</button>
      {aMsg && <p className={needBoost ? "error" : "fineprint"}>{aMsg} {needBoost && <a className="back" href="/dashboard#boost">Boost →</a>}</p>}
    </section>
    <section className="studio card">
      <div className="formRow"><label>Platform<select value={f.platform} onChange={e => setF({ ...f, platform: e.target.value })}>{["YouTube", "Facebook", "X", "Instagram", "TikTok"].map(p => <option key={p}>{p}</option>)}</select></label>
        <label>Date and time<input type="datetime-local" className="input" value={f.when} onChange={e => setF({ ...f, when: e.target.value })} /></label></div>
      <label>Post idea<input className="input" value={f.title} onChange={e => setF({ ...f, title: e.target.value })} placeholder="Example: 3 tips to learn English fast" /></label>
      <label>Notes (optional)<textarea rows={3} value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} /></label>
      <button className="button primary full" disabled={f.title.trim().length < 3 || !f.when} onClick={add}>Add to calendar</button>
      {err && <p className="error">{err}</p>}
    </section>
    <div className="draftList">{items.length === 0 && <p className="fineprint">No planned posts yet.</p>}
      {items.map(i => <div className="draftItem" key={i.id}><b>{i.platform}</b> · {new Date(i.scheduled_for).toLocaleString()}<br />{i.title}{i.notes ? `\n${i.notes}` : ""}<br /><a href="#" className="back" onClick={e => { e.preventDefault(); del(i.id); }}>Delete</a></div>)}</div>
  </main>;
}
