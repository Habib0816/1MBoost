"use client";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const withTimeout = <T,>(p: Promise<T>) =>
  Promise.race([p, new Promise<never>((_, rej) => setTimeout(() => rej(new Error("No response from the server. Check your connection and try again.")), 20000))]);

export default function Login() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (new URLSearchParams(window.location.search).get("mode") === "up") setMode("up"); }, []);

  async function submit() {
    setLoading(true); setMsg("");
    try {
      const supabase = createSupabaseBrowserClient();
      if (mode === "in") {
        const { error } = await withTimeout(supabase.auth.signInWithPassword({ email, password }));
        if (error) throw error;
        window.location.href = "/dashboard";
      } else {
        const { data, error } = await withTimeout(supabase.auth.signUp({ email, password }));
        if (error) throw error;
        if (data.session) { window.location.href = "/dashboard"; return; }
        setMsg("Account created. Check your email to confirm, then sign in.");
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return <main className="dashboardShell">
    <a className="back" href="/">← Back to home</a>
    <section className="studio card" style={{ marginTop: 40 }}>
      <p className="eyebrow">{mode === "in" ? "WELCOME BACK" : "CREATE ACCOUNT"}</p>
      <h2>{mode === "in" ? "Sign in" : "Sign up"}</h2>
      <label>Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input" /></label>
      <label>Password<input type="password" minLength={8} value={password} onChange={e => setPassword(e.target.value)} className="input" /></label>
      <button className="button primary full" disabled={loading || !email || password.length < 8} onClick={submit}>{loading ? "Please wait…" : mode === "in" ? "Sign in" : "Sign up"}</button>
      {msg && <p className="error">{msg}</p>}
      <p className="fineprint"><a href="#" onClick={e => { e.preventDefault(); setMode(mode === "in" ? "up" : "in"); setMsg(""); }}>{mode === "in" ? "No account? Sign up" : "Have an account? Sign in"}</a></p>
    </section>
  </main>;
}
