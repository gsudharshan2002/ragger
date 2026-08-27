"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { apiFetch, apiUpload } from "@/lib/api"
import { motion, AnimatePresence } from "framer-motion"
import {
  Search,
  ChevronDown,
  ChevronRight,
  Check,
  AlertCircle,
  Loader2,
  Puzzle,
  Hash,
  FileText,
  ChevronLeft,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type {
  DocumentChunkWithMeta,
  ApiResponse,
} from "@/lib/types"
import { formatNumber } from "@/lib/utils"

interface ChunkViewerProps {
  documentId: string
  documentName: string
  selectedChunkId?: string
  onSelectChunk?: (chunkId: string) => void
}

const PAGE_SIZE = 20

function truncateId(id: string): string {
  if (id.length <= 12) return id
  return `${id.slice(0, 6)}...${id.slice(-4)}`
}

function relativeTime(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diffMs / 86400000)
  if (days < 1) return "today"
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return `${Math.floor(days / 30)}mo ago`
}

export function ChunkViewer({
  documentId,
  documentName,
  selectedChunkId,
  onSelectChunk,
}: ChunkViewerProps) {
  const [chunks, setChunks] = useState<DocumentChunkWithMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [expandedId, setExpandedId] = useState<string | null>(
    selectedChunkId ?? null
  )
  const [page, setPage] = useState(1)

  const fetchChunks = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await apiFetch(`/documents/${documentId}/chunks`)
      const body: ApiResponse<DocumentChunkWithMeta[]> = await res.json()

      if (!body.success || !body.data) {
        setError(body.error?.message ?? "Failed to load chunks")
        return
      }

      setChunks(body.data)
    } catch {
      setError("Failed to load chunks")
    } finally {
      setLoading(false)
    }
  }, [documentId])

  useEffect(() => {
    fetchChunks()
  }, [fetchChunks])

  useEffect(() => {
    if (selectedChunkId) {
      setExpandedId(selectedChunkId)
      const idx = chunks.findIndex((c) => c.id === selectedChunkId)
      if (idx >= 0) {
        setPage(Math.floor(idx / PAGE_SIZE) + 1)
      }
    }
  }, [selectedChunkId, chunks])

  const filteredChunks = useMemo(() => {
    if (!searchQuery.trim()) return chunks
    const q = searchQuery.toLowerCase()
    return chunks.filter(
      (c) =>
        c.content.toLowerCase().includes(q) ||
        c.documentName.toLowerCase().includes(q) ||
        c.section?.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q)
    )
  }, [chunks, searchQuery])

  const totalPages = Math.max(1, Math.ceil(filteredChunks.length / PAGE_SIZE))
  const pagedChunks = filteredChunks.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  )

  useEffect(() => {
    setPage(1)
  }, [searchQuery])

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id))
    onSelectChunk?.(id)
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-9 w-full max-w-sm rounded-lg bg-gray-200/40 animate-pulse" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="h-4 w-24 rounded bg-gray-200/60 animate-pulse" />
                <div className="h-4 w-12 rounded bg-gray-200/40 animate-pulse" />
                <div className="h-4 w-16 rounded bg-gray-200/40 animate-pulse" />
                <div className="h-4 w-20 rounded bg-gray-200/40 animate-pulse" />
              </div>
              <div className="mt-2 h-4 w-3/4 rounded bg-gray-200/40 animate-pulse" />
            </div>
          ))}
        </div>
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
          onClick={fetchChunks}
          className="mt-3 rounded-full text-xs"
        >
          Try again
        </Button>
      </div>
    )
  }

  if (chunks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Puzzle className="mb-3 h-8 w-8 text-gray-300" />
        <p className="text-sm font-medium text-gray-500">No chunks yet</p>
        <p className="text-xs text-gray-400 mt-1">
          Chunks will appear after the document is processed
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search chunks by content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white py-1.5 pl-8 pr-3 text-xs text-gray-900 placeholder-gray-400 outline-none focus:border-gray-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <span className="text-[11px] text-gray-400 tabular-nums">
          {filteredChunks.length} chunk{filteredChunks.length !== 1 ? "s" : ""}
          {searchQuery ? ` (filtered)` : ""}
        </span>
      </div>

      <div className="space-y-1.5">
        <AnimatePresence mode="popLayout">
          {pagedChunks.map((chunk, idx) => {
            const isExpanded = expandedId === chunk.id
            const isSelected = selectedChunkId === chunk.id
            const preview = chunk.content.slice(0, 150)
            const hasMore = chunk.content.length > 150

            return (
              <motion.div
                key={chunk.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ delay: idx * 0.02 }}
                className={`rounded-xl border bg-white shadow-sm overflow-hidden transition-colors ${
                  isSelected
                    ? "border-indigo-300 bg-indigo-50/30"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <button
                  onClick={() => toggleExpand(chunk.id)}
                  className="w-full text-left px-4 py-3"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    )}
                    <span className="text-xs font-mono text-gray-500">
                      {truncateId(chunk.id)}
                    </span>

                    <div className="w-px h-3.5 bg-gray-200" />

                    <span className="flex items-center gap-1 text-[11px] text-gray-500">
                      <FileText className="w-3 h-3" />
                      p.{chunk.page}
                    </span>

                    {chunk.section && (
                      <>
                        <div className="w-px h-3.5 bg-gray-200" />
                        <span className="text-[11px] text-gray-500 truncate max-w-[150px]">
                          {chunk.section}
                        </span>
                      </>
                    )}

                    <div className="w-px h-3.5 bg-gray-200" />

                    <span className="flex items-center gap-1 text-[11px] text-gray-500">
                      <Hash className="w-3 h-3" />
                      {chunk.tokenCount} tokens
                    </span>

                    <div className="flex-1" />

                    <EmbeddingStatusBadge status={chunk.embeddingStatus} />
                  </div>

                  {!isExpanded && (
                    <p className="mt-1.5 ml-6 text-xs text-gray-400 leading-relaxed">
                      {preview}
                      {hasMore && (
                        <span className="text-gray-300">...</span>
                      )}
                    </p>
                  )}
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 pt-0 border-t border-gray-100">
                        <div className="mt-3 space-y-3">
                          <div className="flex items-center gap-4 text-[11px] text-gray-400">
                            <span className="font-mono">
                              ID: {chunk.id}
                            </span>
                            {chunk.createdAt && (
                              <span>{relativeTime(chunk.createdAt)}</span>
                            )}
                          </div>

                          <div className="rounded-lg bg-gray-50 border border-gray-100 p-3">
                            <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap break-words font-mono">
                              {chunk.content}
                            </p>
                          </div>

                          {onSelectChunk && (
                            <div className="flex justify-end">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onSelectChunk(chunk.id)
                                }}
                                className="rounded-full text-xs h-7"
                              >
                                View in PDF
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="text-gray-500"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-xs text-gray-500 tabular-nums">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="text-gray-500"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  )
}

function EmbeddingStatusBadge({
  status,
}: {
  status: string
}) {
  const config: Record<string, { label: string; color: string; bg: string }> = {
    embedded: {
      label: "Embedded",
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    not_embedded: {
      label: "Not embedded",
      color: "text-gray-500",
      bg: "bg-gray-100",
    },
    stale: {
      label: "Stale",
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
  }

  const c = config[status] ?? config.not_embedded

  return (
    <Badge
      variant="secondary"
      className={`${c.color} ${c.bg} text-[10px] px-1.5 py-0 h-4 font-medium`}
    >
      {status === "embedded" && <Check className="w-2.5 h-2.5 mr-0.5" />}
      {c.label}
    </Badge>
  )
}
