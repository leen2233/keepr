import { useEffect } from "react"
import { useSearchParams } from "react-router-dom"
import { useSearchItems } from "@/hooks/use-items"
import { ItemCard } from "@/components/ItemCard"
import { Search } from "lucide-react"

export function SearchPage() {
  const [searchParams] = useSearchParams()
  const query = searchParams.get("q") || ""
  const searchItems = useSearchItems()

  // Trigger search when query changes
  useEffect(() => {
    if (query.trim()) {
      searchItems.mutate(query)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  const results = query ? searchItems.data : []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-black dark:text-white">
          Search results
        </h1>
        {query && (
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Query: <span className="font-medium">"{query}"</span>
          </p>
        )}
      </div>

      {query && (
        <>
          {searchItems.isPending ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-500 dark:text-gray-400">Searching...</div>
            </div>
          ) : !results || results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Search className="mb-4 h-12 w-12 text-gray-400" />
              <h2 className="text-xl font-semibold text-black dark:text-white">
                No results found
              </h2>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Try a different search term
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Found {results.length} result{results.length !== 1 ? "s" : ""}
              </p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {results.map((item) => (
                  <ItemCard key={item.id} item={item} />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
