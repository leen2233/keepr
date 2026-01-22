import { useState, useEffect, useRef } from "react"
import { useSearch } from "@/store"
import { Search, X } from "lucide-react"

export function SearchBar() {
  const { searchQuery, setSearchQuery } = useSearch()
  const [localQuery, setLocalQuery] = useState(searchQuery)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Update local query when store changes (e.g., cleared from elsewhere)
  useEffect(() => {
    setLocalQuery(searchQuery)
  }, [searchQuery])

  // Debounced search - update store after 500ms of inactivity
  useEffect(() => {
    // Clear existing timeout
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    // Set new timeout
    debounceRef.current = setTimeout(() => {
      setSearchQuery(localQuery)
    }, 500)

    // Cleanup on unmount
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [localQuery, setSearchQuery])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalQuery(e.target.value)
  }

  const handleClear = () => {
    setLocalQuery("")
    setSearchQuery("")
  }

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <input
        type="search"
        value={localQuery}
        onChange={handleChange}
        placeholder="Search..."
        className="input pl-10 pr-10"
      />
      {localQuery && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
