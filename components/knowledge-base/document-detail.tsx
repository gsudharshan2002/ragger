"use client"

import { useState, useEffect, useCallback } from "react"
import { apiFetch, previewUrl as previewUrlHelper } from "@/lib/api"
import { motion, AnimatePresence } from "framer-motion"
import {
  X,
  FileText,
  Puzzle,
  Layers,
  Clock,
  Check,
  AlertCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Trash2,
  Settings,
  Download,
  Calendar,
  HardDrive,
  Hash,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { PdfViewer } from "@/components/knowledge-base/pdf-viewer"
import { ChunkViewer } from "@/components/knowledge-base/chunk-viewer"
import { VersionHistory } from "@/components/knowledge-base/version-history"
import { ProcessingHistory } from "@/components/knowledge-base/processing-history"
import type {
  DocumentWithVersion,
  DocumentProcessingStatus,
  ApiResponse,
} from "@/lib/types"
import { formatNumber } from "@/lib/utils"

interface DocumentDetailProps {
  documentId: string
  onClose: () => void
  onNavigateToPage?: (page: number, chunkId?: string) => void
  inline?: boolean
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
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
  DocumentProcessingStatus,
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
  needs_reembedding: {
    label: "Needs Reembedding",
    color: "text-amber-600",
    bg: "bg-amber-50",
    icon: AlertTriangle,
  },
  failed: {
    label: "Failed",
    color: "text-red-600",
    bg: "bg-red-50",
    icon: AlertCircle,
  },
}

export function DocumentDetail({
  documentId,
  onClose,
  onNavigateToPage,
  inline = false,
}: DocumentDetailProps) {
  const [doc, setDoc] = useState<DocumentWithVersion | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("overview")
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [showPdf, setShowPdf] = useState(false)

  const fetchDocument = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await apiFetch(`/documents/${documentId}`)
      const body: ApiResponse<DocumentWithVersion> = await res.json()

      if (!body.success || !body.data) {
        setError(body.error?.message ?? "Document not found")
        return
      }

      setDoc(body.data)
    } catch {
      setError("Failed to load document")
    } finally {
      setLoading(false)
    }
  }, [documentId])

  useEffect(() => {
    fetchDocument()
  }, [fetchDocument])

  const handleAction = async (action: string, endpoint: string) => {
    if (actionLoading) return
    setActionLoading(action)
    try {
      await apiFetch(`/documents/${documentId}/${endpoint}`, {
        method: "POST",
      })
      fetchDocument()
    } catch {
      /* error will be visible through status */
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async () => {
    if (actionLoading) return
    if (!window.confirm("Are you sure you want to delete this document?")) return
    setActionLoading("delete")
    try {
      await apiFetch(`/documents/${documentId}`, { method: "DELETE" })
      onClose()
    } catch {
      /* error will be visible through status */
    } finally {
      setActionLoading(null)
    }
  }

  const panelClass = inline
    ? "flex flex-col h-full bg-white"
    : "fixed inset-y-0 right-0 w-full max-w-2xl bg-white popup-bevel z-40 flex flex-col"

  if (loading) {
    return (
      <motion.div
        initial={inline ? { opacity: 1 } : { opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        exit={inline ? { opacity: 1 } : { opacity: 0, x: 24 }}
        className={panelClass}
      >
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
          <div className="h-7 w-48 rounded-lg bg-gray-200/40 animate-pulse" />
          <div className="flex-1" />
          <div className="h-7 w-7 rounded-lg bg-gray-200/40 animate-pulse" />
        </div>
        <div className="flex-1 p-6 space-y-4">
          <div className="h-20 rounded-xl bg-gray-200/40 animate-pulse" />
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-16 rounded-lg bg-gray-200/40 animate-pulse" />
            ))}
          </div>
        </div>
      </motion.div>
    )
  }

  if (error || !doc) {
    return (
      <motion.div
        initial={inline ? { opacity: 1 } : { opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        exit={inline ? { opacity: 1 } : { opacity: 0, x: 24 }}
        className={panelClass}
      >
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
          <div className="flex-1" />
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center">
          <AlertCircle className="mb-3 h-8 w-8 text-gray-300" />
          <p className="text-sm font-medium text-gray-500">
            {error ?? "Document not found"}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDocument}
            className="mt-3 rounded-full text-xs"
          >
            Try again
          </Button>
        </div>
      </motion.div>
    )
  }

  const statusConfig = STATUS_CONFIG[doc.status] ?? STATUS_CONFIG.uploaded
  const StatusIcon = statusConfig.icon

  return (
    <>
      {!inline && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/10 backdrop-blur-[1px] z-30"
          onClick={onClose}
        />
      )}

      <motion.div
        initial={inline ? { opacity: 1 } : { opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        exit={inline ? { opacity: 1 } : { opacity: 0, x: 24 }}
        transition={inline ? undefined : { type: "spring", damping: 28, stiffness: 300 }}
        className={panelClass}
      >
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 shrink-0">
              <FileText className="w-4 h-4 text-gray-500" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-gray-900 truncate">
                {doc.name}
              </h2>
              <p className="text-[11px] text-gray-400 truncate">
                {doc.mimeType.split("/").pop()?.toUpperCase()} ·{" "}
                {formatBytes(doc.size)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setShowPdf(!showPdf)}
              className="text-gray-400 hover:text-gray-600"
              title="Preview PDF"
            >
              <Download className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <AnimatePresence>
          {showPdf && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 400, opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-b border-gray-200 overflow-hidden shrink-0"
            >
              <PdfViewer
                documentId={documentId}
                documentName={doc.name}
                initialPage={1}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 overflow-hidden flex flex-col">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="px-6 pt-3 border-b border-gray-100 shrink-0">
              <TabsList variant="line">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="chunks">
                  <Puzzle className="w-3.5 h-3.5" />
                  Chunks
                </TabsTrigger>
                <TabsTrigger value="versions">
                  <Layers className="w-3.5 h-3.5" />
                  Versions
                </TabsTrigger>
                <TabsTrigger value="history">
                  <Clock className="w-3.5 h-3.5" />
                  History
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-auto">
              <TabsContent value="overview" className="p-6">
                <OverviewTab document={doc} />
              </TabsContent>

              <TabsContent value="chunks" className="p-6">
                <ChunkViewer
                  documentId={documentId}
                  documentName={doc.name}
                  onSelectChunk={(chunkId) => {
                    onNavigateToPage?.(1, chunkId)
                  }}
                />
              </TabsContent>

              <TabsContent value="versions" className="p-6">
                <VersionHistory documentId={documentId} />
              </TabsContent>

              <TabsContent value="history" className="p-6">
                <ProcessingHistory documentId={documentId} />
              </TabsContent>
            </div>
          </Tabs>
        </div>

        <div className="flex items-center gap-1.5 px-4 py-3 border-t border-gray-100 bg-gray-50/50 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAction("re-process", "reprocess")}
            disabled={!!actionLoading}
            className="rounded-full text-[11px] h-7 gap-1"
          >
            {actionLoading === "re-process" ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <RefreshCw className="w-3 h-3" />
            )}
            Re-process
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAction("re-chunk", "rechunk")}
            disabled={!!actionLoading}
            className="rounded-full text-[11px] h-7 gap-1"
          >
            {actionLoading === "re-chunk" ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Puzzle className="w-3 h-3" />
            )}
            Re-chunk
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAction("re-index", "reindex")}
            disabled={!!actionLoading}
            className="rounded-full text-[11px] h-7 gap-1"
          >
            {actionLoading === "re-index" ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Settings className="w-3 h-3" />
            )}
            Re-index
          </Button>

          <div className="flex-1" />

          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={!!actionLoading}
            className="rounded-full text-[11px] h-7 gap-1"
          >
            {actionLoading === "delete" ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Trash2 className="w-3 h-3" />
            )}
            Delete
          </Button>
        </div>
      </motion.div>
    </>
  )
}

function OverviewTab({ document: doc }: { document: DocumentWithVersion }) {
  const statusConfig = STATUS_CONFIG[doc.status] ?? STATUS_CONFIG.uploaded
  const StatusIcon = statusConfig.icon

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4">
        <div className="flex items-center gap-2 mb-3">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${statusConfig.color} ${statusConfig.bg}`}
          >
            <StatusIcon
              className={`w-3.5 h-3.5 ${
                ["processing", "parsing", "chunking", "embedding", "indexing"].includes(
                  doc.status
                )
                  ? "animate-spin"
                  : ""
              }`}
            />
            {statusConfig.label}
          </span>
          {doc.error && (
            <span className="text-xs text-red-500">{doc.error}</span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <StatItem
            icon={<FileText className="w-3.5 h-3.5" />}
            label="Pages"
            value={doc.pageCount.toString()}
          />
          <StatItem
            icon={<Puzzle className="w-3.5 h-3.5" />}
            label="Chunks"
            value={formatNumber(doc.chunkCount)}
          />
          <StatItem
            icon={<Hash className="w-3.5 h-3.5" />}
            label="Tokens"
            value={formatNumber(doc.tokenCount)}
          />
          <StatItem
            icon={<HardDrive className="w-3.5 h-3.5" />}
            label="File Size"
            value={formatBytes(doc.size)}
          />
          <StatItem
            icon={<Calendar className="w-3.5 h-3.5" />}
            label="Created"
            value={formatDate(doc.createdAt)}
          />
          <StatItem
            icon={<Clock className="w-3.5 h-3.5" />}
            label="Updated"
            value={formatDate(doc.updatedAt)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Details
        </h3>
        <div className="rounded-xl border border-gray-200 divide-y divide-gray-100">
          <DetailRow label="Name" value={doc.name} />
          <DetailRow label="Type" value={doc.mimeType} />
          <DetailRow label="Path" value={doc.path} />
          <DetailRow label="Version" value={`v${doc.versionNumber}`} />
          {doc.knowledgeBaseId && (
            <DetailRow label="Knowledge Base" value={doc.knowledgeBaseId} />
          )}
          {doc.folderId && <DetailRow label="Folder" value={doc.folderId} />}
        </div>
      </div>

      {doc.status === "ready" && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Quick Stats
          </h3>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-center gap-3 text-xs text-gray-600">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>
                  {doc.chunkCount} chunks indexed
                </span>
              </div>
              <div className="w-px h-3.5 bg-gray-200" />
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-indigo-400" />
                <span>
                  {formatNumber(doc.tokenCount)} total tokens
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[11px] text-gray-400 mb-1">
        {icon}
        {label}
      </div>
      <p className="text-sm font-medium text-gray-900 tabular-nums">{value}</p>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-xs font-medium text-gray-900 truncate max-w-[240px] text-right">
        {value}
      </span>
    </div>
  )
}
