"use client";
import { useEffect, useState } from "react";

export default function Callback() {
  const [state, setState] = useState("Checking your payment…");
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const ref = q.get("reference") || q.get("trxref");
    if (!ref) return setState("No payment reference found.");
    fetch(`/api/payments/verify?reference=${encodeURIComponent(ref)}`).then(r => r.json()).then(d => {
      if (d.activated) setState("Payment confirmed. Your Boost is now active.");
      else if (d.verified) setState("Payment received, but activation did not finish. Contact support with this reference: " + ref);
      else setState("Payment not confirmed yet. If you were charged, contact support with this reference: " + ref);
    }).catch(() => setState("Could not check payment. Try again later."));
  }, []);
  return <main className="dashboardShell"><section className="card studio" style={{ marginTop: 60 }}><h2>Payment status</h2><p>{state}</p><a className="button primary" href="/dashboard">Go to dashboard</a></section></main>;
}
