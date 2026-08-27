"use client"

import { useState, useEffect, useCallback } from "react"
import { apiFetch, apiUpload } from "@/lib/api"
import { motion, AnimatePresence } from "framer-motion"
import {
  Upload,
  FileSearch,
  Puzzle,
  Cpu,
  Database,
  RefreshCw,
  Trash2,
  RotateCcw,
  AlertCircle,
  Clock,
  Check,
  Loader2,
  History,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type {
  ProcessingHistoryEvent,
  ProcessingAction,
  ApiResponse,
} from "@/lib/types"

interface ProcessingHistoryProps {
  documentId: string
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function relativeTime(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diffMs / 86400000)
  if (days < 1) return "today"
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return `${Math.floor(days / 30)}mo ago`
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  const min = Math.floor(ms / 60000)
  const sec = Math.round((ms % 60000) / 1000)
  return `${min}m ${sec}s`
}

const ACTION_CONFIG: Record<
  ProcessingAction,
  { label: string; icon: typeof Upload; color: string }
> = {
  upload: { label: "Upload", icon: Upload, color: "text-blue-500" },
  parse: { label: "Parse", icon: FileSearch, color: "text-indigo-500" },
  chunk: { label: "Chunk", icon: Puzzle, color: "text-purple-500" },
  embed: { label: "Embed", icon: Cpu, color: "text-pink-500" },
  index: { label: "Index", icon: Database, color: "text-violet-500" },
  "re-chunk": {
    label: "Re-chunk",
    icon: RefreshCw,
    color: "text-orange-500",
  },
  "re-index": {
    label: "Re-index",
    icon: RefreshCw,
    color: "text-orange-500",
  },
  "re-process": {
    label: "Re-process",
    icon: Zap,
    color: "text-amber-500",
  },
  replace: { label: "Replace", icon: RefreshCw, color: "text-cyan-500" },
  restore: {
    label: "Restore",
    icon: RotateCcw,
    color: "text-teal-500",
  },
  retry: { label: "Retry", icon: RotateCcw, color: "text-blue-500" },
  delete: { label: "Delete", icon: Trash2, color: "text-red-500" },
}

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; icon: typeof Check }
> = {
  running: {
    label: "Running",
    color: "text-blue-600",
    bg: "bg-blue-50",
    icon: Loader2,
  },
  completed: {
    label: "Completed",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    icon: Check,
  },
  failed: {
    label: "Failed",
    color: "text-red-600",
    bg: "bg-red-50",
    icon: AlertCircle,
  },
}

export function ProcessingHistory({ documentId }: ProcessingHistoryProps) {
  const [events, setEvents] = useState<ProcessingHistoryEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await apiFetch(`/documents/${documentId}/history`)
      const body: ApiResponse<ProcessingHistoryEvent[]> = await res.json()

      if (!body.success || !body.data) {
        setError(body.error?.message ?? "Failed to load history")
        return
      }

      setEvents(body.data)
    } catch {
      setError("Failed to load history")
    } finally {
      setLoading(false)
    }
  }, [documentId])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex gap-4"
          >
            <div className="flex flex-col items-center shrink-0">
              <div className="h-8 w-8 rounded-full bg-gray-200/60 animate-pulse" />
              {i < 3 && <div className="w-0.5 flex-1 bg-gray-200/40 my-1" />}
            </div>
            <div className="flex-1 rounded-xl border border-gray-200 bg-white p-4 shadow-sm mb-3">
              <div className="flex items-center gap-3">
                <div className="h-4 w-20 rounded bg-gray-200/60 animate-pulse" />
                <div className="h-5 w-16 rounded-full bg-gray-200/50 animate-pulse" />
              </div>
              <div className="mt-2 h-3 w-32 rounded bg-gray-200/40 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <AlertCircle className="mb-3 h-8 w-8 text-gray-300" />
        <p className="text-sm font-medium text-gray-500">{error}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchHistory}
          className="mt-3 rounded-full text-xs"
        >
          Try again
        </Button>
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <History className="mb-3 h-8 w-8 text-gray-300" />
        <p className="text-sm font-medium text-gray-500">
          No processing history
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Processing events will appear here
        </p>
      </div>
    )
  }

  const sortedEvents = [...events].sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
  )

  return (
    <div className="space-y-0">
      <AnimatePresence mode="popLayout">
        {sortedEvents.map((event, idx) => {
          const actionConfig = ACTION_CONFIG[event.action] ?? {
            label: event.action,
            icon: Clock,
            color: "text-gray-500",
          }
          const statusConfig = STATUS_CONFIG[event.status] ?? STATUS_CONFIG.completed
          const StatusIcon = statusConfig.icon
          const ActionIcon = actionConfig.icon
          const isLast = idx === sortedEvents.length - 1

          return (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ delay: idx * 0.03 }}
              className="relative flex gap-4"
            >
              <div className="flex flex-col items-center shrink-0">
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full border-2 shrink-0 ${
                    event.status === "running"
                      ? "border-blue-300 bg-blue-50"
                      : event.status === "failed"
                        ? "border-red-200 bg-red-50"
                        : "border-gray-200 bg-gray-50"
                  }`}
                >
                  <ActionIcon
                    className={`w-3.5 h-3.5 ${actionConfig.color} ${
                      event.status === "running" ? "animate-pulse" : ""
                    }`}
                  />
                </div>
                {!isLast && (
                  <div className="w-0.5 flex-1 bg-gray-200 my-1" />
                )}
              </div>

              <div className="flex-1 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden mb-3">
                <div className="px-4 py-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gray-900">
                      {actionConfig.label}
                    </span>

                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${statusConfig.color} ${statusConfig.bg}`}
                    >
                      <StatusIcon
                        className={`w-3 h-3 ${
                          event.status === "running" ? "animate-spin" : ""
                        }`}
                      />
                      {statusConfig.label}
                    </span>

                    {event.durationMs != null && (
                      <span className="text-[11px] text-gray-400 tabular-nums">
                        {formatDuration(event.durationMs)}
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-gray-400 mt-1">
                    {formatDate(event.startedAt)} · {relativeTime(event.startedAt)}
                  </p>

                  {event.error && (
                    <div className="mt-2 rounded-lg bg-red-50 border border-red-100 px-3 py-2">
                      <p className="text-[11px] text-red-600 leading-relaxed">
                        {event.error}
                      </p>
                    </div>
                  )}

                  {event.resultSummary && (
                    <div className="mt-2 rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2">
                      <p className="text-[11px] text-emerald-700 leading-relaxed">
                        {event.resultSummary}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
