import { useState, useRef, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useCreateItem } from "@/hooks/use-items"
import { useTags, useCreateTag } from "@/hooks/use-tags"
import { useModal } from "@/store"
import { TAG_COLORS } from "@/lib/utils"
import { ArrowLeft, FileText, Key, Image as ImageIcon, Video, File } from "lucide-react"

type ItemType = "text" | "login" | "image" | "video" | "file"

const ITEM_TYPES = [
  { value: "text", label: "Text Note", icon: <FileText className="h-5 w-5" /> },
  { value: "login", label: "Login", icon: <Key className="h-5 w-5" /> },
  { value: "image", label: "Image", icon: <ImageIcon className="h-5 w-5" /> },
  { value: "video", label: "Video", icon: <Video className="h-5 w-5" /> },
  { value: "file", label: "File", icon: <File className="h-5 w-5" /> },
]

export function CreateItemPage() {
  const navigate = useNavigate()
  const createItem = useCreateItem()
  const createTag = useCreateTag()
  const { data: tags, refetch: refetchTags } = useTags()
  const { setCreateModalOpen } = useModal()

  const [type, setType] = useState<ItemType>("text")
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [loginUsername, setLoginUsername] = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  const [loginUrl, setLoginUrl] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [newTagName, setNewTagName] = useState("")
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[5])
  const [showNewTag, setShowNewTag] = useState(false)

  const contentRef = useRef<HTMLTextAreaElement>(null)
  const loginUsernameRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const selectedItemType = ITEM_TYPES.find(t => t.value === type)!

  // Auto-focus the appropriate content field on mount
  useEffect(() => {
    setTimeout(() => {
      if (type === "text" && contentRef.current) {
        contentRef.current.focus()
      } else if (type === "login" && loginUsernameRef.current) {
        loginUsernameRef.current.focus()
      } else if (["image", "video", "file"].includes(type) && fileInputRef.current) {
        fileInputRef.current.focus()
      }
    }, 100)
  }, [type])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      if (type === "text") {
        await createItem.mutateAsync({
          type,
          title: title || undefined,
          content,
          tag_ids: selectedTagIds,
        })
      } else if (type === "login") {
        await createItem.mutateAsync({
          type,
          title: title || undefined,
          content: JSON.stringify({
            username: loginUsername,
            password: loginPassword,
            url: loginUrl,
          }),
          tag_ids: selectedTagIds,
        })
      } else if (file) {
        const formData = new FormData()
        formData.append("file", file)
        formData.append("type", type)
        if (title) formData.append("title", title)
        selectedTagIds.forEach((id) => formData.append("tag_ids", id))

        await fetch("/api/files/upload/", {
          method: "POST",
          body: formData,
          credentials: "include",
        })
      }

      navigate("/")
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

      // Add the new tag to selected tags
      setSelectedTagIds((prev) => [...prev, newTag.id])

      // Reset the new tag form
      setNewTagName("")
      setNewTagColor(TAG_COLORS[5])
      setShowNewTag(false)

      // Refetch tags to update the list
      refetchTags()
    } catch (err) {
      console.error(err)
    }
  }

  const toggleTag = (id: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    )
  }

  return (
    <div className="mx-auto max-w-2xl">
      <button
        onClick={() => navigate("/")}
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-black dark:text-gray-400 dark:hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to archive
      </button>

      <div className="card">
        <div className="mb-8 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-black text-white dark:bg-white dark:text-black">
            {selectedItemType.icon}
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-black dark:text-white">Create New Item</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">Add something new to your archive</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="mb-3 block text-sm font-medium text-gray-700 dark:text-gray-300">
              What type of item?
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {ITEM_TYPES.map((itemType) => (
                <button
                  key={itemType.value}
                  type="button"
                  onClick={() => setType(itemType.value as ItemType)}
                  className={`
                    flex flex-col items-center gap-2 rounded-lg p-3 text-center transition-all
                    ${type === itemType.value
                      ? "bg-black text-white dark:bg-white dark:text-black"
                      : "bg-gray-50 text-gray-600 hover:bg-gray-100 dark:bg-white/10 dark:text-gray-400 dark:hover:bg-white/20"
                    }
                  `}
                >
                  {itemType.icon}
                  <span className="text-xs font-medium">
                    {itemType.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

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

          {type === "text" && (
            <div>
              <label htmlFor="content" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Your Note <span className="text-black dark:text-white">*</span>
              </label>
              <textarea
                id="content"
                ref={contentRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="input min-h-[200px] font-mono"
                placeholder="Write your thoughts here... Markdown supported!"
                required
              />
            </div>
          )}

          {type === "login" && (
            <div className="space-y-4">
              <div>
                <label htmlFor="login-username" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Username <span className="text-black dark:text-white">*</span>
                </label>
                <input
                  id="login-username"
                  ref={loginUsernameRef}
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

          {["image", "video", "file"].includes(type) && (
            <div>
              <label htmlFor="file" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Upload File <span className="text-black dark:text-white">*</span>
              </label>
              <div className="relative">
                <input
                  id="file"
                  ref={fileInputRef}
                  type="file"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="input file:mr-4 file:rounded-lg file:border-0 file:bg-black file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-gray-800 dark:file:bg-white dark:file:text-black dark:hover:file:bg-gray-200"
                  accept={
                    type === "image"
                      ? "image/*"
                      : type === "video"
                      ? "video/*"
                      : "*"
                  }
                  required
                />
              </div>
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
              onClick={() => navigate("/")}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createItem.isPending || createTag.isPending}
              className="btn-primary"
            >
              {createItem.isPending ? "Creating..." : "Create Item"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
