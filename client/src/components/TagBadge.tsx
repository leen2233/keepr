import type { Tag } from "@/lib/types"
import { cn, getContrastColor } from "@/lib/utils"

interface TagBadgeProps {
  tag: Tag
  onClick?: () => void
  removable?: boolean
  onRemove?: () => void
  className?: string
}

export function TagBadge({ tag, onClick, removable, onRemove, className }: TagBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        onClick && "cursor-pointer transition-opacity hover:opacity-80",
        className
      )}
      style={{
        backgroundColor: tag.color,
        color: getContrastColor(tag.color),
      }}
      onClick={onClick}
    >
      {tag.name}
      {removable && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRemove?.()
          }}
          className="hover:text-white/70"
        >
          &times;
        </button>
      )}
    </span>
  )
}
