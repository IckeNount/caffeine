import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Caffeine — AI English Learning Tools for Thai Students",
  description:
    "AI-powered tools that help Thai students learn English — sentence breakdown, OCR reader, dictionary, and more.",
};

export default function StudentLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      {/* HUD Grid Background */}
      <div className='fixed inset-0 pointer-events-none overflow-hidden'>
        {/* Grid pattern */}
        <div
          className='absolute inset-0 opacity-[0.04]'
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,229,0,0.3) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,229,0,0.3) 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px",
          }}
        />
        {/* Top edge glow */}
        <div
          className='absolute top-0 left-0 right-0 h-[200px]'
          style={{
            background:
              "radial-gradient(ellipse 60% 100% at 50% 0%, rgba(255,229,0,0.06), transparent)",
          }}
        />
        {/* Corner decorations */}
        <div
          className='absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 opacity-20'
          style={{ borderColor: "var(--accent-gold)" }}
        />
        <div
          className='absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 opacity-20'
          style={{ borderColor: "var(--accent-gold)" }}
        />
        <div
          className='absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 opacity-20'
          style={{ borderColor: "var(--accent-gold)" }}
        />
        <div
          className='absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 opacity-20'
          style={{ borderColor: "var(--accent-gold)" }}
        />
      </div>

      {/* Main Content */}
      <div className='relative z-10'>{children}</div>
    </>
  );
}
