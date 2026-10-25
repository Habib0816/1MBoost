"use client";
import { useEffect, useState } from "react";

type Item = { id: string; platform: string; url: string };
const PLATFORMS = ["Facebook", "Instagram", "YouTube", "X", "TikTok"];

export default function Accounts() {
  const [items, setItems] = useState<Item[]>([]);
  const [platform, setPlatform] = useState("Facebook");
  const [url, setUrl] = useState("");
  const [msg, setMsg] = useState("");
  const [bad, setBad] = useState(false);

  async function load() { const r = await fetch("/api/accounts"); if (r.ok) setItems((await r.json()).items); }
  useEffect(() => { load(); }, []);

  async function save() {
    setMsg(""); setBad(false);
    const r = await fetch("/api/accounts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ platform, url }) });
    const d = await r.json();
    if (!r.ok) { setBad(true); return setMsg(d.error || "Could not save."); }
    setUrl(""); setMsg("Link saved."); load();
  }
  async function del(id: string) { await fetch(`/api/accounts?id=${id}`, { method: "DELETE" }); load(); }

  return <main className="dashboardShell">
    <a className="back" href="/dashboard">← Dashboard</a>
    <div className="dashboardHead"><div><p className="eyebrow">MY ACCOUNTS</p><h1>Social media links</h1><p className="intro">Add the public link to your page or channel. We never ask for your username or password, and you should never share them with anyone.</p></div></div>
    <section className="studio card">
      <label>Platform<select value={platform} onChange={e => setPlatform(e.target.value)}>{PLATFORMS.map(p => <option key={p}>{p}</option>)}</select></label>
      <label>Profile link<input className="input" inputMode="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://www.facebook.com/your.page" /></label>
      <button className="button primary full" disabled={url.trim().length < 10} onClick={save}>Save link</button>
      {msg && <p className={bad ? "error" : "fineprint"}>{msg}</p>}
    </section>
    <div className="draftList">{items.length === 0 && <p className="fineprint">No links added yet.</p>}
      {items.map(i => <div className="draftItem" key={i.id}><b>{i.platform}</b><br /><a className="back" href={i.url} target="_blank" rel="noopener noreferrer">{i.url}</a><br /><a href="#" className="back" onClick={e => { e.preventDefault(); del(i.id); }}>Remove</a></div>)}</div>
  </main>;
}
