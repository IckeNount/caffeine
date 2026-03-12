import type { Metadata } from "next";
import { FolderOpen, BookOpen, Languages, TrendingUp } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Dashboard — Caffeine Admin",
  description: "Manage lessons, folders, and translations for your students.",
};

function StatCard({
  icon: Icon,
  label,
  value,
  trend,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  trend?: string;
  color: string;
}) {
  return (
    <div
      className='rounded-xl p-5 transition-all duration-200 hover:scale-[1.02]'
      style={{
        backgroundColor: "var(--bg-secondary, #111217)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div className='flex items-start justify-between'>
        <div
          className='w-10 h-10 rounded-lg flex items-center justify-center'
          style={{ backgroundColor: `${color}15`, color }}
        >
          <Icon size={20} />
        </div>
        {trend && (
          <span
            className='flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full'
            style={{
              backgroundColor: "rgba(34,197,94,0.1)",
              color: "#22C55E",
            }}
          >
            <TrendingUp size={12} />
            {trend}
          </span>
        )}
      </div>
      <div className='mt-4'>
        <p
          className='text-2xl font-bold'
          style={{ color: "var(--text-primary, #F1F1F3)" }}
        >
          {value}
        </p>
        <p
          className='text-sm mt-1'
          style={{ color: "var(--text-muted, #6B6F80)" }}
        >
          {label}
        </p>
      </div>
    </div>
  );
}

function QuickAction({
  icon: Icon,
  label,
  description,
  href,
  color,
}: {
  icon: React.ElementType;
  label: string;
  description: string;
  href: string;
  color: string;
}) {
  return (
    <Link
      href={href}
      className='group flex items-center gap-4 p-4 rounded-xl transition-all duration-200 hover:scale-[1.01]'
      style={{
        backgroundColor: "var(--bg-secondary, #111217)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div
        className='w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110'
        style={{ backgroundColor: `${color}15`, color }}
      >
        <Icon size={22} />
      </div>
      <div className='min-w-0'>
        <p
          className='font-semibold text-sm'
          style={{ color: "var(--text-primary, #F1F1F3)" }}
        >
          {label}
        </p>
        <p
          className='text-xs mt-0.5 truncate'
          style={{ color: "var(--text-muted, #6B6F80)" }}
        >
          {description}
        </p>
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  return (
    <div className='max-w-6xl mx-auto space-y-8'>
      {/* Header */}
      <div>
        <h1
          className='text-2xl font-bold'
          style={{ color: "var(--text-primary, #F1F1F3)" }}
        >
          Welcome back 👋
        </h1>
        <p
          className='mt-1 text-sm'
          style={{ color: "var(--text-muted, #6B6F80)" }}
        >
          Here&apos;s an overview of your content and recent activity.
        </p>
      </div>

      {/* Stats Grid */}
      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
        <StatCard
          icon={FolderOpen}
          label='Total Folders'
          value='—'
          color='#3B82F6'
        />
        <StatCard
          icon={BookOpen}
          label='Total Lessons'
          value='—'
          color='#8B5CF6'
        />
        <StatCard icon={BookOpen} label='Published' value='—' color='#22C55E' />
        <StatCard
          icon={Languages}
          label='Translations'
          value='—'
          color='#F59E0B'
        />
      </div>

      {/* Quick Actions */}
      <div>
        <h2
          className='text-lg font-semibold mb-4'
          style={{ color: "var(--text-primary, #F1F1F3)" }}
        >
          Quick Actions
        </h2>
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
          <QuickAction
            icon={FolderOpen}
            label='Create New Folder'
            description='Organize your lessons into categories'
            href='/dashboard/folders'
            color='#3B82F6'
          />
          <QuickAction
            icon={BookOpen}
            label='Create New Lesson'
            description='Start building a new lesson for students'
            href='/dashboard/lessons'
            color='#8B5CF6'
          />
          <QuickAction
            icon={Languages}
            label='Bulk Translate'
            description='Translate paragraphs using AI'
            href='/dashboard/lessons'
            color='#F59E0B'
          />
        </div>
      </div>

      {/* Recent Lessons placeholder */}
      <div>
        <h2
          className='text-lg font-semibold mb-4'
          style={{ color: "var(--text-primary, #F1F1F3)" }}
        >
          Recent Lessons
        </h2>
        <div
          className='rounded-xl p-8 text-center'
          style={{
            backgroundColor: "var(--bg-secondary, #111217)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <BookOpen
            size={40}
            className='mx-auto mb-3'
            style={{ color: "var(--text-muted, #6B6F80)", opacity: 0.5 }}
          />
          <p
            className='text-sm font-medium'
            style={{ color: "var(--text-muted, #6B6F80)" }}
          >
            No lessons yet
          </p>
          <p
            className='text-xs mt-1'
            style={{ color: "var(--text-muted, #6B6F80)", opacity: 0.7 }}
          >
            Create your first lesson to get started.
          </p>
        </div>
      </div>
    </div>
  );
}
