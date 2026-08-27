"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { apiFetch, previewUrl as previewUrlHelper } from "@/lib/api"
import { motion } from "framer-motion"
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Minimize2,
  Loader2,
  AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import type { DocumentMetadata, ApiResponse } from "@/lib/types"

interface PdfViewerProps {
  documentId: string
  documentName: string
  initialPage?: number
  highlightChunkId?: string
}

const ZOOM_LEVELS = [50, 65, 80, 100, 125, 150, 200]
const DEFAULT_ZOOM_INDEX = 3

export function PdfViewer({
  documentId,
  documentName,
  initialPage = 1,
  highlightChunkId: _highlightChunkId,
}: PdfViewerProps) {
  const [docMeta, setDocMeta] = useState<DocumentMetadata | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(initialPage)
  const [zoomIndex, setZoomIndex] = useState(DEFAULT_ZOOM_INDEX)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const zoom = ZOOM_LEVELS[zoomIndex]
  const totalPages = docMeta?.pageCount ?? 0
  const previewUrl = previewUrlHelper(documentId)

  const fetchDocument = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await apiFetch(`/documents/${documentId}`)
      const body: ApiResponse<DocumentMetadata> = await res.json()

      if (!body.success || !body.data) {
        setError(body.error?.message ?? "Document not found")
        return
      }

      setDocMeta(body.data)
    } catch {
      setError("Failed to load document")
    } finally {
      setLoading(false)
    }
  }, [documentId])

  useEffect(() => {
    fetchDocument()
  }, [fetchDocument])

  useEffect(() => {
    setCurrentPage(initialPage)
  }, [initialPage])

  const goToPage = (page: number) => {
    const clamped = Math.max(1, Math.min(page, totalPages))
    setCurrentPage(clamped)
  }

  const zoomIn = () => {
    setZoomIndex((i) => Math.min(i + 1, ZOOM_LEVELS.length - 1))
  }

  const zoomOut = () => {
    setZoomIndex((i) => Math.max(i - 1, 0))
  }

  const resetZoom = () => {
    setZoomIndex(DEFAULT_ZOOM_INDEX)
  }

  const toggleFullscreen = async () => {
    if (!containerRef.current) return
    if (!window.document.fullscreenElement) {
      try {
        await containerRef.current.requestFullscreen()
        setIsFullscreen(true)
      } catch {
        /* no-op */
      }
    } else {
      try {
        await window.document.exitFullscreen()
        setIsFullscreen(false)
      } catch {
        /* no-op */
      }
    }
  }

  useEffect(() => {
    const handler = () => {
      setIsFullscreen(!!window.document.fullscreenElement)
    }
    window.document.addEventListener("fullscreenchange", handler)
    return () => window.document.removeEventListener("fullscreenchange", handler)
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          <div className="h-7 w-20 rounded-lg bg-gray-200/40 animate-pulse" />
          <div className="h-7 w-48 rounded-lg bg-gray-200/40 animate-pulse" />
          <div className="h-7 w-16 rounded-lg bg-gray-200/40 animate-pulse" />
          <div className="h-7 w-20 rounded-lg bg-gray-200/40 animate-pulse" />
          <div className="h-7 w-20 rounded-lg bg-gray-200/40 animate-pulse" />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-gray-300 animate-spin" />
        </div>
      </div>
    )
  }

  if (error || !docMeta) {
    return (
      <div className="flex flex-col h-full bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
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
      </div>
    )
  }

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`flex flex-col bg-white overflow-hidden ${
        isFullscreen
          ? "fixed inset-0 z-50"
          : "rounded-xl border border-gray-200 shadow-sm h-full"
      }`}
    >
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-gray-100 bg-white shrink-0">
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage <= 1}
          className="text-gray-500 hover:text-gray-700 disabled:text-gray-300"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        <div className="flex items-center gap-1.5 text-xs text-gray-600">
          <input
            type="number"
            min={1}
            max={totalPages}
            value={currentPage}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10)
              if (!isNaN(val)) goToPage(val)
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                ;(e.target as HTMLInputElement).blur()
              }
            }}
            className="w-12 rounded-md border border-gray-200 bg-white px-1.5 py-0.5 text-center text-xs text-gray-900 outline-none focus:border-gray-400 tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <span className="text-gray-400">/</span>
          <span className="tabular-nums font-medium">{totalPages}</span>
        </div>

        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="text-gray-500 hover:text-gray-700 disabled:text-gray-300"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>

        <div className="w-px h-4 bg-gray-200 mx-1" />

        <Button
          variant="ghost"
          size="icon-xs"
          onClick={zoomOut}
          disabled={zoomIndex <= 0}
          className="text-gray-500 hover:text-gray-700 disabled:text-gray-300"
        >
          <ZoomOut className="w-4 h-4" />
        </Button>

        <button
          onClick={resetZoom}
          className="min-w-[48px] rounded-md px-1.5 py-0.5 text-xs text-gray-600 hover:bg-gray-100 transition-colors tabular-nums font-medium"
        >
          {zoom}%
        </button>

        <Button
          variant="ghost"
          size="icon-xs"
          onClick={zoomIn}
          disabled={zoomIndex >= ZOOM_LEVELS.length - 1}
          className="text-gray-500 hover:text-gray-700 disabled:text-gray-300"
        >
          <ZoomIn className="w-4 h-4" />
        </Button>

        <div className="w-px h-4 bg-gray-200 mx-1" />

        <Button
          variant="ghost"
          size="icon-xs"
          onClick={resetZoom}
          className="text-gray-500 hover:text-gray-700"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </Button>

        <div className="flex-1" />

        <span className="text-[11px] text-gray-400 truncate max-w-[200px]">
          {documentName}
        </span>

        <div className="w-px h-4 bg-gray-200 mx-1" />

        <Button
          variant="ghost"
          size="icon-xs"
          onClick={toggleFullscreen}
          className="text-gray-500 hover:text-gray-700"
        >
          {isFullscreen ? (
            <Minimize2 className="w-3.5 h-3.5" />
          ) : (
            <Maximize2 className="w-3.5 h-3.5" />
          )}
        </Button>
      </div>

      <div className="flex-1 overflow-auto bg-gray-100 flex items-start justify-center">
        <iframe
          ref={iframeRef}
          key={`${documentId}-page-${currentPage}`}
          src={`${previewUrl}#page=${currentPage}`}
          className="border-0 bg-white"
          style={{
            width: `${zoom}%`,
            height: `${zoom}%`,
            minHeight: "100%",
            minWidth: "100%",
          }}
          title={`PDF Viewer - ${documentName}`}
        />
      </div>
    </motion.div>
  )
}
