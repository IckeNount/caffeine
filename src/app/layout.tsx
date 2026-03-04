import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Caffeine — AI English Learning Tools for Thai Students",
  description:
    "AI-powered tools that help Thai students learn English — sentence breakdown, OCR reader, dictionary, and more.",
  keywords: [
    "English learning",
    "Thai students",
    "grammar",
    "sentence breakdown",
    "AI education",
    "OCR",
    "dictionary",
    "เรียนภาษาอังกฤษ",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen antialiased" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
        {/* HUD Grid Background */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          {/* Grid pattern */}
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: `
                linear-gradient(rgba(255,229,0,0.3) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,229,0,0.3) 1px, transparent 1px)
              `,
              backgroundSize: '60px 60px',
            }}
          />
          {/* Top edge glow */}
          <div
            className="absolute top-0 left-0 right-0 h-[200px]"
            style={{
              background: 'radial-gradient(ellipse 60% 100% at 50% 0%, rgba(255,229,0,0.06), transparent)',
            }}
          />
          {/* Corner decoration — top left */}
          <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 opacity-20" style={{ borderColor: 'var(--accent-gold)' }} />
          {/* Corner decoration — top right */}
          <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 opacity-20" style={{ borderColor: 'var(--accent-gold)' }} />
          {/* Corner decoration — bottom left */}
          <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 opacity-20" style={{ borderColor: 'var(--accent-gold)' }} />
          {/* Corner decoration — bottom right */}
          <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 opacity-20" style={{ borderColor: 'var(--accent-gold)' }} />
        </div>

        {/* Main Content */}
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}
