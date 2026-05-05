import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'

interface AdminSummaryItem {
  label: string
  value: string | number
  hint: string
  tone?: 'blue' | 'cyan' | 'emerald' | 'amber'
}

interface AdminPanelShellProps {
  eyebrow?: string
  title: string
  description: string
  summary: AdminSummaryItem[]
  toolbar?: ReactNode
  children: ReactNode
}

const sections = [
  {
    to: '/admin',
    label: 'Overview',
    hint: 'Queue, counts, and quick actions',
  },
  {
    to: '/admin/users',
    label: 'Users',
    hint: 'Directory, moderation, and roles',
  },
  {
    to: '/admin/comments',
    label: 'Comments',
    hint: 'Review and approve community activity',
  },
  {
    to: '/admin/auctions',
    label: 'Auctions',
    hint: 'Lifecycle and catalog operations',
  },
]

const summaryToneClass: Record<NonNullable<AdminSummaryItem['tone']>, string> = {
  blue: 'border-blue-200 bg-blue-50/80',
  cyan: 'border-cyan-200 bg-cyan-50/80',
  emerald: 'border-emerald-200 bg-emerald-50/80',
  amber: 'border-amber-200 bg-amber-50/80',
}

export function AdminPanelShell({
  eyebrow = 'Admin control center',
  title,
  description,
  summary,
  toolbar,
  children,
}: AdminPanelShellProps) {
  return (
    <section className="fin-fade-up space-y-5">
      <article className="fin-card overflow-hidden">
        <div className="border-b border-slate-200 bg-[linear-gradient(135deg,rgba(15,93,227,0.08),rgba(18,195,215,0.1),rgba(255,255,255,0.8))] px-5 py-6 sm:px-6 md:px-8">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                {eyebrow}
              </p>
              <h1 className="fin-title mt-2 text-2xl font-bold sm:text-3xl">{title}</h1>
              <p className="fin-subtitle mt-2 text-sm sm:text-base">{description}</p>
            </div>

            {toolbar ? <div className="xl:min-w-[16rem] xl:max-w-sm">{toolbar}</div> : null}
          </div>

          <nav className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {sections.map((section) => (
              <NavLink key={section.to} to={section.to} end={section.to === '/admin'} className={({ isActive }) => [
                'rounded-2xl border px-4 py-3 transition',
                isActive
                  ? 'border-blue-300 bg-white text-slate-900 shadow-[0_18px_30px_-28px_rgba(15,93,227,0.8)]'
                  : 'border-slate-200/80 bg-white/60 text-slate-700 hover:border-blue-200 hover:bg-white',
              ].join(' ')}>
                <p className="text-sm font-semibold">{section.label}</p>
                <p className="mt-1 text-xs text-slate-500">{section.hint}</p>
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="grid grid-cols-1 gap-3 px-5 py-5 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 md:px-8">
          {summary.map((item) => (
            <article
              key={item.label}
              className={[
                'rounded-2xl border p-4',
                item.tone ? summaryToneClass[item.tone] : 'border-slate-200 bg-white',
              ].join(' ')}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                {item.label}
              </p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{item.value}</p>
              <p className="mt-1 text-sm text-slate-600">{item.hint}</p>
            </article>
          ))}
        </div>
      </article>

      {children}
    </section>
  )
}
