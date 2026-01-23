import { Outlet, Link, useNavigate } from "react-router-dom"
import { useAuthStore, useTheme } from "@/store"
import { useLogout, useMe } from "@/hooks/use-auth"
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts"
import { Moon, Sun, LogOut, Plus, Home, Box, Settings } from "lucide-react"

export function Layout() {
  const { isDark, toggleTheme } = useTheme()
  const { data: me } = useMe()
  const logout = useLogout()
  const navigate = useNavigate()

  // Initialize keyboard shortcuts with user's create shortcut
  useKeyboardShortcuts(me?.create_shortcut || undefined)

  const handleLogout = () => logout.mutate()

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-black">
      <header className="sticky top-0 z-50 border-b border-black/20 bg-white/80 backdrop-blur-sm dark:border-white/20 dark:bg-black/80">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-black dark:bg-white">
              <Box className="h-4 w-4 text-white dark:text-black" />
            </div>
            <span className="text-lg font-semibold text-black dark:text-white">Keepr</span>
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="btn-ghost rounded-lg p-2"
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            {me && (
              <>
                <Link to="/" className="btn-ghost rounded-lg p-2" aria-label="Home">
                  <Home className="h-4 w-4" />
                </Link>

                <Link to="/settings" className="btn-ghost rounded-lg p-2" aria-label="Settings">
                  <Settings className="h-4 w-4" />
                </Link>

                <button
                  onClick={() => navigate("/new")}
                  className="btn-primary flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">New</span>
                </button>

                <div className="mx-2 hidden text-sm text-gray-600 dark:text-gray-400 sm:block">
                  {me.username}
                </div>

                <button
                  onClick={handleLogout}
                  className="btn-ghost rounded-lg p-2"
                  aria-label="Logout"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Outlet />
      </main>
    </div>
  )
}
