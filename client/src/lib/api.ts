import axios from "axios"

const API_URL = import.meta.env.VITE_API_URL || "/api"

// Helper function to get CSRF token from cookie
function getCSRFToken(): string | undefined {
  const cookies = document.cookie.split(";")
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split("=")
    if (name === "csrftoken") {
      return decodeURIComponent(value)
    }
  }
  return undefined
}

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  // Don't set default Content-Type - let axios set it automatically
  // For FormData, it will be "multipart/form-data; boundary=..."
  // For JSON requests, axios will set "application/json"
})

// Add CSRF token to requests
api.interceptors.request.use((config) => {
  const csrfToken = getCSRFToken()
  if (csrfToken) {
    // Add CSRF token to header for all requests
    config.headers["X-CSRFToken"] = csrfToken

    // For FormData/multipart requests, also add to the form body
    // This is required for Django's CSRF validation
    if (config.data instanceof FormData) {
      config.data.append("csrfmiddlewaretoken", csrfToken)
    }
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only redirect to login on 401 if not already on login page AND not on shared item page
    // Shared item pages use 401 for incorrect password, which should not redirect
    const isSharedItemRequest = error.config?.url?.includes("/shared/")
    const isOnLoginPage = window.location.pathname.startsWith("/login")

    if (error.response?.status === 401 && !isOnLoginPage && !isSharedItemRequest) {
      window.location.href = "/login"
    }
    return Promise.reject(error)
  }
)

export default api
