"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, ArrowLeft, BookOpen, LogIn } from "lucide-react";

interface StudentNavProps {
  back?: { href: string; label: string };
  title?: string;
  extra?: React.ReactNode;
}

const NAV_LINKS = [
  { href: "/lessons", label: "Lessons", icon: BookOpen },
];

export default function StudentNav({ back, title, extra }: StudentNavProps) {
  const pathname = usePathname();

  return (
    <header
      className="sticky top-0 z-50"
      style={{
        backgroundColor: "var(--bg-card)",
        borderBottom: "3px solid var(--border-brutal)",
      }}
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
        {/* Left: back arrow or logo */}
        {back ? (
          <Link
            href={back.href}
            className="flex items-center gap-1.5 text-sm font-heading uppercase tracking-wider hover:opacity-70 transition-opacity shrink-0"
            style={{ color: "var(--text-muted)" }}
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">{back.label}</span>
          </Link>
        ) : (
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div
              className="w-8 h-8 flex items-center justify-center border-2 border-black"
              style={{
                backgroundColor: "var(--accent-gold)",
                boxShadow: "var(--shadow-brutal-sm)",
              }}
            >
              <Sparkles className="w-4 h-4 text-black" />
            </div>
            <span className="font-heading text-base font-bold tracking-tight uppercase hidden sm:inline">
              <span className="rov-text">Caff</span>
              <span style={{ color: "var(--text-primary)" }}>eine</span>
            </span>
          </Link>
        )}

        {/* Divider */}
        {(back || title) && (
          <div className="w-px h-6 shrink-0" style={{ backgroundColor: "var(--border-subtle)" }} />
        )}

        {/* Center: page title */}
        {title && (
          <span
            className="font-heading text-sm font-bold tracking-tight uppercase truncate max-w-[180px] sm:max-w-xs"
            style={{ color: "var(--text-primary)" }}
          >
            {title}
          </span>
        )}

        {extra && <span className="shrink-0">{extra}</span>}

        {/* Right: nav links + Teacher Login */}
        <nav className="ml-auto flex items-center gap-1">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || pathname.startsWith(href + "/");
            if (isActive) return null;
            return (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-heading uppercase tracking-wider border-2 border-black hover:opacity-80 transition-opacity"
                style={{
                  backgroundColor: "var(--accent-gold)",
                  boxShadow: "var(--shadow-brutal-sm)",
                  color: "var(--text-primary)",
                }}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            );
          })}

          <Link
            href="/login"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-heading uppercase tracking-wider border-2 border-black hover:opacity-80 transition-opacity ml-1"
            style={{
              backgroundColor: "transparent",
              boxShadow: "var(--shadow-brutal-sm)",
              color: "var(--text-muted)",
              borderColor: "var(--border-brutal)",
            }}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Teacher</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
