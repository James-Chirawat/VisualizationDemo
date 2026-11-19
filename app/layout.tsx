import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RouteLens · Logistics Intelligence",
  description: "แดชบอร์ดติดตามและวิเคราะห์ผลการขนส่ง",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f1f5f8" },
    { media: "(prefers-color-scheme: dark)", color: "#0c1925" },
  ],
};

// Applies a saved theme before first paint so the page never flashes the wrong colours.
const themeScript = `try{var t=localStorage.getItem("routelens-theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="th" suppressHydrationWarning>
    <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
    <body>{children}</body>
  </html>;
}
