"use client";
import { useEffect, useState } from "react";

type InstallEvent = Event & { prompt: () => Promise<void> };

export default function Pwa() {
  const [evt, setEvt] = useState<InstallEvent | null>(null);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent) && !standalone);
    const h = (e: Event) => { e.preventDefault(); setEvt(e as InstallEvent); };
    window.addEventListener("beforeinstallprompt", h);
    return () => window.removeEventListener("beforeinstallprompt", h);
  }, []);

  if (evt) return <button className="button primary installBtn" onClick={async () => { await evt.prompt(); setEvt(null); }}>⬇ Install app</button>;
  if (ios) return <p className="fineprint installBtn">iPhone: tap Share, then “Add to Home Screen” to install.</p>;
  return null;
}
