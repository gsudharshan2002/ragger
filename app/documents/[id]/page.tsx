"use client"

import { use, useState, useEffect } from "react"
import { apiFetch, apiUpload } from "@/lib/api"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Header } from "@/components/rag/header"
import { PdfViewer } from "@/components/knowledge-base/pdf-viewer"
import { DocumentDetail } from "@/components/knowledge-base/document-detail"
import type { DocumentMetadata, ApiResponse } from "@/lib/types"
import { ArrowLeft, FileText, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function DocumentViewerPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const searchParams = useSearchParams()
  const page = searchParams.get("page")
  const chunkId = searchParams.get("chunkId")

  const [doc, setDoc] = useState<DocumentMetadata | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showDetail, setShowDetail] = useState(false)
  const [fetchKey, setFetchKey] = useState(0)

  const isPdf = doc?.mimeType === "application/pdf"
  const isText =
    doc?.mimeType === "text/plain" || doc?.mimeType === "text/markdown"

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const res = await apiFetch(`/documents/${id}`)
        const body: ApiResponse<DocumentMetadata> = await res.json()

        if (cancelled) return

        if (!body.success || !body.data) {
          setError(body.error?.message ?? "Document not found")
          return
        }

        setDoc(body.data)
      } catch {
        if (!cancelled) setError("Failed to load document")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    setLoading(true)
    setError(null)
    load()

    return () => {
      cancelled = true
    }
  }, [id, fetchKey])

  useEffect(() => {
    if (chunkId) {
      setShowDetail(true)
    }
  }, [chunkId])

  const statusLabel: Record<string, { label: string; color: string }> = {
    ready: { label: "Ready", color: "text-emerald-600 bg-emerald-50" },
    processing: { label: "Processing", color: "text-blue-600 bg-blue-50" },
    parsing: { label: "Parsing", color: "text-blue-600 bg-blue-50" },
    chunking: { label: "Chunking", color: "text-blue-600 bg-blue-50" },
    embedding: { label: "Embedding", color: "text-blue-600 bg-blue-50" },
    indexing: { label: "Indexing", color: "text-blue-600 bg-blue-50" },
    uploaded: { label: "Uploaded", color: "text-gray-600 bg-gray-50" },
    failed: { label: "Failed", color: "text-red-600 bg-red-50" },
  }

  const status = doc ? statusLabel[doc.status] ?? statusLabel.uploaded : null

  return (
    <div className="flex flex-col h-screen bg-transparent">
      <div className="bg-animated-gradient">
        <div className="bg-orb bg-orb-1" />
        <div className="bg-orb bg-orb-2" />
        <div className="bg-orb bg-orb-3" />
        <div className="bg-orb bg-orb-4" />
      </div>

      <Header />

      <div className="flex items-center gap-3 px-6 py-3 bg-white/80 backdrop-blur-md border-b border-black/[0.04] shrink-0 relative z-10">
        <Link href="/knowledge-bases">
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>

        {loading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
            <span className="text-sm text-gray-400">Loading document...</span>
          </div>
        ) : error ? (
          <span className="text-sm text-red-500">{error}</span>
        ) : doc ? (
          <>
            <div className="flex items-center gap-2 min-w-0">
              <FileText className="w-4 h-4 text-gray-400 shrink-0" />
              <h2 className="text-sm font-semibold text-gray-900 truncate">
                {doc.name}
              </h2>
            </div>

            {status && (
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium shrink-0 ${status.color}`}
              >
                {status.label}
              </span>
            )}

            <span className="text-[11px] text-gray-400 shrink-0">
              {doc.mimeType.split("/").pop()?.toUpperCase()}
            </span>

            <div className="flex-1" />

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDetail(!showDetail)}
              className="rounded-full text-[11px] h-7 gap-1 border-gray-200"
            >
              {showDetail ? "Hide Details" : "Show Details"}
            </Button>
          </>
        ) : null}
      </div>

      <main className="flex-1 flex min-h-0 relative z-10 overflow-hidden">
        <div className={`flex-1 min-w-0 ${showDetail ? "lg:w-1/2" : "w-full"}`}>
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 text-gray-300 animate-spin" />
            </div>
          ) : error || !doc ? (
            <div className="flex flex-col items-center justify-center h-full">
              <FileText className="mb-3 h-12 w-12 text-gray-200" />
              <p className="text-sm text-gray-400">
                {error ?? "Document not found"}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFetchKey((k) => k + 1)}
                className="mt-3 rounded-full text-xs"
              >
                Try again
              </Button>
            </div>
          ) : isPdf ? (
            <div className="h-full p-4">
              <PdfViewer
                documentId={id}
                documentName={doc.name}
                initialPage={page ? parseInt(page, 10) : 1}
                highlightChunkId={chunkId ?? undefined}
              />
            </div>
          ) : isText ? (
            <TextPreview documentId={id} documentName={doc.name} />
          ) : (
            <div className="h-full p-4 flex flex-col items-center justify-center">
              <FileText className="mb-3 h-12 w-12 text-gray-200" />
              <p className="text-sm text-gray-500">
                Preview not available for this file type
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Use the detail panel to view document information and chunks
              </p>
            </div>
          )}
        </div>

        {showDetail && doc && (
          <div className="w-full lg:w-1/2 border-l border-gray-200 overflow-hidden">
            <DocumentDetail
              documentId={id}
              onClose={() => setShowDetail(false)}
              inline
              onNavigateToPage={(pageNum, cId) => {
                if (isPdf) {
                  window.location.href = `/documents/${id}?page=${pageNum}${
                    cId ? `&chunkId=${cId}` : ""
                  }`
                }
              }}
            />
          </div>
        )}
      </main>
    </div>
  )
}

function TextPreview({ documentId, documentName }: { documentId: string; documentName: string }) {
  const [content, setContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch(`/documents/${documentId}/preview`)
      .then((r) => r.text())
      .then((t) => setContent(t))
      .catch(() => setContent("Failed to load preview"))
      .finally(() => setLoading(false))
  }, [documentId])

  return (
    <div className="h-full p-4 flex flex-col">
      <div className="flex-1 rounded-xl border border-gray-200 bg-white shadow-sm overflow-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-5 h-5 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">
            {content}
          </pre>
        )}
      </div>
    </div>
  )
}
