import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"
import type { User, ApiResponse, AuthResponse, MessageResponse } from "@/lib/types"

const AUTH_QUERY_KEY = ["auth"]

export function useMe() {
  return useQuery({
    queryKey: AUTH_QUERY_KEY,
    queryFn: async () => {
      const response = await api.get<AuthResponse>("/auth/me/")
      return response.data.data.user
    },
    retry: false,
  })
}

export function useRegister() {
  return useMutation({
    mutationFn: async (data: { email: string; username: string; password: string }) => {
      const response = await api.post<MessageResponse>("/auth/register/", data)
      return response.data.data.message
    },
  })
}

export function useLogin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: { email_or_username: string; password: string }) => {
      const response = await api.post<AuthResponse>("/auth/login/", data)
      return response.data.data.user
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY })
    },
  })
}

export function useLogout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      await api.post<MessageResponse>("/auth/logout/")
    },
    onSuccess: () => {
      queryClient.clear()
      window.location.href = "/login"
    },
  })
}
