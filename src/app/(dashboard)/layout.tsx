import { AppSidebar } from "@/components/shared/AppSidebar"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
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
  )
}
