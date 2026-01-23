import { Routes, Route, Navigate } from "react-router-dom"
import { QueryProvider } from "@/components/QueryProvider"
import { Layout } from "@/components/Layout"
import { LoginPage } from "@/pages/LoginPage"
import { VerifyEmailPage } from "@/pages/VerifyEmailPage"
import { FeedPage } from "@/pages/FeedPage"
import { CreateItemPage } from "@/pages/CreateItemPage"
import { EditItemPage } from "@/pages/EditItemPage"
import { ItemDetailPage } from "@/pages/ItemDetailPage"
import { SearchPage } from "@/pages/SearchPage"
import { SettingsPage } from "@/pages/SettingsPage"
import { SharedItemPage } from "@/pages/SharedItemPage"
import { useMe } from "@/hooks/use-auth"
import { CircularProgress } from "./components/ui/CircularProgress"

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading, error } = useMe()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <CircularProgress />
      </div>
    )
  }

  if (error || !user) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

function App() {
  return (
    <QueryProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/verify/:token" element={<VerifyEmailPage />} />
        <Route path="/shared/:token" element={<SharedItemPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<FeedPage />} />
          <Route path="new" element={<CreateItemPage />} />
          <Route path="items/:id/edit" element={<EditItemPage />} />
          <Route path="items/:id" element={<ItemDetailPage />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </QueryProvider>
  )
}

export default App
