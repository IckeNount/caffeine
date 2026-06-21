"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderOpen,
  BookOpen,
  Settings,
  LogOut,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/folders", label: "Folders", icon: FolderOpen },
  { href: "/dashboard/lessons", label: "Lessons", icon: BookOpen },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

function Sidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const pathname = usePathname();

  return (
    <aside
      className='fixed top-0 left-0 h-screen z-40 flex flex-col transition-all duration-300'
      style={{
        width: collapsed ? "72px" : "260px",
        backgroundColor: "var(--bg-secondary, #111217)",
        borderRight: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* Logo Area */}
      <div
        className='flex items-center gap-3 px-4 h-16 border-b'
        style={{ borderColor: "rgba(255,255,255,0.06)" }}
      >
        <div
          className='w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm shrink-0'
          style={{
            background: "linear-gradient(135deg, #FFE500, #FF9500)",
            color: "#0A0A0F",
          }}
        >
          C
        </div>
        {!collapsed && (
          <span
            className='font-semibold text-sm tracking-wide'
            style={{ color: "var(--text-primary, #F1F1F3)" }}
          >
            Caffeine Admin
          </span>
        )}
        <button
          onClick={onToggle}
          className='ml-auto p-1.5 rounded-md hover:bg-white/5 transition-colors'
          style={{ color: "var(--text-muted, #6B6F80)" }}
        >
          {collapsed ? <ChevronRight size={16} /> : <X size={16} />}
        </button>
      </div>

      {/* Nav Items */}
      <nav className='flex-1 py-4 px-3 space-y-1'>
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className='flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200'
              style={{
                backgroundColor: isActive
                  ? "rgba(255,229,0,0.08)"
                  : "transparent",
                color: isActive ? "#FFE500" : "var(--text-muted, #6B6F80)",
              }}
              title={collapsed ? label : undefined}
            >
              <Icon size={20} className='shrink-0' />
              {!collapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div
        className='px-3 py-4 border-t'
        style={{ borderColor: "rgba(255,255,255,0.06)" }}
      >
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className='flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium w-full transition-colors hover:bg-white/5'
            style={{ color: "var(--text-muted, #6B6F80)" }}
            title={collapsed ? "Sign Out" : undefined}
          >
            <LogOut size={20} className='shrink-0' />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </form>
      </div>
    </aside>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div
      className='min-h-screen'
      style={{ backgroundColor: "var(--bg-primary, #0A0A0F)" }}
    >
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Top Bar */}
      <header
        className='fixed top-0 right-0 h-16 z-30 flex items-center justify-between px-6 transition-all duration-300'
        style={{
          left: sidebarCollapsed ? "72px" : "260px",
          backgroundColor: "var(--bg-primary, #0A0A0F)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <button
          className='lg:hidden p-2 rounded-md hover:bg-white/5'
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        >
          <Menu size={20} style={{ color: "var(--text-muted, #6B6F80)" }} />
        </button>
        <div className='ml-auto flex items-center gap-4'>
          <div
            className='w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold'
            style={{
              background: "linear-gradient(135deg, #3B82F6, #8B5CF6)",
              color: "#FFF",
            }}
          >
            T
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main
        className='pt-16 transition-all duration-300'
        style={{
          marginLeft: sidebarCollapsed ? "72px" : "260px",
        }}
      >
        <div className='p-6 lg:p-8'>{children}</div>
      </main>
    </div>
  );
}
