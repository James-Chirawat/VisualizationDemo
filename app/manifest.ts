import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "RouteLens · Logistics Intelligence",
    short_name: "RouteLens",
    description: "แดชบอร์ดติดตามและวิเคราะห์ผลการขนส่ง",
    start_url: "/",
    display: "standalone",
    background_color: "#f1f5f8",
    theme_color: "#122e48",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
