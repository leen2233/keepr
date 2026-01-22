import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useItem, useUpdateItem } from "@/hooks/use-items"
import { useTags, useCreateTag } from "@/hooks/use-tags"
import { TAG_COLORS } from "@/lib/utils"
import { ArrowLeft, FileText, Key, Image as ImageIcon, Video, File } from "lucide-react"

const ITEM_TYPES = [
  { value: "text", label: "Text Note", icon: <FileText className="h-5 w-5" /> },
  { value: "login", label: "Login", icon: <Key className="h-5 w-5" /> },
  { value: "image", label: "Image", icon: <ImageIcon className="h-5 w-5" /> },
  { value: "video", label: "Video", icon: <Video className="h-5 w-5" /> },
  { value: "file", label: "File", icon: <File className="h-5 w-5" /> },
]

export function EditItemPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: item, isLoading, error } = useItem(id!)
  const updateItem = useUpdateItem()
  const createTag = useCreateTag()
  const { data: tags, refetch: refetchTags } = useTags()

  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [loginUsername, setLoginUsername] = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  const [loginUrl, setLoginUrl] = useState("")
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [newTagName, setNewTagName] = useState("")
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[5])
  const [showNewTag, setShowNewTag] = useState(false)

  // Load item data when available
  useEffect(() => {
    if (item) {
      setTitle(item.title || "")
      setSelectedTagIds(item.tags.map((t) => t.id))

      if (item.type === "text" && typeof item.content === "string") {
        setContent(item.content)
      } else if (item.type === "login" && typeof item.content === "object") {
        setLoginUsername(item.content.username || "")
        setLoginPassword(item.content.password || "")
        setLoginUrl(item.content.url || "")
      }
    }
  }, [item])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id || !item) return

    try {
      if (item.type === "text") {
        await updateItem.mutateAsync({
          id,
          title: title || undefined,
          content,
          tag_ids: selectedTagIds,
        })
      } else if (item.type === "login") {
        await updateItem.mutateAsync({
          id,
          title: title || undefined,
          content: {
            username: loginUsername,
            password: loginPassword,
            url: loginUrl,
          },
          tag_ids: selectedTagIds,
        })
      } else {
        // For file-based items, only title can be updated
        await updateItem.mutateAsync({
          id,
          title: title || undefined,
          tag_ids: selectedTagIds,
        })
      }

      navigate(`/items/${id}`)
    } catch (err) {
      console.error(err)
    }
  }

  const handleSaveTag = async () => {
    if (!newTagName.trim()) return

    try {
      const newTag = await createTag.mutateAsync({
        name: newTagName.trim(),
        color: newTagColor,
      })

      setSelectedTagIds((prev) => [...prev, newTag.id])
      setNewTagName("")
      setNewTagColor(TAG_COLORS[5])
      setShowNewTag(false)
      refetchTags()
    } catch (err) {
      console.error(err)
    }
  }

  const toggleTag = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId]
    )
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

  const selectedItemType = ITEM_TYPES.find((t) => t.value === item.type)!

  return (
    <div className="mx-auto max-w-2xl">
      <button
        onClick={() => navigate(`/items/${id}`)}
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-black dark:text-gray-400 dark:hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to item
      </button>

      <div className="card">
        <div className="mb-8 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-black text-white dark:bg-white dark:text-black">
            {selectedItemType.icon}
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-black dark:text-white">Edit Item</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {selectedItemType.label} • {item.title || item.file_name || "Untitled"}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="title" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Title <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input"
              placeholder="Give it a name..."
            />
          </div>

          {item.type === "text" && (
            <div>
              <label htmlFor="content" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Your Note <span className="text-black dark:text-white">*</span>
              </label>
              <textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="input min-h-[200px] font-mono"
                placeholder="Write your thoughts here... Markdown supported!"
                required
              />
            </div>
          )}

          {item.type === "login" && (
            <div className="space-y-4">
              <div>
                <label htmlFor="login-username" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Username <span className="text-black dark:text-white">*</span>
                </label>
                <input
                  id="login-username"
                  type="text"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  className="input"
                  placeholder="your username"
                  required
                />
              </div>
              <div>
                <label htmlFor="login-password" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Password <span className="text-black dark:text-white">*</span>
                </label>
                <input
                  id="login-password"
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="input"
                  placeholder="your password"
                  required
                />
              </div>
              <div>
                <label htmlFor="login-url" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  URL <span className="text-gray-400">(optional)</span>
                </label>
                <input
                  id="login-url"
                  type="url"
                  value={loginUrl}
                  onChange={(e) => setLoginUrl(e.target.value)}
                  className="input"
                  placeholder="https://example.com"
                />
              </div>
            </div>
          )}

          {item.file && (
            <div className="rounded-lg bg-gray-50 p-4 dark:bg-white/5">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Attached file: {item.file.name}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                File cannot be changed. Edit title or tags below.
              </p>
            </div>
          )}

          <div>
            <label className="mb-3 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Tags
            </label>
            <div className="flex flex-wrap gap-2">
              {tags?.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag.id)}
                  className={`
                    rounded-lg px-3 py-1.5 text-sm font-medium transition-colors
                    ${selectedTagIds.includes(tag.id)
                      ? "opacity-100"
                      : "opacity-50 hover:opacity-80"
                    }
                  `}
                  style={{ backgroundColor: tag.color, color: "white" }}
                >
                  {tag.name}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setShowNewTag(!showNewTag)}
                className="rounded-lg border-2 border-dashed border-gray-400 px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:border-gray-500 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:border-gray-500 dark:hover:bg-white/10"
              >
                + New tag
              </button>
            </div>

            {showNewTag && (
              <div className="mt-4 space-y-3 rounded-lg bg-gray-50 p-4 dark:bg-white/5">
                <input
                  type="text"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSaveTag()}
                  className="input"
                  placeholder="Tag name"
                  autoFocus
                />
                <div className="flex flex-wrap gap-2">
                  {TAG_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewTagColor(color)}
                      className="h-10 w-10 rounded-full border-2 transition-all hover:scale-110"
                      style={{
                        backgroundColor: color,
                        borderColor: newTagColor === color ? "white" : "transparent",
                        boxShadow: newTagColor === color ? `0 0 0 2px ${color}` : undefined,
                      }}
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSaveTag}
                    disabled={!newTagName.trim() || createTag.isPending}
                    className="btn-primary text-sm px-3 py-1.5"
                  >
                    {createTag.isPending ? "Saving..." : "Save tag"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewTag(false)
                      setNewTagName("")
                      setNewTagColor(TAG_COLORS[5])
                    }}
                    className="btn-secondary text-sm px-3 py-1.5"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-4 pt-4">
            <button
              type="button"
              onClick={() => navigate(`/items/${id}`)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateItem.isPending || createTag.isPending}
              className="btn-primary"
            >
              {updateItem.isPending ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
