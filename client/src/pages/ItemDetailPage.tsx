import { useParams, useNavigate } from "react-router-dom"
import { useState } from "react"
import { useItem, useDeleteItem, useTogglePinItem, useCreateShare } from "@/hooks/use-items"
import { formatBytes, formatDate } from "@/lib/utils"
import { TagBadge } from "@/components/TagBadge"
import { ArrowLeft, Trash2, Edit, Eye, EyeOff, Copy, Pin, PinOff, Share2, X, Lock, Link as LinkIcon } from "lucide-react"
import ReactMarkdown from "react-markdown"

export function ItemDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: item, isLoading, error } = useItem(id!)
  const deleteItem = useDeleteItem()
  const togglePin = useTogglePinItem()
  const createShare = useCreateShare()
  const [showPassword, setShowPassword] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [shareUrl, setShareUrl] = useState<string>("")
  const [expiresInHours, setExpiresInHours] = useState(24)
  const [customSlug, setCustomSlug] = useState<string>("")
  const [sharePassword, setSharePassword] = useState<string>("")
  const [showSharePassword, setShowSharePassword] = useState(false)

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

  const handleCreateShare = async () => {
    const share = await createShare.mutateAsync({
      itemId: id!,
      expiresInHours,
      slug: customSlug || undefined,
      password: sharePassword || undefined,
    })
    setShareUrl(share.share_url)
  }

  const handleCopyShareUrl = async () => {
    await navigator.clipboard.writeText(shareUrl)
  }

  const handleCloseShareModal = () => {
    setShowShareModal(false)
    setShareUrl("")
    setCustomSlug("")
    setSharePassword("")
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
              onClick={() => setShowShareModal(true)}
              className="btn-ghost btn rounded-lg p-2"
              aria-label="Share"
              title="Share item"
            >
              <Share2 className="h-5 w-5" />
            </button>
            <button
              onClick={() => togglePin.mutate(item.id)}
              className="btn-ghost btn rounded-lg p-2"
              aria-label={item.is_pinned ? "Unpin" : "Pin"}
              title={item.is_pinned ? "Unpin item" : "Pin item"}
            >
              {item.is_pinned ? <Pin className="h-5 w-5 fill-current" /> : <PinOff className="h-5 w-5" />}
            </button>
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

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="card w-full max-w-md p-6 mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-black dark:text-white">Share Item</h2>
              <button
                onClick={handleCloseShareModal}
                className="btn-ghost btn rounded-lg p-1"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {!shareUrl ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    <div className="flex items-center gap-1.5">
                      <LinkIcon className="h-3.5 w-3.5" />
                      Custom path (optional)
                    </div>
                  </label>
                  <div className="flex items-center gap-1 text-sm text-gray-500 mb-1">
                    <span className="text-gray-400">/shared/</span>
                    <input
                      type="text"
                      value={customSlug}
                      onChange={(e) => setCustomSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                      placeholder="my-custom-link"
                      className="input flex-1"
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    Leave empty for random link. Use 3+ characters (letters, numbers, -, _)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    <div className="flex items-center gap-1.5">
                      <Lock className="h-3.5 w-3.5" />
                      Password (optional)
                    </div>
                  </label>
                  <div className="relative">
                    <input
                      type={showSharePassword ? "text" : "password"}
                      value={sharePassword}
                      onChange={(e) => setSharePassword(e.target.value)}
                      placeholder="Enter password to protect this link"
                      className="input w-full pr-8"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSharePassword(!showSharePassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black dark:hover:text-white"
                    >
                      {showSharePassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Leave empty for public access. Viewers must enter this password.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Expiration
                  </label>
                  <select
                    value={expiresInHours}
                    onChange={(e) => setExpiresInHours(Number(e.target.value))}
                    className="input w-full"
                  >
                    <option value={1}>1 hour</option>
                    <option value={6}>6 hours</option>
                    <option value={24}>1 day</option>
                    <option value={72}>3 days</option>
                    <option value={168}>1 week</option>
                  </select>
                </div>

                {createShare.error && (
                  <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                    {(createShare.error as any).response?.data?.error?.message ||
                     (createShare.error as any).message ||
                     "Failed to create share link"}
                  </div>
                )}

                <button
                  onClick={handleCreateShare}
                  disabled={createShare.isPending}
                  className="btn-primary btn w-full"
                >
                  {createShare.isPending ? "Creating..." : "Create Share Link"}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Share Link
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={shareUrl}
                      className="input flex-1"
                    />
                    <button
                      onClick={handleCopyShareUrl}
                      className="btn-secondary btn"
                      title="Copy link"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  Link expires in {expiresInHours} hour{expiresInHours > 1 ? "s" : ""}.
                  {sharePassword && " Protected with password."}
                  {!sharePassword && " Anyone with this link can view this item."}
                </p>
                <button
                  onClick={() => {
                    setShareUrl("")
                  }}
                  className="btn-ghost btn w-full text-sm"
                >
                  Create another link
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
