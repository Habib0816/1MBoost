import type { Metadata, Viewport } from "next";
import "./globals.css";
import Pwa from "./pwa";

export const metadata: Metadata = {
  title: "1MBoost AI Professional",
  description: "AI-assisted social media content planning and growth analytics.",
  applicationName: "1MBoost AI",
  appleWebApp: { capable: true, title: "1MBoost", statusBarStyle: "default" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = { themeColor: "#176b4d", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}<Pwa /></body></html>;
}
