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
    <html lang='en' className='dark'>
      <body
        className='min-h-screen antialiased'
        style={{
          backgroundColor: "var(--bg-primary)",
          color: "var(--text-primary)",
        }}
      >
        {children}
      </body>
    </html>
  );
}
