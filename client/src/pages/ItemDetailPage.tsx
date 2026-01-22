import { useParams, useNavigate } from "react-router-dom"
import { useState } from "react"
import { useItem, useDeleteItem } from "@/hooks/use-items"
import { formatBytes, formatDate } from "@/lib/utils"
import { TagBadge } from "@/components/TagBadge"
import { ArrowLeft, Trash2, Edit, Eye, EyeOff, Copy } from "lucide-react"
import ReactMarkdown from "react-markdown"

export function ItemDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: item, isLoading, error } = useItem(id!)
  const deleteItem = useDeleteItem()
  const [showPassword, setShowPassword] = useState(false)

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this item?")) {
      await deleteItem.mutateAsync(id!)
      navigate("/")
    }
  }

  const handleCopyPassword = async () => {
    if (item?.type === "login" && typeof item.content === "object") {
      await navigator.clipboard.writeText(item.content.password)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500 dark:text-gray-400">Loading...</div>
      </div>
    )
  }

  if (error || !item) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-red-800 dark:bg-red-900/20 dark:text-red-400">
        Failed to load item
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl">
      <button
        onClick={() => navigate("/")}
        className="mb-4 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-black dark:text-gray-400 dark:hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <div className="card">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-black dark:text-white">
              {item.title || item.file_name || `${item.type} item`}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {formatDate(item.created_at)}
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => navigate(`/items/${item.id}/edit`)}
              className="btn-ghost btn rounded-lg p-2"
              aria-label="Edit"
            >
              <Edit className="h-5 w-5" />
            </button>
            <button
              onClick={handleDelete}
              className="btn-ghost btn rounded-lg p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
              aria-label="Delete"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
        </div>

        {item.tags.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-2">
            {item.tags.map((tag) => (
              <TagBadge key={tag.id} tag={tag} />
            ))}
          </div>
        )}

        {item.type === "text" && typeof item.content === "string" && (
          <div className="prose prose-gray max-w-none dark:prose-invert">
            <ReactMarkdown>{item.content}</ReactMarkdown>
          </div>
        )}

        {item.type === "login" && typeof item.content === "object" && (
          <div className="space-y-4 rounded-lg bg-gray-50 p-4 dark:bg-white/5">
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase">
                Username
              </label>
              <p className="mt-1 text-sm text-black dark:text-white">{item.content.username}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase">
                Password
              </label>
              <div className="mt-1 flex items-center justify-between gap-2 rounded-lg border border-black/20 bg-white px-3 py-2 dark:border-white/20 dark:bg-black">
                <p className="text-sm text-black dark:text-white font-mono">
                  {showPassword ? item.content.password : "••••••••"}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="rounded p-1 text-gray-400 hover:text-black dark:hover:text-white transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyPassword}
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
                <label className="text-xs font-medium text-gray-500 uppercase">
                  URL
                </label>
                <p className="mt-1 text-sm">
                  <a
                    href={item.content.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-black dark:text-white hover:underline"
                  >
                    {item.content.url}
                  </a>
                </p>
              </div>
            )}
          </div>
        )}

        {item.file && (
          <div className="rounded-lg bg-gray-50 p-4 dark:bg-white/5">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium text-black dark:text-white">
                {item.file.name}
              </span>
              <span className="text-sm text-gray-500">
                {formatBytes(item.file.size)}
              </span>
            </div>
            {item.type === "image" && (
              <img
                src={item.file.url}
                alt={item.title || item.file.name}
                className="max-h-[600px] rounded-lg object-contain"
              />
            )}
            {item.type === "video" && (
              <video
                src={item.file.url}
                controls
                className="max-h-[600px] rounded-lg"
              />
            )}
            {item.type === "file" && (
              <a
                href={item.file.url}
                download={item.file.name}
                className="btn-primary btn inline-flex items-center gap-2"
              >
                Download file
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
