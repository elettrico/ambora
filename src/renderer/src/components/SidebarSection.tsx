import type { ReactNode } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SidebarSectionProps {
  title: string
  open: boolean
  onToggle: () => void
  children: ReactNode
  trailing?: ReactNode
  fill?: boolean
  className?: string
  contentClassName?: string
}

/** Reusable collapsible slot for Campaigns, Connect Phone, and future mixer sections. */
export function SidebarSection({
  title,
  open,
  onToggle,
  children,
  trailing,
  fill = false,
  className,
  contentClassName,
}: SidebarSectionProps): React.JSX.Element {
  return (
    <section className={cn('flex min-h-0 shrink-0 flex-col', fill && open && 'flex-1', className)}>
      <button
        type="button"
        className="flex min-h-10 w-full items-center gap-2 px-5 text-left text-text-tertiary transition-colors hover:bg-surface-2 hover:text-text-secondary"
        onClick={onToggle}
        aria-expanded={open}
      >
        {open ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
        <span className="flex-1 text-[11px] font-semibold uppercase tracking-[0.06em]">
          {title}
        </span>
        {trailing}
      </button>
      {open && (
        <div className={cn('flex min-h-0 flex-1 flex-col', contentClassName)}>{children}</div>
      )}
    </section>
  )
}
