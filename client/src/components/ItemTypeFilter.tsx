import { useItemTypeFilter } from "@/store"
import { FileText, Key, Image as ImageIcon, Video, File } from "lucide-react"

const ITEM_TYPES = [
  { value: "", label: "All", icon: <FileText className="h-4 w-4" /> },
  { value: "text", label: "Text", icon: <FileText className="h-4 w-4" /> },
  { value: "login", label: "Login", icon: <Key className="h-4 w-4" /> },
  { value: "image", label: "Images", icon: <ImageIcon className="h-4 w-4" /> },
  { value: "video", label: "Videos", icon: <Video className="h-4 w-4" /> },
  { value: "file", label: "Files", icon: <File className="h-4 w-4" /> },
]

export function ItemTypeFilter() {
  const { selectedType, setType } = useItemTypeFilter()

  return (
    <div className="flex flex-wrap gap-1">
      {ITEM_TYPES.map((type) => (
        <button
          key={type.value}
          onClick={() => setType(type.value || null)}
          className={`
            inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors
            ${selectedType === type.value
              ? "bg-black text-white dark:bg-white dark:text-black"
              : "text-gray-600 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-white/10"
            }
          `}
        >
          {type.icon}
          <span>{type.label}</span>
        </button>
      ))}
    </div>
  )
}
