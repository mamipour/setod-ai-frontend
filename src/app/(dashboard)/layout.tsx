"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { AppSidebar } from "@/components/shared/AppSidebar"
import { ActiveOrgProvider } from "@/hooks/useActiveOrg"

/** After Google OAuth, redirect back to /accept-invite if there's a pending token. */
function PendingInviteRedirector() {
  const router = useRouter()
  useEffect(() => {
    if (typeof window === "undefined") return
    const token = sessionStorage.getItem("pending_invite_token")
    if (token) {
      sessionStorage.removeItem("pending_invite_token")
      router.replace(`/accept-invite?token=${encodeURIComponent(token)}`)
    }
  }, [router])
  return null
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ActiveOrgProvider>
      <PendingInviteRedirector />
      <div className="flex h-screen overflow-hidden bg-background">
        <AppSidebar />
        {/* Extra top padding on small screens clears the fixed mobile header the sidebar
            renders in place of itself. */}
        <main className="flex-1 overflow-y-auto p-6 pt-20 md:pt-6">
          {/* One centered column for every dashboard page, so content does not hug the sidebar
              on wide screens. Pages should not set their own max width. */}
          <div className="mx-auto w-full max-w-4xl">{children}</div>
        </main>
      </div>
    </ActiveOrgProvider>
  )
}
