import { useParams } from "react-router-dom"
import { useState } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import api from "@/lib/api"
import { formatBytes, formatDate } from "@/lib/utils"
import { FileText, Key, Image as ImageIcon, Video, File, AlertCircle, Eye, EyeOff, Copy, Lock } from "lucide-react"
import ReactMarkdown from "react-markdown"
import type { Item } from "@/lib/types"

const ITEM_ICONS: Record<string, React.ReactNode> = {
  text: <FileText className="h-4 w-4" />,
  login: <Key className="h-4 w-4" />,
  image: <ImageIcon className="h-4 w-4" />,
  video: <Video className="h-4 w-4" />,
  file: <File className="h-4 w-4" />,
}

const ITEM_COLOR = "text-gray-600 dark:text-gray-400"

export function SharedItemPage() {
  const { token: identifier } = useParams<{ token: string }>()
  const [showPassword, setShowPassword] = useState(false)
  const [unlockPassword, setUnlockPassword] = useState("")
  const [showUnlockPassword, setShowUnlockPassword] = useState(false)
  const [isUnlocked, setIsUnlocked] = useState(false)

  // Query to check if password is required (also returns item if no password)
  const { data: checkData, isLoading: isChecking, error: checkError } = useQuery({
    queryKey: ["shared-item-check", identifier, isUnlocked],
    queryFn: async () => {
      const response = await api.get<{ data: any }>(`/shared/${identifier}/`)
      return response.data.data
    },
    enabled: !!identifier,
    retry: false,
  })

  // Mutation to unlock with password
  const unlockMutation = useMutation({
    mutationFn: async (password: string) => {
      const response = await api.post<{ data: { item: Item } }>(`/shared/${identifier}/`, { password })
      return response.data.data.item
    },
    onSuccess: (data) => {
      setIsUnlocked(true)
    },
  })

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault()
    await unlockMutation.mutateAsync(unlockPassword)
  }

  const handleCopyPassword = async () => {
    const item = unlockMutation.data || checkData?.item
    if (item?.type === "login" && typeof item.content === "object") {
      await navigator.clipboard.writeText(item.content.password)
    }
  }

  // Get the item data - either from unlock mutation or from check query
  const item = unlockMutation.data || checkData?.item
  const requiresPassword = checkData?.requires_password && !isUnlocked

  // Handle loading state for initial check
  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500 dark:text-gray-400">Loading...</div>
      </div>
    )
  }

  // Handle error from check query
  if (checkError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="card bg-red-50 dark:bg-red-900/20 max-w-md">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            <div>
              <h2 className="font-semibold text-red-800 dark:text-red-400">Link not found</h2>
              <p className="text-sm text-red-600 dark:text-red-400">
                This share link may have expired or reached its access limit.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Show password prompt if required and not unlocked
  if (requiresPassword) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-black flex items-center justify-center px-4">
        <div className="card w-full max-w-md p-6">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black dark:bg-white mb-4">
              <Lock className="h-6 w-6 text-white dark:text-black" />
            </div>
            <h1 className="text-xl font-semibold text-black dark:text-white mb-2">
              Password Required
            </h1>
            <p className="text-sm text-gray-500">
              This item is protected. Please enter the password to view it.
            </p>
          </div>

          <form onSubmit={handleUnlock} className="space-y-4">
            <div className="relative">
              <input
                type={showUnlockPassword ? "text" : "password"}
                value={unlockPassword}
                onChange={(e) => setUnlockPassword(e.target.value)}
                placeholder="Enter password"
                className="input w-full pr-10"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowUnlockPassword(!showUnlockPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black dark:hover:text-white"
              >
                {showUnlockPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {unlockMutation.error && (
              <div className="text-sm text-red-600 dark:text-red-400">
                Incorrect password. Please try again.
              </div>
            )}

            <button
              type="submit"
              disabled={unlockMutation.isPending || !unlockPassword}
              className="btn-primary btn w-full"
            >
              {unlockMutation.isPending ? "Unlocking..." : "Unlock"}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // Handle no item case
  if (!item) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="card bg-red-50 dark:bg-red-900/20 max-w-md">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            <div>
              <h2 className="font-semibold text-red-800 dark:text-red-400">Link not found</h2>
              <p className="text-sm text-red-600 dark:text-red-400">
                This share link may have expired or reached its access limit.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-black">
      <header className="border-b border-black/20 bg-white/80 backdrop-blur-sm dark:border-white/20 dark:bg-black/80">
        <div className="mx-auto flex max-w-3xl items-center px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-black dark:bg-white">
              <File className="h-4 w-4 text-white dark:text-black" />
            </div>
            <span className="text-lg font-semibold text-black dark:text-white">Keepr</span>
            <span className="text-sm text-gray-500">Shared Item</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <div className="card">
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${ITEM_COLOR}`}>
                {ITEM_ICONS[item.type]}
              </div>
              <span className="text-xs uppercase font-medium text-gray-500">
                {item.type}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-black dark:text-white">
              {item.title || `${item.type} item`}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Created {formatDate(item.created_at)}
            </p>
          </div>

          {item.tags.length > 0 && (
            <div className="mb-6 flex flex-wrap gap-2">
              {item.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="rounded px-2 py-1 text-xs font-medium"
                  style={{ backgroundColor: tag.color, color: "white" }}
                >
                  {tag.name}
                </span>
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
                    {showPassword ? item.content.password : "•••••••••"}
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
                  <p className="mt-1 text-sm text-black dark:text-white truncate">
                    {item.content.url}
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

          <div className="mt-6 pt-6 border-t border-black/20 dark:border-white/20">
            <p className="text-sm text-gray-500 text-center">
              Shared via Keepr — Your Personal Archive
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
