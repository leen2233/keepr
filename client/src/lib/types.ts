export type ItemType = "text" | "login" | "image" | "video" | "file"

export interface User {
  id: string
  username: string
  email: string
  email_verified: boolean
  is_staff: boolean
  is_superuser: boolean
  create_shortcut: string | null
}

export interface Tag {
  id: string
  name: string
  color: string
}

export interface Item {
  id: string
  type: ItemType
  title: string | null
  content?: string | Record<string, string>
  file?: {
    name: string
    size: number
    mimetype: string
    url: string
  }
  file_name?: string
  file_size?: number
  file_mimetype?: string
  is_pinned: boolean
  created_at: string
  updated_at: string
  tags: Tag[]
}

export interface ApiError {
  error: {
    code: string
    message: string
  }
}

export interface ApiResponse<T> {
  data: T
}

export interface PaginationInfo {
  page: number
  page_size: number
  total_count: number
  total_pages: number
  has_next: boolean
  has_prev: boolean
}

export interface AuthResponse extends ApiResponse<{ user: User }> {}
export interface ItemsResponse extends ApiResponse<{ items: Item[]; pagination: PaginationInfo }> {}
export interface ItemResponse extends ApiResponse<{ item: Item }> {}
export interface TagsResponse extends ApiResponse<{ tags: Tag[] }> {}
export interface TagResponse extends ApiResponse<{ tag: Tag }> {}
export interface SearchResponse extends ApiResponse<{ items: Item[]; query: string; pagination?: PaginationInfo }> {}
export interface MessageResponse extends ApiResponse<{ message: string }> {}

export interface SharedItem {
  id: string
  token: string
  slug: string | null
  share_url: string
  expires_at: string | null
  max_access_count: number | null
  access_count: number
  is_valid: boolean
  has_password: boolean
  created_at: string
}

export interface SharesResponse extends ApiResponse<{ shares: SharedItem[] }> {}
export interface ShareResponse extends ApiResponse<{ share: SharedItem }> {}
