import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import api from "@/lib/api"
import type { Item, ItemType, ApiResponse, ItemsResponse, ItemResponse, SharedItem, PaginationInfo } from "@/lib/types"

const ITEMS_QUERY_KEY = ["items"]

export function useItems(
  tagIds?: string[],
  itemType?: ItemType,
  searchQuery?: string
) {
  const [page, setPage] = useState(1)
  const [allItems, setAllItems] = useState<Item[]>([])
  const [pagination, setPagination] = useState<PaginationInfo | null>(null)
  const initializedRef = useRef(false)

  // Memoize the filter key to detect actual changes
  const filterKey = useMemo(() => JSON.stringify([tagIds, itemType, searchQuery]), [tagIds, itemType, searchQuery])

  const params = new URLSearchParams()
  tagIds?.forEach((id) => params.append("tag", id))
  if (itemType) params.set("type", itemType)
  if (searchQuery) params.set("q", searchQuery)
  params.set("page", String(page))
  params.set("page_size", "20")

  const query = useQuery({
    queryKey: [...ITEMS_QUERY_KEY, tagIds, itemType, searchQuery, page],
    queryFn: async () => {
      const response = await api.get<ItemsResponse>(`/items/?${params.toString()}`)
      return response.data.data
    },
    enabled: true,
  })

  // Update all items and pagination when data changes
  useEffect(() => {
    if (query.data) {
      const newItems = query.data.items
      setAllItems((prev) => (page === 1 ? newItems : [...prev, ...newItems]))
      setPagination(query.data.pagination)
    }
  }, [query.data, page])

  // Reset when filters change (only after initialization)
  useEffect(() => {
    if (initializedRef.current) {
      setPage(1)
      setAllItems([])
      setPagination(null)
    } else {
      initializedRef.current = true
    }
  }, [filterKey])

  const loadMore = useCallback(() => {
    if (pagination && pagination.has_next) {
      setPage((p) => p + 1)
    }
  }, [pagination])

  return {
    items: allItems,
    pagination,
    isLoading: query.isLoading && page === 1,
    isLoadingMore: query.isLoading && page > 1,
    error: query.error,
    loadMore,
    hasNextPage: pagination?.has_next ?? false,
  }
}

export function useItem(id: string) {
  return useQuery({
    queryKey: [...ITEMS_QUERY_KEY, id],
    queryFn: async () => {
      const response = await api.get<ItemResponse>(`/items/${id}/`)
      return response.data.data.item
    },
    enabled: !!id,
  })
}

export function useCreateItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      type: ItemType
      title?: string
      description?: string
      content?: string
      tag_ids?: string[]
    }) => {
      const formData = new FormData()
      Object.entries(data).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          value.forEach((v) => formData.append(key, v))
        } else if (value !== undefined) {
          formData.append(key, value)
        }
      })
      const response = await api.post<ItemResponse>("/items/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      return response.data.data.item
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ITEMS_QUERY_KEY })
    },
  })
}

export function useUpdateItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, tag_ids, ...data }: { id: string; tag_ids?: string[] } & Record<string, any>) => {
      // Use FormData if tag_ids are present
      if (tag_ids) {
        const formData = new FormData()
        Object.entries(data).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            if (typeof value === "object") {
              formData.append(key, JSON.stringify(value))
            } else {
              formData.append(key, String(value))
            }
          }
        })
        tag_ids.forEach((tagId) => formData.append("tag_ids", tagId))

        const response = await api.put<ItemResponse>(`/items/${id}/`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        })
        return response.data.data.item
      }

      // Regular JSON request if no tags
      const response = await api.put<ItemResponse>(`/items/${id}/`, data)
      return response.data.data.item
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ITEMS_QUERY_KEY })
    },
  })
}

export function useDeleteItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/items/${id}/`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ITEMS_QUERY_KEY })
    },
  })
}

export function useSearchItems() {
  const [page, setPage] = useState(1)
  const [allItems, setAllItems] = useState<Item[]>([])
  const [pagination, setPagination] = useState<PaginationInfo | null>(null)
  const [currentQuery, setCurrentQuery] = useState<string>("")

  const searchMutation = useMutation({
    mutationFn: async (query: string, pageNum: number = 1) => {
      const params = new URLSearchParams()
      params.set("q", query)
      params.set("page", String(pageNum))
      params.set("page_size", "20")
      const response = await api.get<ItemsResponse>(`/items/search/?${params.toString()}`)
      return { ...response.data.data, query }
    },
  })

  const loadMore = () => {
    if (pagination && pagination.has_next && !searchMutation.isPending && currentQuery) {
      const nextPage = page + 1
      searchMutation.mutate(currentQuery, {
        onSuccess: (data) => {
          setPage(nextPage)
          setAllItems((prev) => [...prev, ...(data.items as Item[])])
          setPagination(data.pagination)
        },
      })
    }
  }

  const reset = () => {
    setPage(1)
    setAllItems([])
    setPagination(null)
    setCurrentQuery("")
  }

  // Handle initial search
  const search = (query: string) => {
    setPage(1)
    setAllItems([])
    setPagination(null)
    setCurrentQuery(query)
    searchMutation.mutate(query, {
      onSuccess: (data) => {
        setAllItems(data.items as Item[])
        setPagination(data.pagination)
      },
    })
  }

  return {
    items: allItems,
    pagination,
    isLoading: searchMutation.isPending && page === 1,
    isLoadingMore: searchMutation.isPending && page > 1,
    error: searchMutation.error,
    search,
    loadMore,
    reset,
    hasNextPage: pagination?.has_next ?? false,
    isPending: searchMutation.isPending,
  }
}

export function useTogglePinItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post<{ data: { item: { id: string; is_pinned: boolean } } }>(`/items/${id}/pin/`)
      return response.data.data.item
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ITEMS_QUERY_KEY })
    },
  })
}

export function useBatchDeleteItems() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (itemIds: string[]) => {
      const response = await api.post<{ data: { message: string; count: number } }>(`/items/batch-delete/`, {
        item_ids: itemIds,
      })
      return response.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ITEMS_QUERY_KEY })
    },
  })
}

export function useCreateShare() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ itemId, expiresInHours = 24, maxAccessCount, slug, password }: {
      itemId: string
      expiresInHours?: number
      maxAccessCount?: number
      slug?: string
      password?: string
    }) => {
      const response = await api.post<{ data: { share: SharedItem } }>(`/items/${itemId}/share/`, {
        expires_in_hours: expiresInHours,
        max_access_count: maxAccessCount,
        slug,
        password,
      })
      return response.data.data.share
    },
  })
}

export function useItemShares(itemId: string) {
  return useQuery({
    queryKey: ["shares", itemId],
    queryFn: async () => {
      const response = await api.get<{ data: { shares: SharedItem[] } }>(`/items/${itemId}/shares/`)
      return response.data.data.shares
    },
    enabled: !!itemId,
  })
}

export function useDeleteShare() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (shareId: string) => {
      await api.delete(`/shares/${shareId}/`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shares"] })
    },
  })
}
