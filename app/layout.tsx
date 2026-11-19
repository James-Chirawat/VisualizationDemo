import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RouteLens · Logistics Intelligence",
  description: "แดชบอร์ดสาธิตวิเคราะห์การขนส่งสำหรับการสอบสอน Data Visualization",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="th"><body>{children}</body></html>;
}
