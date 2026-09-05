"use client"

import { useState, useEffect } from "react"
import { apiFetch, previewUrl as previewUrlHelper } from "@/lib/api"
import { motion, AnimatePresence } from "framer-motion"
import { X, Settings, Loader2, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { KnowledgeBase, ApiResponse } from "@/lib/types"

interface KbSettingsModalProps {
  open: boolean
  onClose: () => void
  knowledgeBaseId: string
  onUpdate?: () => void
}

export function KbSettingsModal({ open, onClose, knowledgeBaseId, onUpdate }: KbSettingsModalProps) {
  const [kb, setKb] = useState<KnowledgeBase | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    apiFetch(`/knowledge-bases/${knowledgeBaseId}`)
      .then((r) => r.json())
      .then((res: ApiResponse<KnowledgeBase>) => {
        if (res.success && res.data) setKb(res.data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [open, knowledgeBaseId])

  const handleSave = async () => {
    if (!kb) return
    setSaving(true)
    try {
      const res = await apiFetch(`/knowledge-bases/${knowledgeBaseId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: kb.name,
          description: kb.description,
          tags: kb.tags,
          settings: kb.settings,
        }),
      })
      if (res.ok) {
        setSaved(true)
        onUpdate?.()
        setTimeout(() => { setSaved(false); onClose() }, 1000)
      }
    } catch { /* ignore */ }
    setSaving(false)
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-lg bg-white rounded-2xl overflow-hidden popup-bevel"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-gray-500" />
                <h2 className="text-sm font-semibold text-gray-900">Knowledge Base Settings</h2>
              </div>
              <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            <div className="px-6 py-4 max-h-[60vh] overflow-y-auto space-y-4">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                </div>
              ) : !kb ? (
                <div className="py-12 text-center text-sm text-gray-400">Failed to load</div>
              ) : (
                <>
                  <Field label="Name">
                    <input
                      value={kb.name}
                      onChange={(e) => setKb({ ...kb, name: e.target.value })}
                      className="input-field"
                    />
                  </Field>
                  <Field label="Description">
                    <textarea
                      value={kb.description}
                      onChange={(e) => setKb({ ...kb, description: e.target.value })}
                      rows={2}
                      className="input-field resize-none"
                    />
                  </Field>
                  <Field label="Tags (comma separated)">
                    <input
                      value={kb.tags.join(", ")}
                      onChange={(e) => setKb({ ...kb, tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })}
                      className="input-field"
                    />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Embedding Model">
                      <input
                        value={kb.settings.embeddingModel}
                        readOnly
                        className="input-field bg-gray-50 text-gray-500"
                      />
                    </Field>
                    <Field label="Chunk Size">
                      <input
                        type="number"
                        value={kb.settings.defaultChunkSize}
                        readOnly
                        className="input-field bg-gray-50 text-gray-500"
                      />
                    </Field>
                  </div>
                  <Field label="Chunk Overlap">
                    <input
                      type="number"
                      value={kb.settings.defaultChunkOverlap}
                      readOnly
                      className="input-field bg-gray-50 text-gray-500"
                    />
                  </Field>
                </>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
              {saved && <span className="text-xs text-emerald-600 flex items-center gap-1"><Check className="w-3 h-3" />Saved</span>}
              <Button variant="outline" size="sm" onClick={onClose} className="rounded-full text-xs">Cancel</Button>
              <Button size="sm" onClick={handleSave} disabled={saving || !kb} className="rounded-full bg-gray-900 text-white hover:bg-gray-800 text-xs">
                {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                Save
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  )
}
