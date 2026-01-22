import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"
import type { Item, ItemType, ApiResponse, ItemsResponse, ItemResponse } from "@/lib/types"

const ITEMS_QUERY_KEY = ["items"]

export function useItems(tagIds?: string[], itemType?: ItemType, searchQuery?: string) {
  const params = new URLSearchParams()
  tagIds?.forEach((id) => params.append("tag", id))
  if (itemType) params.set("type", itemType)
  if (searchQuery) params.set("q", searchQuery)

  return useQuery({
    queryKey: [...ITEMS_QUERY_KEY, tagIds, itemType, searchQuery],
    queryFn: async () => {
      const response = await api.get<ItemsResponse>(`/items/?${params.toString()}`)
      return response.data.data.items
    },
  })
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
  return useMutation({
    mutationFn: async (query: string) => {
      const response = await api.get<ItemsResponse>(`/items/search/?q=${encodeURIComponent(query)}`)
      return response.data.data.items
    },
  })
}
