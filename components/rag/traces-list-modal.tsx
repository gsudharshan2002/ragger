"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import { X, Activity, Loader2, Clock, AlertCircle, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRagContext } from "@/hooks/use-rag"
import type { RagTrace, ApiResponse } from "@/lib/types"
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
  const { setSelectedTrace, setTracePanelOpen } = useRagContext()

  useEffect(() => {
    if (!open) return
    setLoading(true)
    setError(null)
    fetch("/api/traces")
      .then((r) => r.json())
      .then((res: ApiResponse<TraceSummary[]>) => {
        if (res.success && res.data) {
          setTraces(res.data.map((t) => ({
            id: t.id,
            query: (t as unknown as Record<string, unknown>).query as string || "—",
            timestamp: (t as unknown as Record<string, unknown>).timestamp as string || "",
            strategy: (t as unknown as Record<string, unknown>).strategy as string || "—",
            latencyMs: 0,
          })))
        }
      })
      .catch(() => setError("Failed to load traces"))
      .finally(() => setLoading(false))
  }, [open])

  const handleViewTrace = async (traceId: string) => {
    try {
      const res = await fetch(`/api/traces/${traceId}`)
      const body: ApiResponse<RagTrace> = await res.json()
      if (body.success && body.data) {
        setSelectedTrace(body.data)
        setTracePanelOpen(true)
        onClose()
      }
    } catch {
      // ignore
    }
  }

  if (typeof window === "undefined") return null

  return createPortal(
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
            className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-black/[0.06] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-gray-500" />
                <h2 className="text-sm font-semibold text-gray-900">Execution Traces</h2>
              </div>
              <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
                <X className="w-4 h-4 text-gray-400" />
              </button>
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
                  {traces.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => handleViewTrace(t.id)}
                      className="w-full flex items-center gap-3 px-6 py-3 hover:bg-gray-50 transition-colors text-left"
                    >
                      <div className="flex-1 min-w-0">
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
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
