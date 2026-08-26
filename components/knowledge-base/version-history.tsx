"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Clock,
  Check,
  AlertCircle,
  Loader2,
  RotateCcw,
  FileText,
  Puzzle,
  Hash,
  Layers,
  Tag,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { DocumentVersion, ApiResponse } from "@/lib/types"
import { formatNumber } from "@/lib/utils"

interface VersionHistoryProps {
  documentId: string
  onRestore?: (versionId: string) => void
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

function relativeTime(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diffMs / 86400000)
  if (days < 1) return "today"
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return `${Math.floor(days / 30)}mo ago`
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

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; icon: typeof Check }
> = {
  uploaded: {
    label: "Uploaded",
    color: "text-gray-600",
    bg: "bg-gray-50",
    icon: Clock,
  },
  processing: {
    label: "Processing",
    color: "text-blue-600",
    bg: "bg-blue-50",
    icon: Loader2,
  },
  parsing: {
    label: "Parsing",
    color: "text-blue-600",
    bg: "bg-blue-50",
    icon: Loader2,
  },
  chunking: {
    label: "Chunking",
    color: "text-blue-600",
    bg: "bg-blue-50",
    icon: Loader2,
  },
  embedding: {
    label: "Embedding",
    color: "text-blue-600",
    bg: "bg-blue-50",
    icon: Loader2,
  },
  indexing: {
    label: "Indexing",
    color: "text-blue-600",
    bg: "bg-blue-50",
    icon: Loader2,
  },
  ready: {
    label: "Ready",
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

export function VersionHistory({ documentId, onRestore }: VersionHistoryProps) {
  const [versions, setVersions] = useState<DocumentVersion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [restoringId, setRestoringId] = useState<string | null>(null)

  const fetchVersions = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`/api/documents/${documentId}/versions`)
      const body: ApiResponse<DocumentVersion[]> = await res.json()

      if (!body.success || !body.data) {
        setError(body.error?.message ?? "Failed to load versions")
        return
      }

      setVersions(body.data)
    } catch {
      setError("Failed to load versions")
    } finally {
      setLoading(false)
    }
  }, [documentId])

  useEffect(() => {
    fetchVersions()
  }, [fetchVersions])

  const handleRestore = async (version: DocumentVersion) => {
    if (!onRestore || restoringId) return
    setRestoringId(version.id)
    try {
      onRestore(version.id)
    } finally {
      setRestoringId(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-gray-200/60 animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-24 rounded bg-gray-200/60 animate-pulse" />
                <div className="h-3 w-40 rounded bg-gray-200/40 animate-pulse" />
              </div>
              <div className="h-5 w-16 rounded-full bg-gray-200/50 animate-pulse" />
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
          onClick={fetchVersions}
          className="mt-3 rounded-full text-xs"
        >
          Try again
        </Button>
      </div>
    )
  }

  if (versions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Layers className="mb-3 h-8 w-8 text-gray-300" />
        <p className="text-sm font-medium text-gray-500">No versions yet</p>
        <p className="text-xs text-gray-400 mt-1">
          Versions are created when documents are updated
        </p>
      </div>
    )
  }

  const sortedVersions = [...versions].sort(
    (a, b) => b.versionNumber - a.versionNumber
  )

  return (
    <div className="space-y-0">
      <AnimatePresence mode="popLayout">
        {sortedVersions.map((version, idx) => {
          const statusConfig = STATUS_CONFIG[version.status] ?? STATUS_CONFIG.ready
          const StatusIcon = statusConfig.icon
          const isLatest = version.isLatest
          const isLast = idx === sortedVersions.length - 1

          return (
            <motion.div
              key={version.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ delay: idx * 0.03 }}
              className="relative flex gap-4"
            >
              <div className="flex flex-col items-center shrink-0">
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full border-2 shrink-0 ${
                    isLatest
                      ? "border-indigo-400 bg-indigo-50"
                      : "border-gray-200 bg-gray-50"
                  }`}
                >
                  <span
                    className={`text-[10px] font-bold tabular-nums ${
                      isLatest ? "text-indigo-600" : "text-gray-500"
                    }`}
                  >
                    v{version.versionNumber}
                  </span>
                </div>
                {!isLast && (
                  <div className="w-0.5 flex-1 bg-gray-200 my-1" />
                )}
              </div>

              <div
                className={`flex-1 rounded-xl border bg-white shadow-sm overflow-hidden mb-3 ${
                  isLatest
                    ? "border-indigo-200"
                    : "border-gray-200"
                }`}
              >
                <div className="px-4 py-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gray-900">
                      Version {version.versionNumber}
                    </span>

                    {isLatest && (
                      <Badge
                        variant="secondary"
                        className="bg-indigo-50 text-indigo-600 text-[10px] px-1.5 py-0 h-4"
                      >
                        <Tag className="w-2.5 h-2.5 mr-0.5" />
                        Latest
                      </Badge>
                    )}

                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${statusConfig.color} ${statusConfig.bg}`}
                    >
                      <StatusIcon
                        className={`w-3 h-3 ${
                          ["processing", "parsing", "chunking", "embedding", "indexing"].includes(
                            version.status
                          )
                            ? "animate-spin"
                            : ""
                        }`}
                      />
                      {statusConfig.label}
                    </span>

                    {version.error && (
                      <span className="text-[11px] text-red-500 truncate max-w-[200px]">
                        {version.error}
                      </span>
                    )}

                    <div className="flex-1" />

                    {!isLatest && onRestore && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRestore(version)}
                        disabled={restoringId === version.id}
                        className="rounded-full text-[11px] h-6 px-2 gap-1"
                      >
                        {restoringId === version.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <RotateCcw className="w-3 h-3" />
                        )}
                        Restore
                      </Button>
                    )}
                  </div>

                  <p className="text-[11px] text-gray-400 mt-1">
                    {formatDate(version.createdAt)} · {relativeTime(version.createdAt)}
                  </p>

                  <div className="flex items-center gap-4 mt-2 text-[11px] text-gray-500">
                    <span className="flex items-center gap-1">
                      <FileText className="w-3 h-3 text-gray-400" />
                      {formatBytes(version.fileSize)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Layers className="w-3 h-3 text-gray-400" />
                      {version.pageCount} pages
                    </span>
                    <span className="flex items-center gap-1">
                      <Puzzle className="w-3 h-3 text-gray-400" />
                      {formatNumber(version.chunkCount)} chunks
                    </span>
                    <span className="flex items-center gap-1">
                      <Hash className="w-3 h-3 text-gray-400" />
                      {formatNumber(version.tokenCount)} tokens
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
