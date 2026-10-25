export const DOMAINS: Record<string, string[]> = {
  Facebook: ["facebook.com", "fb.com"],
  Instagram: ["instagram.com"],
  YouTube: ["youtube.com", "youtu.be"],
  X: ["x.com", "twitter.com"],
  TikTok: ["tiktok.com"],
};

// Accepts only an https profile link on the platform's own domain. No credentials in the URL.
export function validProfileUrl(platform: string, raw: string): string | null {
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== "https:" || u.username || u.password || u.port) return null;
    const host = u.hostname.toLowerCase();
    const ok = (DOMAINS[platform] || []).some(d => host === d || host.endsWith("." + d));
    return ok ? u.toString().slice(0, 300) : null;
  } catch { return null; }
}
