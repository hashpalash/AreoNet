import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DUNEX — Autonomous UGV Perception Platform",
  description:
    "AI-powered terrain segmentation and traversability analysis for unmanned ground vehicles in off-road environments.",
  openGraph: {
    title: "DUNEX",
    description:
      "Autonomous UGV Perception Platform — SegFormer terrain segmentation with live 3D rover simulation.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="bg-dunenet-dark text-gray-100 font-display antialiased">
        {children}
      </body>
    </html>
  );
}
