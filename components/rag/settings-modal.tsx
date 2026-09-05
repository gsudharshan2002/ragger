"use client"

import { useState, useEffect } from "react"
import { apiFetch, previewUrl as previewUrlHelper } from "@/lib/api"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import { X, Settings, Loader2, Check, AlertCircle, AlertTriangle, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SelectField } from "@/components/ui/select-field"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import type { AppSettings, ApiResponse } from "@/lib/types"
import { cn } from "@/lib/utils"

interface SettingsModalProps {
  open: boolean
  onClose: () => void
  onDataCleared?: () => void
}

export function SettingsModal({ open, onClose, onDataCleared }: SettingsModalProps) {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<"ok" | "err" | null>(null)
  const [totalChunks, setTotalChunks] = useState(0)
  const [pendingProvider, setPendingProvider] = useState<"local" | "cohere" | null>(null)
  const [reindexing, setReindexing] = useState(false)
  const [reindexMsg, setReindexMsg] = useState<string | null>(null)
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [clearMsg, setClearMsg] = useState<"ok" | "err" | null>(null)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    apiFetch("/rag/config")
      .then((r) => r.json())
      .then((res: ApiResponse<{ settings: AppSettings; totalChunks: number }>) => {
        if (res.success && res.data) {
          setSettings(res.data.settings)
          setTotalChunks(res.data.totalChunks ?? 0)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [open])

  const confirmProviderSwitch = async () => {
    if (!pendingProvider || !settings) return
    const provider = pendingProvider
    setPendingProvider(null)
    setReindexing(true)
    setReindexMsg(null)
    try {
      const putRes = await apiFetch("/rag/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ embeddingProvider: provider }),
      })
      const putBody: ApiResponse<AppSettings> = await putRes.json()
      if (putBody.success && putBody.data) setSettings(putBody.data)

      const reindexRes = await apiFetch("/rag/reindex-embeddings", { method: "POST" })
      const reindexBody: ApiResponse<{ reindexed: number; provider: string }> = await reindexRes.json()
      if (reindexBody.success && reindexBody.data) {
        setReindexMsg(`Re-indexed ${reindexBody.data.reindexed} chunk${reindexBody.data.reindexed === 1 ? "" : "s"} with ${provider === "cohere" ? "Cohere" : "the local model"}.`)
      } else {
        setReindexMsg("Provider switched, but re-indexing failed. Try again from Settings.")
      }
    } catch {
      setReindexMsg("Provider switched, but re-indexing failed. Try again from Settings.")
    } finally {
      setReindexing(false)
      setTimeout(() => setReindexMsg(null), 5000)
    }
  }

  const clearAllData = async () => {
    if (clearing) return
    setClearing(true)
    setClearMsg(null)
    try {
      const res = await apiFetch("/rag/clear-data", { method: "POST" })
      const body: ApiResponse<{ documents: number; chunks: number; knowledgeBases: number; folders: number }> = await res.json()
      if (body.success) {
        setTotalChunks(0)
        setClearMsg("ok")
        setClearConfirmOpen(false)
        onDataCleared?.()
      } else {
        setClearMsg("err")
      }
    } catch {
      setClearMsg("err")
    } finally {
      setClearing(false)
      setTimeout(() => setClearMsg(null), 6000)
    }
  }

  const handleSave = async () => {
    if (!settings) return
    setSaving(true)
    setSaveMsg(null)
    try {
      const res = await apiFetch("/rag/config", {
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
    <>
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
            className="w-full max-w-lg bg-white rounded-2xl popup-bevel overflow-hidden"
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
                          { value: "openrouter", label: "OpenRouter" },
                        ]}
                      />
                    </Field>
                    {settings.llmProvider === "groq" && (
                      <Field label="Groq API Key">
                        <input
                          type="password"
                          value={settings.groqApiKey ?? ""}
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
                          value={settings.geminiApiKey ?? ""}
                          onChange={(e) => update({ geminiApiKey: e.target.value })}
                          placeholder="AIzaSy…"
                          className="input-field"
                        />
                      </Field>
                    )}
                    {settings.llmProvider === "openrouter" && (
                      <Field label="OpenRouter API Key">
                        <input
                          type="password"
                          value={settings.openrouterApiKey ?? ""}
                          onChange={(e) => update({ openrouterApiKey: e.target.value })}
                          placeholder="sk-or-…"
                          className="input-field"
                        />
                      </Field>
                    )}
                    <Field label="Model">
                      <input
                        value={
                          settings.llmProvider === "gemini"
                            ? settings.geminiModel
                            : settings.llmProvider === "openrouter"
                              ? settings.openrouterModel
                              : settings.groqModel
                        }
                        onChange={(e) =>
                          update(
                            settings.llmProvider === "gemini"
                              ? { geminiModel: e.target.value }
                              : settings.llmProvider === "openrouter"
                                ? { openrouterModel: e.target.value }
                                : { groqModel: e.target.value }
                          )
                        }
                        placeholder={
                          settings.llmProvider === "gemini"
                            ? "gemini-2.5-flash"
                            : settings.llmProvider === "openrouter"
                              ? "meta-llama/llama-3.3-70b-instruct"
                              : "openai/gpt-oss-20b"
                        }
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
                        value={settings.embeddingProvider === "cohere" ? "cohere" : "local"}
                        onChange={(v) => {
                          const next = v as "local" | "cohere"
                          if (next === settings.embeddingProvider) return
                          setPendingProvider(next)
                        }}
                        options={[
                          { value: "local", label: "Local (sentence-transformers)" },
                          { value: "cohere", label: "Cohere" },
                        ]}
                      />
                    </Field>
                    {reindexing && (
                      <p className="flex items-center gap-1.5 text-[11px] text-gray-500">
                        <Loader2 className="h-3 w-3 animate-spin" /> Re-indexing chunks…
                      </p>
                    )}
                    {reindexMsg && (
                      <p className="text-[11px] text-emerald-600">{reindexMsg}</p>
                    )}
                    {settings.embeddingProvider === "cohere" ? (
                      <Field label="Cohere Model">
                        <input
                          value={settings.cohereEmbedModel}
                          onChange={(e) => update({ cohereEmbedModel: e.target.value })}
                          placeholder="embed-english-v3.0"
                          className="input-field"
                        />
                      </Field>
                    ) : (
                      <Field label="Local Model">
                        <input
                          value={settings.embeddingModel}
                          readOnly
                          className="input-field bg-gray-50 text-gray-500"
                        />
                      </Field>
                    )}
                    <Field label="Similarity Metric">
                      <SelectField
                        value={settings.vectorSimilarity ?? "cosine"}
                        onChange={(v) => update({ vectorSimilarity: v as AppSettings["vectorSimilarity"] })}
                        options={[
                          { value: "cosine", label: "Cosine similarity" },
                          { value: "dot_product", label: "Dot product" },
                          { value: "l2", label: "Euclidean (L2) distance" },
                        ]}
                      />
                    </Field>
                  </Section>

                  <Section title="Reranker">
                    <Field label="Provider">
                      <SelectField
                        value={settings.rerankerProvider === "cohere" ? "cohere" : "local"}
                        onChange={(v) => update({ rerankerProvider: v as AppSettings["rerankerProvider"] })}
                        options={[
                          { value: "local", label: "Local (cross-encoder)" },
                          { value: "cohere", label: "Cohere" },
                        ]}
                      />
                    </Field>
                    {settings.rerankerProvider === "cohere" ? (
                      <Field label="Cohere Model">
                        <input
                          value={settings.cohereRerankModel}
                          onChange={(e) => update({ cohereRerankModel: e.target.value })}
                          placeholder="rerank-english-v3.0"
                          className="input-field"
                        />
                      </Field>
                    ) : (
                      <Field label="Local Model">
                        <input
                          value={settings.rerankerModel}
                          onChange={(e) => update({ rerankerModel: e.target.value })}
                          placeholder="cross-encoder/ms-marco-MiniLM-L-6-v2"
                          className="input-field"
                        />
                      </Field>
                    )}
                  </Section>

                  <Section title="Cost">
                    <Field label="Approximate Cost per Token (USD)">
                      <input
                        type="number"
                        step="0.0000001"
                        min="0"
                        value={settings.costPerToken}
                        onChange={(e) => update({ costPerToken: parseFloat(e.target.value) || 0 })}
                        placeholder="0.0000005"
                        className="input-field"
                      />
                    </Field>
                    <p className="text-[11px] text-gray-400">There's no per-model pricing table, so benchmark cost is estimated as total tokens &times; this rate. Adjust it to roughly match whichever model you're actually using.</p>
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

                  <Section title="Danger Zone">
                    <div className="rounded-xl border border-red-100 bg-red-50/50 p-4">
                      <p className="text-xs font-semibold text-red-700 mb-1">
                        Clear all documents &amp; indexes
                      </p>
                      <p className="text-[11px] text-red-600/80 leading-relaxed mb-3">
                        Deletes every uploaded document, its source PDF, all chunked and
                        indexed data, knowledge bases and folders.
                        {totalChunks > 0 && ` ${totalChunks} chunk${totalChunks === 1 ? "" : "s"} are currently indexed.`}{" "}
                        Your settings, API keys, datasets and traces are not touched.
                      </p>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setClearConfirmOpen(true)}
                        className="rounded-full gap-1.5 text-xs"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Clear all data
                      </Button>
                      {clearMsg === "ok" && (
                        <p className="mt-2 text-[11px] text-emerald-600 flex items-center gap-1">
                          <Check className="w-3 h-3" /> All documents and indexes cleared.
                        </p>
                      )}
                      {clearMsg === "err" && (
                        <p className="mt-2 text-[11px] text-red-600 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> Failed to clear data. Try again.
                        </p>
                      )}
                    </div>
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
    </AnimatePresence>

    <Dialog open={!!pendingProvider} onOpenChange={(o) => { if (!o) setPendingProvider(null) }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-amber-50">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
          </div>
          <DialogTitle className="text-center">Switch embedding provider?</DialogTitle>
          <DialogDescription className="text-center">
            Switching to <span className="font-medium text-gray-700">{pendingProvider === "cohere" ? "Cohere" : "Local"}</span> will
            automatically re-index {totalChunks > 0 ? `all ${totalChunks} existing chunk${totalChunks === 1 ? "" : "s"}` : "your existing chunks"} with
            the new provider. Your documents stay as-is - no re-upload needed - but this may take a moment
            depending on how much content you have indexed.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-center">
          <Button variant="outline" onClick={() => setPendingProvider(null)}>Cancel</Button>
          <Button className="bg-gray-900 text-white hover:bg-gray-800" onClick={confirmProviderSwitch}>
            Switch &amp; Re-index
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog open={clearConfirmOpen} onOpenChange={(o) => { if (!o && !clearing) setClearConfirmOpen(false) }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-red-50">
            <Trash2 className="h-5 w-5 text-red-600" />
          </div>
          <DialogTitle className="text-center">Delete all documents &amp; indexes?</DialogTitle>
          <DialogDescription className="text-center">
            This permanently deletes every uploaded document, its source PDF file, all chunked
            and indexed data, knowledge bases and folders.
            {totalChunks > 0 && ` ${totalChunks} chunk${totalChunks === 1 ? "" : "s"} will be removed.`}{" "}
            This cannot be undone. Settings, API keys, datasets and traces stay intact.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-center">
          <Button variant="outline" onClick={() => setClearConfirmOpen(false)} disabled={clearing}>Cancel</Button>
          <Button className="bg-red-600 text-white hover:bg-red-700" onClick={clearAllData} disabled={clearing}>
            {clearing ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Trash2 className="w-3.5 h-3.5 mr-1" />}
            {clearing ? "Deleting…" : "Delete everything"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>,
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
