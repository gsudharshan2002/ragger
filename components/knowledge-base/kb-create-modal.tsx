"use client"

import { useState } from "react"
import { apiFetch, previewUrl as previewUrlHelper } from "@/lib/api"
import { X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import type { KnowledgeBase, ApiResponse } from "@/lib/types"

interface KbCreateModalProps {
  open: boolean
  onClose: () => void
  onCreated: (kb: KnowledgeBase) => void
}

export function KbCreateModal({ open, onClose, onCreated }: KbCreateModalProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [tagsInput, setTagsInput] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  const handleSubmit = async () => {
    if (!name.trim()) return

    setSubmitting(true)
    setError(null)

    try {
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)

      const res = await apiFetch("/knowledge-bases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim(), tags }),
      })

      const body: ApiResponse<KnowledgeBase> = await res.json()

      if (!body.success || !body.data) {
        setError(body.error?.message ?? "Failed to create knowledge base")
        return
      }

      onCreated(body.data)
      setName("")
      setDescription("")
      setTagsInput("")
    } catch {
      setError("Failed to create knowledge base")
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    if (submitting) return
    setName("")
    setDescription("")
    setTagsInput("")
    setError(null)
    onClose()
  }

  return (
    <>
      <div
        onClick={handleClose}
        className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm"
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="w-full max-w-lg bg-white rounded-2xl overflow-hidden popup-bevel"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-black/[0.04]">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">
                Create Knowledge Base
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Set up a new document collection
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="w-7 h-7 rounded-full text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Product Documentation"
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-gray-400"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && name.trim()) handleSubmit()
                }}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Description
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this knowledge base contains..."
                rows={3}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Tags
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="Comma-separated tags..."
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-gray-400"
              />
            </div>

            {error && (
              <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-black/[0.04] bg-gray-50/50">
            <Button
              variant="outline"
              size="sm"
              onClick={handleClose}
              disabled={submitting}
              className="rounded-full"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!name.trim() || submitting}
              className="gap-1.5 rounded-full bg-gray-900 text-white hover:bg-gray-800 h-8 px-4 text-xs font-medium"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Knowledge Base"
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
