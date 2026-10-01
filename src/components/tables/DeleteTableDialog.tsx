"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { AlertTriangle, Loader2 } from "lucide-react"
import { tablesApi, type OrgTable, type TableAgentAccess } from "@/lib/api"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

/**
 * Confirms deletion of a table. Before showing the confirm button it looks up which
 * agents can read or write the table, so the owner sees exactly who loses access.
 * Deleting with agents attached strips the table's tools from their allow-lists.
 */
export function DeleteTableDialog({
  table,
  orgId,
  open,
  onClose,
  onDeleted,
}: {
  table: OrgTable | null
  orgId: string
  open: boolean
  onClose: () => void
  onDeleted: () => void
}) {
  const [agents, setAgents] = useState<TableAgentAccess[] | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!open || !table) return
    setAgents(null); setError("")
    tablesApi.agentsUsing(orgId, table.id)
      .then(setAgents)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Could not check agent access."))
  }, [open, table, orgId])

  async function handleDelete() {
    if (!table) return
    setDeleting(true); setError("")
    try {
      await tablesApi.delete(orgId, table.id, (agents?.length ?? 0) > 0)
      onDeleted()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Delete failed.")
    } finally {
      setDeleting(false)
    }
  }

  const inUse = (agents?.length ?? 0) > 0

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !deleting && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Delete “{table?.name}”?</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-1 text-xs">
          <p className="text-muted-foreground">
            All rows and history for this table will be removed from the Tables page. This cannot be undone from the UI.
          </p>

          {agents === null && !error && (
            <p className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" /> Checking which agents use this table…
            </p>
          )}

          {agents !== null && !inUse && (
            <p className="text-muted-foreground">No agents have access to this table.</p>
          )}

          {inUse && (
            <div className="rounded-lg border border-amber-300/60 bg-amber-50 dark:bg-amber-950/30 p-3 space-y-2">
              <p className="flex items-center gap-1.5 font-medium text-amber-800 dark:text-amber-300">
                <AlertTriangle className="size-3.5 shrink-0" />
                {agents!.length} agent{agents!.length === 1 ? "" : "s"} will lose access
              </p>
              <ul className="space-y-1">
                {agents!.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-2">
                    <Link
                      href={`/agents/${a.id}`}
                      target="_blank"
                      className="truncate underline underline-offset-2 hover:text-foreground"
                    >
                      {a.name}
                    </Link>
                    <span className="flex gap-1 shrink-0">
                      {a.read && <span className="rounded-full bg-blue-500/15 px-1.5 py-0.5 text-[10px] font-medium text-blue-600">read</span>}
                      {a.write && <span className="rounded-full bg-orange-500/15 px-1.5 py-0.5 text-[10px] font-medium text-orange-600">write</span>}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80">
                Their instructions may still mention this table — review them after deleting.
              </p>
            </div>
          )}

          {error && <p className="text-red-600">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={deleting} className="text-xs">
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={deleting || agents === null}
            className="text-xs"
          >
            {deleting && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
            {inUse ? "Delete and remove access" : "Delete table"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
