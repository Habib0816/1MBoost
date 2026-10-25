import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "1MBoost AI",
    short_name: "1MBoost",
    description: "AI-assisted social media content planning and growth.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#f7faf8",
    theme_color: "#176b4d",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
