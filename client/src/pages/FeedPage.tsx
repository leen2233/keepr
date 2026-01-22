import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useTagFilter, useItemTypeFilter, useSearch } from "@/store"
import { useItems } from "@/hooks/use-items"
import { formatBytes, formatDate } from "@/lib/utils"
import { SearchBar } from "@/components/SearchBar"
import { TagFilter } from "@/components/TagFilter"
import { ItemTypeFilter } from "@/components/ItemTypeFilter"
import { FileText, Key, Image as ImageIcon, Video, File, Calendar, ArrowRight, Eye, EyeOff, Copy } from "lucide-react"
import ReactMarkdown from "react-markdown"
import { Link } from "react-router-dom"

const ITEM_ICONS: Record<string, React.ReactNode> = {
  text: <FileText className="h-4 w-4" />,
  login: <Key className="h-4 w-4" />,
  image: <ImageIcon className="h-4 w-4" />,
  video: <Video className="h-4 w-4" />,
  file: <File className="h-4 w-4" />,
}

const ITEM_COLOR = "text-gray-600 dark:text-gray-400"

function groupItemsByDate(items: any[]) {
  const groups: Record<string, any[]> = {}
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const thisWeek = new Date(today)
  thisWeek.setDate(thisWeek.getDate() - 7)

  items.forEach((item) => {
    const itemDate = new Date(item.created_at)
    let groupKey = ""

    if (itemDate >= today) {
      groupKey = "Today"
    } else if (itemDate >= yesterday) {
      groupKey = "Yesterday"
    } else if (itemDate >= thisWeek) {
      groupKey = "This Week"
    } else {
      groupKey = itemDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })
    }

    if (!groups[groupKey]) {
      groups[groupKey] = []
    }
    groups[groupKey].push(item)
  })

  return groups
}

export function FeedPage() {
  const navigate = useNavigate()
  const { selectedTagIds } = useTagFilter()
  const { selectedType } = useItemTypeFilter()
  const { searchQuery } = useSearch()
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set())

  const { data: items, isLoading, error } = useItems(
    selectedTagIds.length > 0 ? selectedTagIds : undefined,
    selectedType || undefined,
    searchQuery || undefined
  )

  const groupedItems = useMemo(() => {
    return items ? groupItemsByDate(items) : {}
  }, [items])

  const togglePasswordVisibility = (itemId: string) => {
    setVisiblePasswords((prev) => {
      const next = new Set(prev)
      if (next.has(itemId)) {
        next.delete(itemId)
      } else {
        next.add(itemId)
      }
      return next
    })
  }

  const handleCopyPassword = async (password: string) => {
    await navigator.clipboard.writeText(password)
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-black dark:text-white">Archive</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {items?.length || 0} {items?.length === 1 ? "item" : "items"}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1">
          <SearchBar />
        </div>
        <ItemTypeFilter />
      </div>

      <TagFilter />

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-black dark:border-gray-700 dark:border-t-white" />
          </div>
        </div>
      ) : error ? (
        <div className="card bg-red-50 dark:bg-red-900/20">
          <p className="text-sm text-red-800 dark:text-red-400">Failed to load items</p>
        </div>
      ) : !items || items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-gray-200 dark:bg-gray-800">
            <FileText className="h-8 w-8 text-gray-500 dark:text-gray-400" />
          </div>
          <h2 className="text-xl font-semibold text-black dark:text-white mb-2">No items yet</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            Create your first item to get started
          </p>
          <button onClick={() => navigate("/new")} className="btn-primary">
            Create item
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedItems).map(([dateLabel, dateItems]) => (
            <div key={dateLabel} className="relative">
              <div className="mb-3 flex items-center gap-2">
                <div className="h-px flex-1 bg-black/20 dark:bg-white/20" />
                <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-black/20 bg-white dark:border-white/20 dark:bg-black">
                  <Calendar className="h-3 w-3 text-gray-500 dark:text-gray-400" />
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{dateLabel}</span>
                  <span className="text-xs text-gray-400">({dateItems.length})</span>
                </div>
                <div className="h-px flex-1 bg-black/20 dark:bg-white/20" />
              </div>

              <div className="space-y-3">
                {dateItems.map((item) => (
                  <div key={item.id} className="group">
                    <div className="card">
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${ITEM_COLOR}`}>
                          {ITEM_ICONS[item.type]}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <h3 className="text-sm font-medium text-black dark:text-white">
                                {item.title || item.file_name || `${item.type} item`}
                              </h3>
                              <p className="text-xs text-gray-500 mt-0.5">
                                {formatDate(item.created_at)}
                                {item.file_size && ` • ${formatBytes(item.file_size)}`}
                              </p>
                            </div>

                            <Link
                              to={`/items/${item.id}`}
                              className="flex-shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-black/5 hover:text-black dark:hover:bg-white/10 dark:hover:text-white transition-colors"
                              aria-label="View details"
                            >
                              <ArrowRight className="h-4 w-4" />
                            </Link>
                          </div>

                          {item.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {item.tags.slice(0, 3).map((tag: any) => (
                                <span
                                  key={tag.id}
                                  className="rounded px-2 py-0.5 text-xs font-medium"
                                  style={{ backgroundColor: tag.color, color: "white" }}
                                >
                                  {tag.name}
                                </span>
                              ))}
                              {item.tags.length > 3 && (
                                <span className="text-xs text-gray-500">+{item.tags.length - 3}</span>
                              )}
                            </div>
                          )}

                          {item.type === "text" && item.content && (
                            <div className="mt-3 rounded-lg border border-black/20 bg-white p-3 dark:border-white/20 dark:bg-black overflow-hidden">
                              <div className="prose prose-sm max-w-none dark:prose-invert break-words">
                                <ReactMarkdown>{item.content}</ReactMarkdown>
                              </div>
                            </div>
                          )}

                          {item.type === "login" && item.content && (
                            <div className="mt-3 rounded-lg border border-black/20 bg-white p-3 dark:border-white/20 dark:bg-black">
                              <div className="space-y-3 text-sm">
                                <div>
                                  <span className="text-xs text-gray-500">Username</span>
                                  <p className="text-black dark:text-white">{item.content.username}</p>
                                </div>
                                <div>
                                  <span className="text-xs text-gray-500">Password</span>
                                  <div className="mt-1 flex items-center justify-between gap-2 rounded-lg border border-black/20 bg-white px-3 py-2 dark:border-white/20 dark:bg-black">
                                    <p className="text-black dark:text-white font-mono text-sm">
                                      {visiblePasswords.has(item.id) ? item.content.password : "•••••••••"}
                                    </p>
                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => togglePasswordVisibility(item.id)}
                                        className="rounded p-1 text-gray-400 hover:text-black dark:hover:text-white transition-colors"
                                        aria-label={visiblePasswords.has(item.id) ? "Hide password" : "Show password"}
                                      >
                                        {visiblePasswords.has(item.id) ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleCopyPassword(item.content.password)}
                                        className="rounded p-1 text-gray-400 hover:text-black dark:hover:text-white transition-colors"
                                        aria-label="Copy password"
                                      >
                                        <Copy className="h-4 w-4" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                                {item.content.url && (
                                  <div>
                                    <span className="text-xs text-gray-500">URL</span>
                                    <p className="text-sm text-black dark:text-white truncate">{item.content.url}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {item.file_name && (
                            <div className="mt-3 rounded-lg border border-black/20 bg-white p-3 dark:border-white/20 dark:bg-black">
                              <div className="flex items-center gap-3">
                                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${ITEM_COLOR}`}>
                                  {ITEM_ICONS[item.type]}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium text-black dark:text-white truncate">{item.file_name}</p>
                                  {item.file_size && (
                                    <p className="text-xs text-gray-500">{formatBytes(item.file_size)}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
