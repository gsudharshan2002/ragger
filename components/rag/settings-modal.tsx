"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import { X, Settings, Loader2, Check, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SelectField } from "@/components/ui/select-field"
import type { AppSettings, ApiResponse } from "@/lib/types"
import { cn } from "@/lib/utils"

interface SettingsModalProps {
  open: boolean
  onClose: () => void
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<"ok" | "err" | null>(null)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    fetch("/api/rag/config")
      .then((r) => r.json())
      .then((res: ApiResponse<{ settings: AppSettings }>) => {
        if (res.success && res.data) setSettings(res.data.settings)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [open])

  const handleSave = async () => {
    if (!settings) return
    setSaving(true)
    setSaveMsg(null)
    try {
      const res = await fetch("/api/rag/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      })
      const body: ApiResponse<AppSettings> = await res.json()
      if (body.success && body.data) {
        setSettings(body.data)
        setSaveMsg("ok")
      } else {
        setSaveMsg("err")
      }
    } catch {
      setSaveMsg("err")
    } finally {
      setSaving(false)
      setTimeout(() => setSaveMsg(null), 2000)
    }
  }

  const update = (partial: Partial<AppSettings>) => {
    setSettings((prev) => (prev ? { ...prev, ...partial } : prev))
  }

  if (typeof window === "undefined") return null

  return createPortal(
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
            className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-black/[0.06] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-gray-500" />
                <h2 className="text-sm font-semibold text-gray-900">Settings</h2>
              </div>
              <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            <div className="px-6 py-4 max-h-[60vh] overflow-y-auto space-y-5">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                </div>
              ) : !settings ? (
                <div className="flex items-center justify-center py-12 text-sm text-gray-400">
                  <AlertCircle className="w-4 h-4 mr-2" /> Failed to load settings
                </div>
              ) : (
                <>
                  <Section title="LLM">
                    <Field label="Provider">
                      <SelectField
                        value={settings.llmProvider}
                        onChange={(v) => update({ llmProvider: v as AppSettings["llmProvider"] })}
                        options={[
                          { value: "groq", label: "Groq" },
                          { value: "gemini", label: "Gemini" },
                        ]}
                      />
                    </Field>
                    {settings.llmProvider === "groq" && (
                      <Field label="Groq API Key">
                        <input
                          type="password"
                          value={settings.groqApiKey}
                          onChange={(e) => update({ groqApiKey: e.target.value })}
                          placeholder="gsk_…"
                          className="input-field"
                        />
                      </Field>
                    )}
                    {settings.llmProvider === "gemini" && (
                      <Field label="Gemini API Key">
                        <input
                          type="password"
                          value={settings.geminiApiKey}
                          onChange={(e) => update({ geminiApiKey: e.target.value })}
                          placeholder="AIzaSy…"
                          className="input-field"
                        />
                      </Field>
                    )}
                    <Field label="Model">
                      <input
                        value={settings.groqModel}
                        onChange={(e) => update({ groqModel: e.target.value })}
                        className="input-field"
                      />
                    </Field>
                    <Field label="System Prompt">
                      <textarea
                        value={settings.systemPrompt}
                        onChange={(e) => update({ systemPrompt: e.target.value })}
                        rows={3}
                        className="input-field resize-none"
                      />
                    </Field>
                  </Section>

                  <Section title="Embedding">
                    <Field label="Provider">
                      <SelectField
                        value={settings.embeddingProvider}
                        onChange={(v) => update({ embeddingProvider: v as AppSettings["embeddingProvider"] })}
                        options={[
                          { value: "none", label: "None" },
                          { value: "openai", label: "OpenAI" },
                          { value: "cohere", label: "Cohere" },
                        ]}
                      />
                    </Field>
                    {settings.embeddingProvider !== "none" && (
                      <Field label="API Key">
                        <input
                          type="password"
                          value={settings.embeddingApiKey}
                          onChange={(e) => update({ embeddingApiKey: e.target.value })}
                          placeholder="sk-…"
                          className="input-field"
                        />
                      </Field>
                    )}
                  </Section>

                  <Section title="Chunking">
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Chunk Size">
                        <input
                          type="number"
                          value={settings.chunkSize}
                          onChange={(e) => update({ chunkSize: parseInt(e.target.value) || 512 })}
                          className="input-field"
                        />
                      </Field>
                      <Field label="Overlap">
                        <input
                          type="number"
                          value={settings.chunkOverlap}
                          onChange={(e) => update({ chunkOverlap: parseInt(e.target.value) || 64 })}
                          className="input-field"
                        />
                      </Field>
                    </div>
                  </Section>

                  <Section title="Retrieval">
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Default Top K">
                        <input
                          type="number"
                          value={settings.defaultTopK}
                          onChange={(e) => update({ defaultTopK: parseInt(e.target.value) || 20 })}
                          className="input-field"
                        />
                      </Field>
                      <Field label="MMR Lambda">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="1"
                          value={settings.mmrLambda}
                          onChange={(e) => update({ mmrLambda: parseFloat(e.target.value) || 0.7 })}
                          className="input-field"
                        />
                      </Field>
                    </div>
                    <Field label="Default Strategy">
                      <SelectField
                        value={settings.defaultStrategy}
                        onChange={(v) => update({ defaultStrategy: v as AppSettings["defaultStrategy"] })}
                        options={[
                          { value: "vector", label: "Vector" },
                          { value: "bm25", label: "BM25" },
                          { value: "hybrid", label: "Hybrid" },
                          { value: "hybrid-rrf", label: "Hybrid + RRF" },
                          { value: "hybrid-rerank", label: "Hybrid + Rerank" },
                          { value: "hybrid-rerank-mmr", label: "Hybrid + Rerank + MMR" },
                        ]}
                      />
                    </Field>
                  </Section>
                </>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
              {saveMsg === "ok" && <span className="text-xs text-emerald-600 flex items-center gap-1"><Check className="w-3 h-3" />Saved</span>}
              {saveMsg === "err" && <span className="text-xs text-red-500">Failed to save</span>}
              <Button variant="outline" size="sm" onClick={onClose} className="rounded-full text-xs">Cancel</Button>
              <Button size="sm" onClick={handleSave} disabled={saving || !settings} className="rounded-full bg-gray-900 text-white hover:bg-gray-800 text-xs">
                {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                Save
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
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
