import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { useSearchItems } from "@/hooks/use-items"
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll"
import { ItemCard } from "@/components/ItemCard"
import { Search } from "lucide-react"

export function SearchPage() {
  const [searchParams] = useSearchParams()
  const query = searchParams.get("q") || ""
  const searchItems = useSearchItems()

  // Trigger search when query changes
  useEffect(() => {
    if (query.trim()) {
      searchItems.search(query)
    } else {
      searchItems.reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  const {
    items,
    pagination,
    isLoading,
    isLoadingMore,
    error,
    loadMore,
    hasNextPage,
  } = searchItems

  // Set up infinite scroll
  const observerTarget = useInfiniteScroll(
    () => {
      if (hasNextPage && !isLoadingMore) {
        loadMore()
      }
    },
    hasNextPage && !isLoading
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-black dark:text-white">
          Search results
        </h1>
        {query && (
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Query: <span className="font-medium">"{query}"</span>
            {pagination && ` • ${pagination.total_count} result${pagination.total_count !== 1 ? "s" : ""}`}
          </p>
        )}
      </div>

      {query && (
        <>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-500 dark:text-gray-400">Searching...</div>
            </div>
          ) : !items || items.length === 0 ? (
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
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((item) => (
                  <ItemCard key={item.id} item={item} />
                ))}
              </div>

              {/* Infinite scroll observer target */}
              {hasNextPage && (
                <div ref={observerTarget} className="py-4 text-center">
                  {isLoadingMore && (
                    <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-black dark:border-gray-700 dark:border-t-white" />
                  )}
                </div>
              )}

              {/* End of results message */}
              {!hasNextPage && items.length > 0 && pagination && pagination.total_count > items.length && (
                <div className="py-4 text-center text-sm text-gray-600 dark:text-gray-400">
                  Showing all {pagination.total_count} results
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
