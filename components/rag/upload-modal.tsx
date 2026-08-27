"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { apiFetch, apiUpload, previewUrl as previewUrlHelper } from "@/lib/api"
import { motion, AnimatePresence } from "framer-motion"
import { X, Upload, FileText, Check, Loader2, AlertCircle, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRagContext } from "@/hooks/use-rag"
import type { UploadedDocument, DocumentProcessingStatus, ApiResponse, DocumentMetadata } from "@/lib/types"
import { generateId, formatNumber } from "@/lib/utils"

interface UploadModalProps {
  open: boolean
  onClose: () => void
  knowledgeBaseId?: string
}

interface UploadEntry {
  localId: string
  fileName: string
  fileType: string
  fileSize: number
  serverDocId?: string
  status: UploadedDocument["status"]
  chunks?: number
  tokens?: number
}

interface ExistingDocument {
  id: string
  name: string
  mimeType: string
  size: number
  chunkCount: number
  tokenCount: number
  knowledgeBaseId?: string | null
}

export function UploadModal({ open, onClose, knowledgeBaseId }: UploadModalProps) {
  const { session, addDocument, removeDocument } = useRagContext()
  const [dragOver, setDragOver] = useState(false)
  const [uploads, setUploads] = useState<UploadEntry[]>([])
  const [existingDocuments, setExistingDocuments] = useState<ExistingDocument[]>([])
  const [attachingId, setAttachingId] = useState<string | null>(null)
  const pollingIntervalsRef = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map())

  useEffect(() => {
    if (!open || !knowledgeBaseId) return
    apiFetch("/documents")
      .then((res) => res.json())
      .then((body: ApiResponse<ExistingDocument[]>) => {
        if (body.success && body.data) setExistingDocuments(body.data)
      })
      .catch(() => {})
  }, [open, knowledgeBaseId])

  useEffect(() => {
    return () => {
      pollingIntervalsRef.current.forEach((interval) => clearInterval(interval))
    }
  }, [])

  const attachExisting = useCallback(async (documentId: string) => {
    if (!knowledgeBaseId) return
    setAttachingId(documentId)
    try {
      const res = await apiFetch(
        `/knowledge-bases/${knowledgeBaseId}/documents/${documentId}/attach`,
        { method: "POST" }
      )
      if (res.ok) {
        setExistingDocuments((prev) => prev.filter((doc) => doc.id !== documentId))
        onClose()
      }
    } finally {
      setAttachingId(null)
    }
  }, [knowledgeBaseId, onClose])

  const updateUpload = useCallback((localId: string, update: Partial<UploadEntry>) => {
    setUploads((prev) =>
      prev.map((u) => (u.localId === localId ? { ...u, ...update } : u))
    )
  }, [])

  const mapApiStatus = (apiStatus: DocumentProcessingStatus): UploadedDocument["status"] => {
    switch (apiStatus) {
      case "uploaded":
      case "processing":
      case "parsing":
        return "processing"
      case "chunking":
        return "chunking"
      case "embedding":
      case "indexing":
        return "embedding"
      case "ready":
        return "ready"
      case "failed":
        return "error"
    }
  }

  const startPolling = useCallback(
    (localId: string, serverDocId: string) => {
      const interval = setInterval(async () => {
        try {
          const res = await apiFetch(`/documents/${serverDocId}`)
          const body: ApiResponse<DocumentMetadata> = await res.json()

          if (!body.success || !body.data) {
            updateUpload(localId, { status: "error" })
            clearInterval(interval)
            pollingIntervalsRef.current.delete(localId)
            return
          }

          const doc = body.data
          const mapped = mapApiStatus(doc.status)

          if (mapped === "ready") {
            addDocument({
              id: doc.id,
              name: doc.name,
              type: doc.mimeType,
              size: doc.size,
              status: "ready",
              chunks: doc.chunkCount,
              tokens: doc.tokenCount,
            })
            updateUpload(localId, {
              status: "ready",
              serverDocId: doc.id,
              chunks: doc.chunkCount,
              tokens: doc.tokenCount,
            })
            clearInterval(interval)
            pollingIntervalsRef.current.delete(localId)
          } else if (mapped === "error") {
            updateUpload(localId, { status: "error" })
            clearInterval(interval)
            pollingIntervalsRef.current.delete(localId)
          } else {
            updateUpload(localId, { status: mapped })
          }
        } catch {
          updateUpload(localId, { status: "error" })
          clearInterval(interval)
          pollingIntervalsRef.current.delete(localId)
        }
      }, 2000)

      pollingIntervalsRef.current.set(localId, interval)
    },
    [addDocument, updateUpload]
  )

  const processFiles = useCallback(
    (files: File[]) => {
      const allowedTypes = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain",
        "text/markdown",
        "text/csv",
      ]

      files.forEach((file) => {
        if (!allowedTypes.includes(file.type)) return

        const localId = generateId()
        const entry: UploadEntry = {
          localId,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          status: "uploading",
        }
        setUploads((prev) => [...prev, entry])

        const formData = new FormData()
        formData.append("file", file)

        apiUpload(
          knowledgeBaseId
            ? `/knowledge-bases/${knowledgeBaseId}/documents`
            : "/documents/upload",
          formData
        )
          .then(async (res) => {
            const body: ApiResponse<DocumentMetadata> = await res.json()
            if (!body.success || !body.data) {
              updateUpload(localId, { status: "error" })
              return
            }

            const doc = body.data
            const initialStatus = mapApiStatus(doc.status)

            updateUpload(localId, { serverDocId: doc.id, status: initialStatus })

            if (initialStatus === "ready") {
              addDocument({
                id: doc.id,
                name: doc.name,
                type: doc.mimeType,
                size: doc.size,
                status: "ready",
                chunks: doc.chunkCount,
                tokens: doc.tokenCount,
              })
            } else if (initialStatus === "error") {
              return
            } else {
              startPolling(localId, doc.id)
            }
          })
          .catch(() => {
            updateUpload(localId, { status: "error" })
          })
      })
    },
    [addDocument, updateUpload, startPolling, knowledgeBaseId]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragOver(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      processFiles(Array.from(e.dataTransfer.files))
    },
    [processFiles]
  )

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      processFiles(Array.from(e.target.files || []))
    },
    [processFiles]
  )

  const allDocs = [
    ...uploads.map((u) => ({
      id: u.localId,
      name: u.fileName,
      type: u.fileType,
      size: u.fileSize,
      status: u.status,
      chunks: u.chunks,
      tokens: u.tokens,
    })),
    ...session.documents.filter((d) => !uploads.some((u) => u.serverDocId === d.id)),
  ]

  const getStatusIcon = (status: UploadedDocument["status"]) => {
    switch (status) {
      case "uploading":
      case "processing":
      case "chunking":
      case "embedding":
        return <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
      case "ready":
        return <Check className="w-3.5 h-3.5 text-emerald-500" />
      case "error":
        return <AlertCircle className="w-3.5 h-3.5 text-red-500" />
    }
  }

  const getStatusLabel = (status: UploadedDocument["status"]) => {
    switch (status) {
      case "uploading":
        return "Uploading..."
      case "processing":
        return "Processing..."
      case "chunking":
        return "Chunking..."
      case "embedding":
        return "Embedding..."
      case "ready":
        return "Ready"
      case "error":
        return "Error"
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-[0_20px_60px_-12px_rgba(0,0,0,0.15)] overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-black/[0.04]">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">Upload Documents</h2>
                  <p className="text-xs text-gray-400 mt-0.5">PDF, DOCX, TXT, Markdown, CSV</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="w-7 h-7 rounded-full text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="p-6">
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                    dragOver
                      ? "border-indigo-300 bg-indigo-50/50"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50/50"
                  }`}
                >
                  <Upload className={`w-8 h-8 mx-auto mb-3 ${dragOver ? "text-indigo-400" : "text-gray-300"}`} />
                  <p className="text-sm font-medium text-gray-600 mb-1">
                    {dragOver ? "Drop documents here" : "Drop documents here"}
                  </p>
                  <p className="text-xs text-gray-400 mb-3">or</p>
                  <label>
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.docx,.txt,.md,.csv"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-gray-900 text-white text-xs font-medium cursor-pointer hover:bg-gray-800 transition-colors">
                      <Upload className="w-3 h-3" />
                      Choose files
                    </span>
                  </label>
                </div>

                {knowledgeBaseId && existingDocuments.filter((doc) => !doc.knowledgeBaseId).length > 0 && (
                  <div className="mt-5">
                    <div className="mb-2 text-xs font-semibold text-gray-600">Add existing documents</div>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {existingDocuments
                        .filter((doc) => !doc.knowledgeBaseId)
                        .map((doc) => (
                          <div key={doc.id} className="flex items-center gap-3 rounded-lg border border-gray-100 px-3 py-2.5">
                            <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-xs font-medium text-gray-700">{doc.name}</div>
                              <div className="text-[10px] text-gray-400">{doc.chunkCount} chunks · {formatNumber(doc.tokenCount)} tokens</div>
                            </div>
                            <Button
                              variant="outline"
                              size="xs"
                              onClick={() => attachExisting(doc.id)}
                              disabled={attachingId === doc.id}
                              className="shrink-0 rounded-full text-[10px]"
                            >
                              {attachingId === doc.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Add"}
                            </Button>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {allDocs.length > 0 && (
                  <div className="mt-4 space-y-1.5">
                    {allDocs.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-50/80 group"
                      >
                        <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-gray-700 truncate">{doc.name}</div>
                          <div className="flex items-center gap-2 mt-0.5">
                            {getStatusIcon(doc.status)}
                            <span className="text-[10px] text-gray-400">{getStatusLabel(doc.status)}</span>
                            {doc.chunks && (
                              <span className="text-[10px] text-gray-400">
                                {doc.chunks} chunks · {formatNumber(doc.tokens || 0)} tokens
                              </span>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeDocument(doc.id)}
                          className="w-6 h-6 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
