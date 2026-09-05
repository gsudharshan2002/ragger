"use client"

import { useState, useEffect, useCallback } from "react"
import { apiFetch, apiUpload } from "@/lib/api"
import { motion, AnimatePresence } from "framer-motion"
import {
  FileText,
  Search,
  Upload,
  Check,
  Loader2,
  AlertCircle,
  AlertTriangle,
  Clock,
  Puzzle,
  Hash,
  ArrowUpDown,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { SelectField } from "@/components/ui/select-field"
import type {
  DocumentWithVersion,
  DocumentProcessingStatus,
  ApiResponse,
} from "@/lib/types"
import { formatNumber } from "@/lib/utils"
import { UploadModal } from "@/components/rag/upload-modal"

interface KbDocumentBrowserProps {
  knowledgeBaseId: string
  folderId: string | null
  refreshKey: number
}

type SortField = "name" | "size" | "chunks" | "tokens" | "date"
type SortDirection = "asc" | "desc"

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

export function KbDocumentBrowser({
  knowledgeBaseId,
  folderId,
  refreshKey,
}: KbDocumentBrowserProps) {
  const [documents, setDocuments] = useState<DocumentWithVersion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [sortField, setSortField] = useState<SortField>("date")
  const [sortDir, setSortDir] = useState<SortDirection>("desc")
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null)
  const [uploadOpen, setUploadOpen] = useState(false)

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (folderId) params.set("folder_id", folderId)

      const res = await apiFetch(`/knowledge-bases/${knowledgeBaseId}/documents?${params}`)
      const body: ApiResponse<DocumentWithVersion[]> = await res.json()

      if (!body.success || !body.data) {
        setError(body.error?.message ?? "Failed to load documents")
        return
      }

      setDocuments(body.data)
    } catch {
      setError("Failed to load documents")
    } finally {
      setLoading(false)
    }
  }, [knowledgeBaseId, folderId])

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments, refreshKey])

  const filteredDocs = documents
    .filter((doc) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        if (!doc.name.toLowerCase().includes(q)) return false
      }
      if (statusFilter !== "all" && doc.status !== statusFilter) return false
      return true
    })
    .sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1
      switch (sortField) {
        case "name":
          return a.name.localeCompare(b.name) * dir
        case "size":
          return (a.size - b.size) * dir
        case "chunks":
          return (a.chunkCount - b.chunkCount) * dir
        case "tokens":
          return (a.tokenCount - b.tokenCount) * dir
        case "date":
        default:
          return (
            (new Date(a.createdAt).getTime() -
              new Date(b.createdAt).getTime()) *
            dir
          )
      }
    })

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortField(field)
      setSortDir("desc")
    }
  }

  const SortHeader = ({
    field,
    label,
    className,
  }: {
    field: SortField
    label: string
    className?: string
  }) => (
    <th
      className={`px-4 py-3 font-medium text-gray-600 ${className ?? ""}`}
    >
      <button
        onClick={() => handleSort(field)}
        className="flex items-center gap-1 hover:text-gray-900 transition-colors"
      >
        {label}
        <ArrowUpDown
          className={`w-3 h-3 ${
            sortField === field ? "text-gray-900" : "text-gray-300"
          }`}
        />
      </button>
    </th>
  )

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="h-9 w-full max-w-xs rounded-lg bg-gray-200/40 animate-pulse" />
            <div className="h-9 w-32 rounded-lg bg-gray-200/40 animate-pulse" />
          </div>
        </div>
        <div className="divide-y divide-gray-50">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3">
              <div className="h-4 w-4 rounded bg-gray-200/60 animate-pulse" />
              <div className="h-4 w-40 rounded bg-gray-200/60 animate-pulse" />
              <div className="h-4 w-16 rounded bg-gray-200/40 animate-pulse" />
              <div className="h-4 w-12 rounded bg-gray-200/40 animate-pulse" />
              <div className="h-4 w-12 rounded bg-gray-200/40 animate-pulse" />
              <div className="h-4 w-12 rounded bg-gray-200/40 animate-pulse" />
              <div className="h-5 w-16 rounded-full bg-gray-200/50 animate-pulse" />
              <div className="h-4 w-12 rounded bg-gray-200/40 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm flex flex-col items-center justify-center py-16">
        <AlertCircle className="mb-3 h-8 w-8 text-gray-300" />
        <p className="text-sm font-medium text-gray-500">{error}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchDocuments}
          className="mt-3 rounded-full text-xs"
        >
          Try again
        </Button>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white py-1.5 pl-8 pr-3 text-xs text-gray-900 placeholder-gray-400 outline-none focus:border-gray-400"
          />
        </div>

        <SelectField
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: "all", label: "All Status" },
            { value: "ready", label: "Ready" },
            { value: "processing", label: "Processing" },
            { value: "parsing", label: "Parsing" },
            { value: "chunking", label: "Chunking" },
            { value: "embedding", label: "Embedding" },
            { value: "indexing", label: "Indexing" },
            { value: "failed", label: "Failed" },
          ]}
          width="auto"
        />

        <div className="flex-1" />

        <span className="text-[11px] text-gray-400">
          {filteredDocs.length} document{filteredDocs.length !== 1 ? "s" : ""}
        </span>

        <Button
          size="sm"
          onClick={() => setUploadOpen(true)}
          className="gap-1.5 rounded-full bg-gray-900 text-white hover:bg-gray-800 h-7 px-2.5 text-[11px] font-medium"
        >
          <Upload className="w-3 h-3" />
          Upload
        </Button>
      </div>

      {/* Document Table */}
      {filteredDocs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <FileText className="mb-3 h-8 w-8 text-gray-300" />
          <p className="text-sm font-medium text-gray-500">
            {documents.length === 0
              ? "No documents yet"
              : "No documents match your filters"}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {documents.length === 0
              ? "Upload documents to get started"
              : "Try adjusting your search or filters"}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/80">
                <SortHeader field="name" label="Name" className="text-left" />
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Type
                </th>
                <SortHeader
                  field="size"
                  label="Size"
                  className="text-right"
                />
                <th className="px-4 py-3 text-center font-medium text-gray-600">
                  Pages
                </th>
                <SortHeader
                  field="chunks"
                  label="Chunks"
                  className="text-right"
                />
                <SortHeader
                  field="tokens"
                  label="Tokens"
                  className="text-right"
                />
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Status
                </th>
                <SortHeader
                  field="date"
                  label="Date"
                  className="text-right"
                />
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {filteredDocs.map((doc) => {
                  const statusConfig = STATUS_CONFIG[doc.status]
                  const StatusIcon = statusConfig.icon
                  const isActive = selectedDocId === doc.id

                  return (
                    <motion.tr
                      key={doc.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() =>
                        setSelectedDocId(isActive ? null : doc.id)
                      }
                      className={`border-b border-gray-50 cursor-pointer transition-colors ${
                        isActive
                          ? "bg-indigo-50/50"
                          : "hover:bg-gray-50/50"
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                          <span className="text-xs font-medium text-gray-900 truncate max-w-[280px]">
                            {doc.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[11px] text-gray-500">
                          {doc.mimeType
                            .split("/")
                            .pop()
                            ?.toUpperCase() ?? "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-xs text-gray-600 tabular-nums">
                          {formatBytes(doc.size)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-xs text-gray-600 tabular-nums">
                          {doc.pageCount || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-xs text-gray-600 tabular-nums">
                          {formatNumber(doc.chunkCount)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-xs text-gray-600 tabular-nums">
                          {formatNumber(doc.tokenCount)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${statusConfig.color} ${statusConfig.bg}`}
                        >
                          <StatusIcon
                            className={`w-3 h-3 ${
                              [
                                "processing",
                                "parsing",
                                "chunking",
                                "embedding",
                                "indexing",
                              ].includes(doc.status)
                                ? "animate-spin"
                                : ""
                            }`}
                          />
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-[11px] text-gray-400">
                          {relativeTime(doc.createdAt)}
                        </span>
                      </td>
                    </motion.tr>
                  )
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      )}

      {/* Document Detail Panel */}
      <AnimatePresence>
        {selectedDocId && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-gray-100"
          >
            <DocumentDetailPanel
              document={documents.find((d) => d.id === selectedDocId)!}
              onClose={() => setSelectedDocId(null)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <UploadModal
        open={uploadOpen}
        knowledgeBaseId={knowledgeBaseId}
        onClose={() => { setUploadOpen(false); fetchDocuments() }}
      />
    </div>
  )
}

function DocumentDetailPanel({
  document: doc,
  onClose,
}: {
  document: DocumentWithVersion
  onClose: () => void
}) {
  const statusConfig = STATUS_CONFIG[doc.status]
  const StatusIcon = statusConfig.icon

  return (
    <div className="px-6 py-4 bg-gray-50/50">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="text-sm font-semibold text-gray-900">{doc.name}</h4>
          <p className="text-xs text-gray-500 mt-0.5">{doc.path}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 h-7 text-xs"
        >
          Close
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div>
          <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">
            Status
          </p>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${statusConfig.color} ${statusConfig.bg}`}
          >
            <StatusIcon className="w-3 h-3" />
            {statusConfig.label}
          </span>
          {doc.error && (
            <p className="text-[11px] text-red-500 mt-1">{doc.error}</p>
          )}
        </div>
        <div>
          <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">
            Content
          </p>
          <div className="flex items-center gap-3 text-xs text-gray-700">
            <span className="flex items-center gap-1">
              <FileText className="w-3 h-3 text-gray-400" />
              {doc.pageCount || 0} pages
            </span>
            <span className="flex items-center gap-1">
              <Puzzle className="w-3 h-3 text-gray-400" />
              {formatNumber(doc.chunkCount)} chunks
            </span>
          </div>
        </div>
        <div>
          <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">
            Tokens
          </p>
          <p className="text-xs text-gray-700 font-medium tabular-nums">
            {formatNumber(doc.tokenCount)}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">
            Size
          </p>
          <p className="text-xs text-gray-700 font-medium">
            {formatBytes(doc.size)}
          </p>
        </div>
      </div>
    </div>
  )
}
