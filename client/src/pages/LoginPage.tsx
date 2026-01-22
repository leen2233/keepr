import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useLogin, useRegister } from "@/hooks/use-auth"
import { useAuthStore } from "@/store"
import { Mail, User, Lock, ArrowRight, AlertCircle } from "lucide-react"

export function LoginPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [signupDisabled, setSignupDisabled] = useState(false)

  const navigate = useNavigate()
  const login = useLogin()
  const register = useRegister()
  const setUser = useAuthStore((state) => state.setUser)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSignupDisabled(false)

    try {
      if (isLogin) {
        const user = await login.mutateAsync({
          email_or_username: email,
          password,
        })
        setUser(user)
        navigate("/")
      } else {
        await register.mutateAsync({
          email,
          username,
          password,
        })
        setError("Registration successful. Please check your email to verify.")
      }
    } catch (err: any) {
      const errorCode = err.response?.data?.error?.code
      const message = err.response?.data?.error?.message || "An error occurred"

      if (errorCode === "SIGNUP_DISABLED") {
        setError(message)
        setSignupDisabled(true)
        // Switch back to login view
        setIsLogin(true)
      } else {
        setError(message)
      }
    }
  }

  const handleToggleMode = () => {
    setIsLogin(!isLogin)
    setError("")
    setSignupDisabled(false)
  }

  return (
    <div className="flex min-h-[calc(100vh-64px)] items-center justify-center">
      <div className="w-full max-w-sm">
        <div className="card">
          <h1 className="mb-1 text-xl font-semibold text-black dark:text-white">
            {isLogin ? "Sign in" : "Create account"}
          </h1>
          <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">
            {isLogin ? "to access your archive" : "to get started"}
          </p>

          {signupDisabled && (
            <div className="mb-4 rounded-lg bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-400">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <p>This is a private server. Registration is disabled.</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label htmlFor="username" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Username
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="input pl-10"
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input pl-10"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pl-10"
                  required
                  minLength={8}
                />
              </div>
            </div>

            {error && !signupDisabled && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={login.isPending || register.isPending}
              className="btn-primary w-full"
            >
              {login.isPending || register.isPending ? "Please wait..." : (
                <>
                  {isLogin ? "Sign in" : "Create"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              type="button"
              onClick={handleToggleMode}
              className="font-medium text-black dark:text-white hover:underline"
            >
              {isLogin ? "Sign up" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
