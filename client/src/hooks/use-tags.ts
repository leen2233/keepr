import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"
import type { Tag, ApiResponse, TagsResponse, TagResponse } from "@/lib/types"

const TAGS_QUERY_KEY = ["tags"]

export function useTags() {
  return useQuery({
    queryKey: TAGS_QUERY_KEY,
    queryFn: async () => {
      const response = await api.get<TagsResponse>("/tags/")
      return response.data.data.tags
    },
  })
}

export function useCreateTag() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: { name: string; color?: string }) => {
      const response = await api.post<TagResponse>("/tags/", data)
      return response.data.data.tag
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TAGS_QUERY_KEY })
    },
  })
}

export function useUpdateTag() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<Tag>) => {
      await api.put(`/tags/${id}/`, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TAGS_QUERY_KEY })
    },
  })
}

export function useDeleteTag() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/tags/${id}/`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TAGS_QUERY_KEY })
    },
  })
}
