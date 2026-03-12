import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login — Caffeine Admin",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
