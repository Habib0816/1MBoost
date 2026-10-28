"use client";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Item = { id: string; platform: string; title: string; notes: string | null; scheduled_for: string; media_url: string | null; media_type: string | null };
const ACCEPT = "image/*,video/mp4,video/quicktime,video/webm";
const HOME: Record<string, string> = { Facebook: "https://www.facebook.com/", Instagram: "https://www.instagram.com/", YouTube: "https://studio.youtube.com/", X: "https://x.com/compose/post", TikTok: "https://www.tiktok.com/upload" };
const textOf = (i: Item) => i.title + (i.notes && !i.notes.startsWith("Auto") ? "\n\n" + i.notes : "");

export default function Planner() {
  const [items, setItems] = useState<Item[]>([]);
  const [f, setF] = useState({ platform: "YouTube", title: "", notes: "", when: "" });
  const [file, setFile] = useState<File | null>(null);
  const [fileKey, setFileKey] = useState(0);
  const [err, setErr] = useState("");
  const [toast, setToast] = useState("");
  const [up, setUp] = useState("");
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const [a, setA] = useState({ platform: "Facebook", topic: "", perDay: "3", days: "30", start: tomorrow, lang: "ha" });
  const [aMsg, setAMsg] = useState("");
  const [needBoost, setNeedBoost] = useState(false);
  const [busy, setBusy] = useState(false);
  const [links, setLinks] = useState<{ platform: string; url: string }[]>([]);
  useEffect(() => { fetch("/api/accounts").then(r => r.ok ? r.json() : null).then(d => d && setLinks(d.items)); }, []);

  async function copy(i: Item) {
    try { await navigator.clipboard.writeText(textOf(i)); setToast("Copied. Paste it in your post."); }
    catch { setToast("Could not copy. Press and hold the text to copy it."); }
  }
  async function postNow(i: Item) {
    if (i.platform === "X") { window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(textOf(i).slice(0, 270))}`, "_blank", "noopener"); return; }
    await copy(i);
    const link = links.find(l => l.platform === i.platform)?.url;
    window.open(link || HOME[i.platform], "_blank", "noopener");
  }

  async function upload(file: File): Promise<{ url: string; type: "image" | "video" } | null> {
    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");
    if (!isVideo && !isImage) { setErr("Choose a photo or a video."); return null; }
    if (file.size > (isVideo ? 50 : 5) * 1024 * 1024) { setErr(isVideo ? "Video must be under 50 MB." : "Photo must be under 5 MB."); return null; }
    const supabase = createSupabaseBrowserClient();
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setErr("Please sign in again."); return null; }
    const ext = (file.name.split(".").pop() || (isVideo ? "mp4" : "jpg")).toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "bin";
    const path = `${u.user.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("post-media").upload(path, file, { contentType: file.type });
    if (error) { setErr("Upload failed: " + error.message); return null; }
    const { data } = supabase.storage.from("post-media").getPublicUrl(path);
    return { url: data.publicUrl, type: isVideo ? "video" : "image" };
  }

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
    setErr(""); setUp("new");
    let media: { url: string; type: "image" | "video" } | null = null;
    if (file) { media = await upload(file); if (!media) { setUp(""); return; } }
    const r = await fetch("/api/planner", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ platform: f.platform, title: f.title, notes: f.notes || undefined, scheduled_for: new Date(f.when).toISOString(), ...(media ? { media_url: media.url, media_type: media.type } : {}) }) });
    setUp("");
    if (!r.ok) return setErr((await r.json()).error || "Could not save.");
    setF({ ...f, title: "", notes: "" }); setFile(null); setFileKey(k => k + 1); load();
  }
  async function attach(id: string, file: File) {
    setErr(""); setUp(id);
    const m = await upload(file);
    if (m) {
      const r = await fetch("/api/planner", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, media_url: m.url, media_type: m.type }) });
      if (!r.ok) setErr((await r.json()).error || "Could not attach the file.");
    }
    setUp(""); load();
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
      <label>Photo or video (optional)<input key={fileKey} type="file" accept={ACCEPT} className="input" onChange={e => setFile(e.target.files?.[0] ?? null)} /></label>
      <p className="fineprint">Photo up to 5 MB, video up to 50 MB.</p>
      <button className="button primary full" disabled={up === "new" || f.title.trim().length < 3 || !f.when} onClick={add}>{up === "new" ? "Please wait…" : "Add to calendar"}</button>
    </section>
    {err && <p className="error">{err}</p>}
    {toast && <p className="fineprint">{toast}</p>}
    <div className="draftList">{items.length === 0 && <p className="fineprint">No planned posts yet.</p>}
      {items.map(i => <div className="draftItem" key={i.id}>
        <b>{i.platform}</b> · {new Date(i.scheduled_for).toLocaleString()}<br />{i.title}{i.notes ? `\n${i.notes}` : ""}
        {i.media_url && (i.media_type === "video"
          ? <video src={i.media_url} controls playsInline preload="metadata" style={{ width: "100%", borderRadius: 12, marginTop: 8 }} />
          : <img src={i.media_url} alt="" style={{ width: "100%", borderRadius: 12, marginTop: 8 }} />)}
        <br />
        <a href="#" className="back" onClick={e => { e.preventDefault(); copy(i); }}>Copy</a>{" · "}
        <a href="#" className="back" onClick={e => { e.preventDefault(); postNow(i); }}>Post now</a>{" · "}
        {i.media_url && <><a className="back" href={i.media_url} target="_blank" rel="noopener noreferrer">Open / save file</a> · </>}
        <label className="back" style={{ cursor: "pointer" }}>{up === i.id ? "Uploading…" : i.media_url ? "Replace file" : "Attach photo/video"}
          <input type="file" accept={ACCEPT} hidden disabled={!!up} onChange={e => { const fl = e.target.files?.[0]; if (fl) attach(i.id, fl); e.target.value = ""; }} /></label>
        {" · "}<a href="#" className="back" onClick={e => { e.preventDefault(); del(i.id); }}>Delete</a>
      </div>)}</div>
  </main>;
}
