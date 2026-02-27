import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: EmptyStateProps): React.JSX.Element {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4">
      <Icon className="size-12 text-text-tertiary" />
      <div className="flex flex-col items-center gap-1">
        <h2 className="text-[17px] font-semibold text-text-primary">{title}</h2>
        {description && <p className="text-[13px] text-text-secondary">{description}</p>}
      </div>
      {action}
    </div>
  )
}
