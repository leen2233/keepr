import { useState } from "react"
import { useTags, useUpdateTag, useDeleteTag } from "@/hooks/use-tags"
import { useTagFilter } from "@/store"
import { X, Tag, Pencil, Trash2, Check, Settings } from "lucide-react"

export function TagFilter() {
  const { data: tags, isLoading } = useTags()
  const { selectedTagIds, toggleTag, clearTags } = useTagFilter()
  const updateTag = useUpdateTag()
  const deleteTag = useDeleteTag()

  const [editingTagId, setEditingTagId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editColor, setEditColor] = useState("")
  const [showManage, setShowManage] = useState(false)

  const tagColors = [
    "#ef4444", // red
    "#f97316", // orange
    "#eab308", // yellow
    "#22c55e", // green
    "#06b6d4", // cyan
    "#3b82f6", // blue
    "#8b5cf6", // violet
    "#d946ef", // fuchsia
    "#ec4899", // pink
  ]

  const handleStartEdit = (tag: any) => {
    setEditingTagId(tag.id)
    setEditName(tag.name)
    setEditColor(tag.color)
  }

  const handleSaveEdit = () => {
    if (editingTagId && editName.trim()) {
      updateTag.mutate({ id: editingTagId, name: editName.trim(), color: editColor })
      setEditingTagId(null)
    }
  }

  const handleCancelEdit = () => {
    setEditingTagId(null)
    setEditName("")
    setEditColor("")
  }

  const handleDeleteTag = (id: string) => {
    if (confirm("Are you sure you want to delete this tag?")) {
      deleteTag.mutate(id)
    }
  }

  if (isLoading || !tags || tags.length === 0) {
    return null
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Tag className="h-4 w-4 text-gray-400" />
      <div className="flex flex-wrap gap-1">
        {tags.map((tag) => (
          <div
            key={tag.id}
            className={`group relative flex items-center gap-1 ${
              selectedTagIds.includes(tag.id) ? "opacity-100" : "opacity-40 hover:opacity-70"
            }`}
          >
            {editingTagId === tag.id ? (
              <div className="flex items-center gap-1 rounded px-2 py-1 text-xs">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-20 rounded border border-black/30 bg-white px-1 py-0.5 text-xs text-black focus:outline-none dark:border-white/30 dark:bg-black dark:text-white"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveEdit()
                    if (e.key === "Escape") handleCancelEdit()
                  }}
                />
                <div className="flex gap-0.5">
                  {tagColors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setEditColor(color)}
                      className={`h-4 w-4 rounded-full border-2 ${
                        editColor === color ? "border-white" : "border-transparent"
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <button
                  onClick={handleSaveEdit}
                  className="rounded p-0.5 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/20"
                >
                  <Check className="h-3 w-3" />
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="rounded p-0.5 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={() => toggleTag(tag.id)}
                  className="rounded px-2 py-1 text-xs font-medium transition-colors"
                  style={{ backgroundColor: tag.color, color: "white" }}
                >
                  {tag.name}
                </button>
                {showManage && (
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleStartEdit(tag)}
                      className="rounded p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      aria-label="Edit tag"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => handleDeleteTag(tag.id)}
                      className="rounded p-0.5 text-gray-400 hover:text-red-600"
                      aria-label="Delete tag"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>
      {selectedTagIds.length > 0 && (
        <button
          onClick={clearTags}
          className="ml-1 flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-200 dark:hover:bg-white/10"
        >
          <X className="h-3 w-3" />
          Clear
        </button>
      )}
      <button
        onClick={() => setShowManage(!showManage)}
        className={`ml-auto rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-black/5 hover:text-black dark:hover:bg-white/10 dark:hover:text-white ${
          showManage ? "bg-black/5 text-black dark:bg-white/10 dark:text-white" : ""
        }`}
        aria-label={showManage ? "Done managing" : "Manage tags"}
      >
        <Settings className="h-4 w-4" />
      </button>
    </div>
  )
}
