"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function AuthPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to login page
    router.push("/signup")
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center p-4">
      <div className="text-center">
        <p className="text-gray-600 dark:text-gray-400">Redirecting to login...</p>
      </div>
    </div>
  )
}
