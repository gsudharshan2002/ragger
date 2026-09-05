"use client"

import { useState, useEffect } from "react"
import { apiFetch, apiUpload } from "@/lib/api"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import { X, Activity, Loader2, Clock, AlertCircle, ExternalLink, Trash2, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { useRagContext, normalizeTrace } from "@/hooks/use-rag"
import type { ApiResponse } from "@/lib/types"
import { formatDuration } from "@/lib/utils"

interface TracesListModalProps {
  open: boolean
  onClose: () => void
}

interface TraceSummary {
  id: string
  query: string
  timestamp: string
  strategy: string
  latencyMs: number
}

export function TracesListModal({ open, onClose }: TracesListModalProps) {
  const [traces, setTraces] = useState<TraceSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [pendingClear, setPendingClear] = useState<{ ids: string[]; label: string } | null>(null)
  const { setSelectedTrace, setTracePanelOpen } = useRagContext()

  useEffect(() => {
    if (!open) return
    setLoading(true)
    setError(null)
    setSelectedIds(new Set())
    apiFetch("/traces")
      .then((r) => r.json())
      .then((res: ApiResponse<TraceSummary[]>) => {
        if (res.success && res.data) {
          setTraces(res.data.map((t) => {
            const raw = t as unknown as Record<string, unknown>
            return {
              id: t.id,
              query: raw.query as string || "—",
              timestamp: raw.timestamp as string || "",
              strategy: raw.strategy as string || "—",
              latencyMs: (raw.total_latency_ms as number) ?? (raw.totalLatencyMs as number) ?? 0,
            }
          }))
        }
      })
      .catch(() => setError("Failed to load traces"))
      .finally(() => setLoading(false))
  }, [open])

  const handleViewTrace = async (traceId: string) => {
    try {
      const res = await apiFetch(`/traces/${traceId}`)
      const body: ApiResponse<Record<string, any>> = await res.json()
      if (body.success && body.data) {
        setSelectedTrace(normalizeTrace(body.data))
        setTracePanelOpen(true)
        onClose()
      }
    } catch {
      // ignore
    }
  }

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const allSelected = traces.length > 0 && traces.every((t) => selectedIds.has(t.id))
  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(traces.map((t) => t.id)))
  }

  const confirmClear = async () => {
    if (!pendingClear) return
    const { ids } = pendingClear
    await Promise.all(ids.map((id) => apiFetch(`/traces/${id}`, { method: "DELETE" }).catch(() => null)))
    setTraces((prev) => prev.filter((t) => !ids.includes(t.id)))
    setSelectedIds((prev) => {
      const next = new Set(prev)
      ids.forEach((id) => next.delete(id))
      return next
    })
    setPendingClear(null)
  }

  if (typeof window === "undefined") return null

  return createPortal(
    <>
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-lg bg-white rounded-2xl popup-bevel overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-gray-500" />
                <h2 className="text-sm font-semibold text-gray-900">Execution Traces</h2>
              </div>
              <div className="flex items-center gap-1.5">
                {selectedIds.size > 0 ? (
                  <Button
                    variant="outline"
                    size="xs"
                    className="rounded-full border-red-200 text-[11px] text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={() => setPendingClear({ ids: [...selectedIds], label: `${selectedIds.size} selected trace${selectedIds.size > 1 ? "s" : ""}` })}
                  >
                    <Trash2 className="mr-1 h-3 w-3" />
                    Clear Selected ({selectedIds.size})
                  </Button>
                ) : traces.length > 0 ? (
                  <Button
                    variant="outline"
                    size="xs"
                    className="rounded-full border-red-200 text-[11px] text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={() => setPendingClear({ ids: traces.map((t) => t.id), label: "all traces" })}
                  >
                    <Trash2 className="mr-1 h-3 w-3" />
                    Clear All
                  </Button>
                ) : null}
                <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            </div>

            <div className="max-h-[60vh] overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                </div>
              ) : error ? (
                <div className="flex items-center justify-center py-12 text-sm text-gray-400">
                  <AlertCircle className="w-4 h-4 mr-2" />{error}
                </div>
              ) : traces.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Activity className="w-8 h-8 text-gray-200 mb-2" />
                  <p className="text-sm text-gray-400">No traces yet</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  <div className="flex items-center gap-3 px-6 py-2">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      className="h-3.5 w-3.5 rounded border-gray-300 accent-gray-900"
                    />
                    <span className="text-[10px] font-medium uppercase tracking-wider text-gray-400">Select all</span>
                  </div>
                  {traces.map((t) => (
                    <div
                      key={t.id}
                      className="w-full flex items-center gap-3 px-6 py-3 hover:bg-gray-50 transition-colors text-left"
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.has(t.id)}
                        onChange={() => toggleSelectOne(t.id)}
                        className="h-3.5 w-3.5 shrink-0 rounded border-gray-300 accent-gray-900"
                      />
                      <button onClick={() => handleViewTrace(t.id)} className="flex-1 min-w-0 text-left">
                        <p className="text-xs font-medium text-gray-900 truncate">{t.query || "No query"}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-gray-400">{t.strategy}</span>
                          {t.latencyMs > 0 && (
                            <>
                              <span className="text-gray-300">·</span>
                              <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                                <Clock className="w-2.5 h-2.5" />{formatDuration(t.latencyMs)}
                              </span>
                            </>
                          )}
                        </div>
                      </button>
                      <ExternalLink className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                      <button
                        onClick={() => setPendingClear({ ids: [t.id], label: t.query || "this trace" })}
                        className="shrink-0 rounded-md p-1 text-gray-300 hover:bg-red-50 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

    <Dialog open={!!pendingClear} onOpenChange={(o) => { if (!o) setPendingClear(null) }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-red-50">
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </div>
          <DialogTitle className="text-center">
            {pendingClear && pendingClear.ids.length > 1 ? "Clear these traces?" : "Clear this trace?"}
          </DialogTitle>
          <DialogDescription className="text-center">
            This will permanently delete <span className="font-medium text-gray-700">&ldquo;{pendingClear?.label}&rdquo;</span>. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-center">
          <Button variant="outline" onClick={() => setPendingClear(null)}>Cancel</Button>
          <Button className="bg-red-600 text-white hover:bg-red-700" onClick={confirmClear}>
            <Trash2 className="mr-2 h-4 w-4" />
            Clear
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>,
    document.body
  )
}
