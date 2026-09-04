"use client"

import { useEffect, useState } from "react"
import { AlertCircle, CheckCircle2, RefreshCw, ThumbsDown, ThumbsUp } from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"
import { apiFetch } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { SelectField } from "@/components/ui/select-field"
import { RAG_STRATEGIES } from "@/lib/types"

type LabelCase = {
  id: string
  question: string
  answer: string
  mode: string
}

type LabelSession = {
  available: boolean
  reason?: string
  source_report?: string
  source_report_created_at?: string
  criterion?: string
  cases?: LabelCase[]
  labels?: Record<string, "pass" | "fail">
  conflict?: boolean
  conflict_report?: string | null
}

const STRATEGY_OPTIONS = RAG_STRATEGIES.map((s) => ({ value: s.value, label: s.label }))

export function LabelAnswers() {
  const [session, setSession] = useState<LabelSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [strategy, setStrategy] = useState("bm25")
  const [casesJson, setCasesJson] = useState("")
  const [currentIndex, setCurrentIndex] = useState(0)
  const [direction, setDirection] = useState<1 | -1>(1)

  function nextUnlabeledIndex(fromIndex: number, freshLabels: Record<string, "pass" | "fail">): number {
    const remaining = cases.length
    for (let step = 1; step <= remaining; step++) {
      const idx = (fromIndex + step) % remaining
      if (!freshLabels[cases[idx].id]) return idx
    }
    return fromIndex
  }

  async function loadSession() {
    setLoading(true)
    setError("")
    try {
      const response = await apiFetch("/benchmark/developer-docs/label-session")
      if (!response.ok) throw new Error(`Request failed: ${response.status}`)
      const body: { success: boolean; data?: LabelSession } = await response.json()
      setSession(body.data ?? { available: false })
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load labeling session")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSession()
  }, [])

  async function loadDefaultCases() {
    try {
      const response = await apiFetch("/benchmark/developer-docs/default-cases")
      if (!response.ok) throw new Error(`Load failed: ${response.status}`)
      const body: { success: boolean; data?: Record<string, unknown>[] } = await response.json()
      if (body.data) {
        setCasesJson(JSON.stringify(body.data, null, 2))
        setError("")
      }
    } catch {
      setError("Failed to load default cases")
    }
  }

  async function generateForLabeling() {
    let cases: Record<string, unknown>[]
    try {
      cases = casesJson ? JSON.parse(casesJson) : []
    } catch {
      setError("Cases JSON is invalid")
      return
    }
    if (!cases.length) {
      setError("Paste a cases JSON array before generating answers")
      return
    }
    setGenerating(true)
    setError("")
    try {
      const response = await apiFetch("/benchmark/developer-docs/generate-for-labeling", {
        method: "POST",
        body: JSON.stringify({ cases, strategy }),
      })
      if (!response.ok) throw new Error(`Generate failed: ${response.status}`)
      const body: { success: boolean; data?: LabelSession } = await response.json()
      setSession((prev) => {
        const labels = body.data?.labels ?? prev?.labels ?? {}
        const firstUnlabeled = (body.data?.cases ?? prev?.cases ?? []).findIndex((c) => !labels[c.id])
        setDirection(1)
        setCurrentIndex(Math.max(0, firstUnlabeled))
        if (!body.data) return prev
        return {
          ...body.data,
          cases: body.data.cases ?? prev?.cases,
          labels: body.data.labels ?? prev?.labels,
        }
      })
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : "Generating answers failed - is the backend running?")
    } finally {
      setGenerating(false)
    }
  }

  async function submitLabel(caseId: string, label: "pass" | "fail") {
    setSubmitting(true)
    setError("")
    try {
      const response = await apiFetch("/benchmark/developer-docs/label", {
        method: "POST",
        body: JSON.stringify({ case_id: caseId, label }),
      })
      if (!response.ok) {
        const body = await response.json().catch(() => ({}) as { detail?: string })
        throw new Error(body.detail || `Save failed: ${response.status}`)
      }
      setSession((prev) => {
        if (!prev) return prev
        const freshLabels = { ...(prev.labels ?? {}), [caseId]: label }
        setDirection(1)
        setCurrentIndex((i) => nextUnlabeledIndex(i, freshLabels))
        return { ...prev, labels: freshLabels }
      })
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to save label")
    } finally {
      setSubmitting(false)
    }
  }

  async function clearSession() {
    setError("")
    try {
      const response = await apiFetch("/benchmark/developer-docs/label-session", { method: "DELETE" })
      if (!response.ok) throw new Error(`Clear failed: ${response.status}`)
      setSession({ available: false })
      setCurrentIndex(0)
      setDirection(1)
    } catch (clearError) {
      setError(clearError instanceof Error ? clearError.message : "Failed to clear labeling session")
    }
  }

  if (loading) {
    return (
      <section className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-gray-500">Loading labeling session...</p>
      </section>
    )
  }

  const cases = session?.cases ?? []
  const labels = session?.labels ?? {}
  const labeledCount = Object.keys(labels).length
  const current = cases[Math.min(currentIndex, Math.max(0, cases.length - 1))]

  return (
    <section className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
        <h2 className="text-lg font-semibold text-gray-900">Blind Judge Validation - Hand Labels</h2>
      </div>
      <p className="mt-1 text-sm text-gray-500">
        Label real answers pass/fail on &ldquo;correct and helpful&rdquo; before the judge ever sees them.
        Labels can only be saved against a report where the judge was never called - there is nothing
        judge-derived here to see, blind by construction.
      </p>

      {error && (
        <p className="mt-4 flex items-center gap-2 text-sm text-rose-600">
          <AlertCircle className="h-4 w-4" />{error}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium uppercase tracking-wider text-gray-400">Strategy</label>
          <SelectField value={strategy} onChange={setStrategy} options={STRATEGY_OPTIONS} width="w-[190px]" />
        </div>
        <div className="flex w-full flex-col gap-1">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-medium uppercase tracking-wider text-gray-400">Test cases (paste JSON)</label>
            <button type="button" onClick={() => void loadDefaultCases()} className="text-[11px] text-blue-600 hover:underline">
              Load default cases
            </button>
          </div>
          <textarea
            value={casesJson}
            onChange={(e) => {
              setCasesJson(e.target.value)
              setError("")
            }}
            placeholder="Paste the cases JSON array here…"
            className="w-full rounded-lg border border-gray-200 p-2 font-mono text-xs"
            rows={4}
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void generateForLabeling()} disabled={generating}>
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${generating ? "animate-spin" : ""}`} />
            {generating ? "Generating (judge OFF)…" : session?.available ? "Regenerate Answers" : "Generate Answers for Labeling"}
          </Button>
          {session?.available && (
            <Button variant="outline" size="sm" onClick={() => void clearSession()}>
              Start Fresh
            </Button>
          )}
        </div>
      </div>

      {session?.conflict && (
        <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          labels_25.json already has labels saved against a different report ({session.conflict_report}).
          Click &ldquo;Start Fresh&rdquo; to clear old labels and relabel against this newer report.
        </p>
      )}

      {session?.available && !session.conflict && cases.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>Source: {session.source_report}</span>
            <span className="font-semibold text-gray-900">{labeledCount}/{cases.length} labeled</span>
          </div>

          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${cases.length ? (labeledCount / cases.length) * 100 : 0}%` }}
            />
          </div>

          {labeledCount >= cases.length && (
            <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
              All {cases.length} answers labeled. labels_25.json is saved, timestamped before any judge run on
              these answers. You can still browse below to change a label.
            </p>
          )}

          <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium uppercase tracking-wider text-gray-400">
                Case {currentIndex + 1} / {cases.length} · mode: {current?.mode}
              </span>
              {labels[current.id] && (
                <span className={`text-xs font-semibold ${labels[current.id] === "pass" ? "text-emerald-600" : "text-rose-600"}`}>
                  Currently labeled: {labels[current.id]}
                </span>
              )}
            </div>

            <AnimatePresence mode="wait" custom={direction} initial={false}>
              <motion.div
                key={current.id}
                initial={{ opacity: 0, x: direction * 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction * -40 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              >
                <p className="mt-3 text-sm font-medium text-gray-900">{current.question}</p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">{current.answer || "(empty)"}</p>
              </motion.div>
            </AnimatePresence>

            <div className="mt-5 flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => void submitLabel(current.id, "pass")}
                disabled={submitting}
                className={`gap-1.5 ${labels[current.id] === "pass" ? "bg-emerald-100 text-emerald-800" : "text-emerald-700"}`}
              >
                <ThumbsUp className="h-3.5 w-3.5" /> Pass
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void submitLabel(current.id, "fail")}
                disabled={submitting}
                className={`gap-1.5 ${labels[current.id] === "fail" ? "bg-rose-100 text-rose-800" : "text-rose-700"}`}
              >
                <ThumbsDown className="h-3.5 w-3.5" /> Fail
              </Button>
              <div className="ml-auto flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setDirection(-1)
                    setCurrentIndex((i) => (i === 0 ? cases.length - 1 : i - 1))
                  }}
                  disabled={currentIndex === 0}
                >
                  Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setDirection(1)
                    setCurrentIndex((i) => (i === cases.length - 1 ? 0 : i + 1))
                  }}
                  disabled={currentIndex === cases.length - 1}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
