"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { motion } from "framer-motion"
import {
  X,
  Save,
  AlertTriangle,
  Hash,
  FileText,
  Loader2,
  Type,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import type { StoredChunk } from "@/lib/types"

interface ChunkEditorProps {
  chunk: StoredChunk
  onSave: (updatedContent: string) => void
  onCancel: () => void
}

function estimateTokenCount(text: string): number {
  if (!text) return 0
  return Math.ceil(text.split(/\s+/).filter(Boolean).length * 1.3)
}

export function ChunkEditor({ chunk, onSave, onCancel }: ChunkEditorProps) {
  const [content, setContent] = useState(chunk.content)
  const [saving, setSaving] = useState(false)
  const [tokenCount, setTokenCount] = useState(chunk.tokenCount)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const isModified = content !== chunk.content

  useEffect(() => {
    setTokenCount(estimateTokenCount(content))
  }, [content])

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  const handleSave = useCallback(async () => {
    if (!isModified || saving) return
    setSaving(true)
    try {
      onSave(content)
    } finally {
      setSaving(false)
    }
  }, [content, isModified, onSave, saving])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "s") {
      e.preventDefault()
      handleSave()
    }
    if (e.key === "Escape") {
      onCancel()
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onCancel}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 8 }}
        className="relative w-full max-w-2xl bg-white rounded-2xl overflow-hidden max-h-[85vh] flex flex-col popup-bevel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/[0.04] shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">
              Edit Chunk
            </h2>
            <p className="text-xs text-gray-400 mt-0.5 font-mono">
              {chunk.id}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onCancel}
            className="w-7 h-7 rounded-full text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="px-6 py-3 border-b border-black/[0.04] bg-gray-50/50 shrink-0">
          <div className="flex items-center gap-4 text-[11px] text-gray-500">
            <span className="flex items-center gap-1">
              <FileText className="w-3 h-3 text-gray-400" />
              {chunk.documentName}
            </span>
            <span className="flex items-center gap-1">
              Page {chunk.page}
            </span>
            {chunk.section && (
              <span className="flex items-center gap-1 truncate max-w-[200px]">
                {chunk.section}
              </span>
            )}
            <div className="flex-1" />
            <span className="flex items-center gap-1 tabular-nums">
              <Type className="w-3 h-3 text-gray-400" />
              {content.length} chars
            </span>
            <span className="flex items-center gap-1 tabular-nums">
              <Hash className="w-3 h-3 text-gray-400" />
              {tokenCount} tokens
              {isModified && tokenCount !== chunk.tokenCount && (
                <span className="text-amber-500">
                  (was {chunk.tokenCount})
                </span>
              )}
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            className="min-h-[300px] font-mono text-xs leading-relaxed resize-none"
            placeholder="Enter chunk content..."
          />
        </div>

        {isModified && (
          <div className="px-6 py-3 bg-amber-50 border-t border-amber-200 shrink-0">
            <div className="flex items-center gap-2 text-xs text-amber-700">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>
                Content has been modified. Saving will require re-indexing to
                update embeddings and search index.
              </span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between px-6 py-4 border-t border-black/[0.04] bg-gray-50/50 shrink-0">
          <div className="text-[11px] text-gray-400">
            <kbd className="rounded border border-gray-200 bg-white px-1 py-0.5 text-[10px] font-mono">
              Ctrl+S
            </kbd>{" "}
            to save ·{" "}
            <kbd className="rounded border border-gray-200 bg-white px-1 py-0.5 text-[10px] font-mono">
              Esc
            </kbd>{" "}
            to cancel
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onCancel}
              disabled={saving}
              className="rounded-full text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!isModified || saving}
              className="gap-1.5 rounded-full bg-gray-900 text-white hover:bg-gray-800 h-8 px-4 text-xs font-medium disabled:opacity-40"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-3 h-3" />
                  Save Chunk
                </>
              )}
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
