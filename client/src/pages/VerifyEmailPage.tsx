import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { CheckCircle, XCircle, Loader2 } from "lucide-react"
import api from "@/lib/api"

export function VerifyEmailPage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")

  useEffect(() => {
    async function verifyEmail() {
      try {
        await api.get(`/auth/verify/${token}/`)
        setStatus("success")
      } catch {
        setStatus("error")
      }
    }

    if (token) {
      verifyEmail()
    } else {
      setStatus("error")
    }
  }, [token])

  return (
    <div className="flex min-h-[calc(100vh-64px)] items-center justify-center">
      <div className="w-full max-w-md text-center">
        {status === "loading" && (
          <>
            <Loader2 className="mx-auto h-16 w-16 animate-spin text-black dark:text-white" />
            <h1 className="mt-6 text-2xl font-bold text-black dark:text-white">
              Verifying your email...
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Please wait while we verify your account.
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle className="mx-auto h-16 w-16 text-black dark:text-white" />
            <h1 className="mt-6 text-2xl font-bold text-black dark:text-white">
              Email verified!
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Your account has been verified. You can now sign in.
            </p>
            <button
              onClick={() => navigate("/login")}
              className="btn-primary btn mt-6"
            >
              Go to login
            </button>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle className="mx-auto h-16 w-16 text-black dark:text-white" />
            <h1 className="mt-6 text-2xl font-bold text-black dark:text-white">
              Verification failed
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              This verification link is invalid or has expired.
            </p>
            <button
              onClick={() => navigate("/login")}
              className="btn-secondary btn mt-6"
            >
              Back to login
            </button>
          </>
        )}
      </div>
    </div>
  )
}
