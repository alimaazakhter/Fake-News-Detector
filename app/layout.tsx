import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TruthShield AI — Fake News Detector",
  description: "Detect fake news articles using advanced machine learning models running directly in your browser.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Space+Grotesk:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className="bg-[#050508] text-slate-100 antialiased"
        style={{ fontFamily: "'Inter', 'Space Grotesk', sans-serif" }}
      >
        <main className="relative min-h-screen z-10">{children}</main>
      </body>
    </html>
  );
}
