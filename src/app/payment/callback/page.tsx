"use client";
import { useEffect, useState } from "react";

export default function Callback() {
  const [state, setState] = useState("Checking your payment…");
  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get("reference") || new URLSearchParams(window.location.search).get("trxref");
    if (!ref) return setState("No payment reference found.");
    fetch(`/api/payments/verify?reference=${encodeURIComponent(ref)}`).then(r => r.json()).then(d =>
      setState(d.verified ? "Payment received. Your plan will be activated shortly once Paystack confirms it." : "Payment not confirmed yet. If you were charged, contact support with your reference."))
      .catch(() => setState("Could not check payment. Try again later."));
  }, []);
  return <main className="dashboardShell"><section className="card studio" style={{ marginTop: 60 }}><h2>Payment status</h2><p>{state}</p><a className="button primary" href="/dashboard">Go to dashboard</a></section></main>;
}
