import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Caffeine — English Sentence Breakdown for Thai Learners",
  description:
    "AI-assisted English sentence analysis with Thai explanations and Thai-friendly reconstruction.",
  keywords: [
    "English learning",
    "Thai students",
    "grammar",
    "sentence breakdown",
    "AI education",
    "เรียนภาษาอังกฤษ",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
