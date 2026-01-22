import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { User } from "@/lib/types"

interface AuthState {
  user: User | null
  setUser: (user: User | null) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
    }),
    {
      name: "keepr-auth",
    }
  )
)

interface TagFilterState {
  selectedTagIds: string[]
  toggleTag: (id: string) => void
  clearTags: () => void
}

export const useTagFilter = create<TagFilterState>((set) => ({
  selectedTagIds: [],
  toggleTag: (id) =>
    set((state) => ({
      selectedTagIds: state.selectedTagIds.includes(id)
        ? state.selectedTagIds.filter((t) => t !== id)
        : [...state.selectedTagIds, id],
    })),
  clearTags: () => set({ selectedTagIds: [] }),
}))

interface ItemTypeFilterState {
  selectedType: string | null
  setType: (type: string | null) => void
}

export const useItemTypeFilter = create<ItemTypeFilterState>((set) => ({
  selectedType: null,
  setType: (type) => set({ selectedType: type }),
}))

interface ThemeState {
  isDark: boolean
  toggleTheme: () => void
  setTheme: (isDark: boolean) => void
}

export const useTheme = create<ThemeState>()(
  persist(
    (set) => ({
      isDark: true,
      toggleTheme: () => set((state) => {
        const newTheme = !state.isDark
        document.documentElement.classList.toggle("dark", newTheme)
        return { isDark: newTheme }
      }),
      setTheme: (isDark) => set((state) => {
        document.documentElement.classList.toggle("dark", isDark)
        return { isDark }
      }),
    }),
    {
      name: "keepr-theme",
      onRehydrateStorage: () => (state) => {
        if (state) {
          document.documentElement.classList.toggle("dark", state.isDark)
        }
      },
    }
  )
)

interface ModalState {
  createModalOpen: boolean
  setCreateModalOpen: (open: boolean) => void
}

export const useModal = create<ModalState>((set) => ({
  createModalOpen: false,
  setCreateModalOpen: (open) => set({ createModalOpen: open }),
}))

interface SearchState {
  searchQuery: string
  setSearchQuery: (query: string) => void
}

export const useSearch = create<SearchState>((set) => ({
  searchQuery: "",
  setSearchQuery: (query) => set({ searchQuery: query }),
}))
