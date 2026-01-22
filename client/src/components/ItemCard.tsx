import { Link } from "react-router-dom"
import { formatBytes, formatDate } from "@/lib/utils"
import { TagBadge } from "./TagBadge"
import type { Item } from "@/lib/types"
import { FileText, Key, Image, Video, File, ArrowRight } from "lucide-react"

const ITEM_TYPE_ICONS: Record<string, React.ReactNode> = {
  text: <FileText className="h-5 w-5" />,
  login: <Key className="h-5 w-5" />,
  image: <Image className="h-5 w-5" />,
  video: <Video className="h-5 w-5" />,
  file: <File className="h-5 w-5" />,
}

const ITEM_TYPE_COLORS = "text-gray-600 dark:text-gray-400"

interface ItemCardProps {
  item: Item
}

export function ItemCard({ item }: ItemCardProps) {
  return (
    <div className="card transition-shadow hover:shadow-md">
      <div className="flex items-start gap-3">
        <div className={ITEM_TYPE_COLORS}>
          {ITEM_TYPE_ICONS[item.type]}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="truncate text-sm font-medium text-black dark:text-white">
                {item.title || item.file_name || `${item.type} item`}
              </h3>
              {item.file_size && (
                <div className="mt-1 text-xs text-gray-500">
                  {formatBytes(item.file_size)}
                </div>
              )}
            </div>
            <Link
              to={`/items/${item.id}`}
              className="flex-shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-black/5 hover:text-black dark:hover:bg-white/10 dark:hover:text-white transition-colors"
              aria-label="View details"
            >
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              {formatDate(item.created_at)}
            </span>

            {item.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {item.tags.slice(0, 3).map((tag) => (
                  <TagBadge key={tag.id} tag={tag} className="text-xs" />
                ))}
                {item.tags.length > 3 && (
                  <span className="text-xs text-gray-500">+{item.tags.length - 3}</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
