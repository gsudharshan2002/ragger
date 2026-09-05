"use client"

import { useEffect, useState } from "react"
import { AlertCircle, Gavel, RefreshCw, Save, Trash2 } from "lucide-react"
import { apiFetch } from "@/lib/api"
import { Button } from "@/components/ui/button"

type Comparison = {
  case_id: string
  question: string
  answer: string
  mode: string
  human_label: "pass" | "fail"
  judge_verdict: "pass" | "fail" | null
  judge_reasoning: string
  agree: boolean
  has_keywords: boolean
}

type ValidationResult = {
  _filename?: string
  labels_source_report: string
  labeled_at: string
  validated_at: string
  criterion: string
  agreement_rate: number
  graded_count: number
  ungraded_count: number
  ungrounded_count: number
  total_labels: number
  comparisons: Comparison[]
}

export function JudgeValidation() {
  const [runs, setRuns] = useState<ValidationResult[]>([])
  const [running, setRunning] = useState(false)
  const [error, setError] = useState("")
  const [prediction, setPrediction] = useState("")
  const [predictionSaved, setPredictionSaved] = useState(false)
  const [savingPrediction, setSavingPrediction] = useState(false)

  useEffect(() => {
    apiFetch("/benchmark/developer-docs/prediction")
      .then((r) => {
        if (!r.ok) throw new Error(`Fetch failed: ${r.status}`)
        return r.json()
      })
      .then((body: { data?: { text: string; exists: boolean } }) => {
        if (body.data?.exists) {
          setPrediction(body.data.text)
          setPredictionSaved(true)
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    apiFetch("/benchmark/developer-docs/judge-runs")
      .then((r) => (r.ok ? r.json() : null))
      .then((body: { data?: ValidationResult[] } | null) => {
        if (body?.data?.length) setRuns(body.data)
      })
      .catch(() => {})
  }, [])

  async function clearRuns() {
    setRunning(true)
    setError("")
    try {
      const response = await apiFetch("/benchmark/developer-docs/judge-runs/all", { method: "DELETE" })
      if (!response.ok) throw new Error(`Clear failed: ${response.status}`)
      setRuns([])
    } catch (clearError) {
      setError(clearError instanceof Error ? clearError.message : "Failed to clear judge runs")
    } finally {
      setRunning(false)
    }
  }

  async function runValidation() {
    setRunning(true)
    setError("")
    try {
      const response = await apiFetch("/benchmark/developer-docs/validate-judge", { method: "POST" })
      if (!response.ok) {
        const body = await response.json().catch(() => ({}) as { detail?: string })
        throw new Error(body.detail || `Validation failed: ${response.status}`)
      }
      const body: { data: ValidationResult } = await response.json()
      setRuns((prev) => [body.data, ...prev.filter((r) => r.validated_at !== body.data.validated_at)])
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "Judge validation failed")
    } finally {
      setRunning(false)
    }
  }

  async function savePrediction() {
    setSavingPrediction(true)
    setError("")
    try {
      const response = await apiFetch("/benchmark/developer-docs/prediction", {
        method: "POST",
        body: JSON.stringify({ text: prediction }),
      })
      if (!response.ok) throw new Error(`Save failed: ${response.status}`)
      setPredictionSaved(true)
    } catch {
      setError("Failed to save prediction")
    } finally {
      setSavingPrediction(false)
    }
  }

  const latest = runs.find((r) => r.comparisons?.length) ?? runs[0]
  const disagreements = latest?.comparisons.filter((c) => !c.agree && c.has_keywords) ?? []

  function formatTimestamp(iso: string): string {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <section className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2">
        <Gavel className="h-5 w-5 text-emerald-600" />
        <h2 className="text-lg font-semibold text-gray-900">Human vs. AI Judge Agreement</h2>
      </div>
      <p className="mt-1 text-sm text-gray-500">
        Compares your hand labels (what you marked as pass/fail) against the AI judge&apos;s verdict for the same
        answers, and measures how often they agree. Run it once, then again after you improve the judge prompt, to
        see the before/after change. The history below persists across page loads.
      </p>

      {error && (
        <p className="mt-4 flex items-center gap-2 text-sm text-rose-600">
          <AlertCircle className="h-4 w-4" />{error}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => void runValidation()} disabled={running} className="gap-1.5">
          <RefreshCw className={`h-3.5 w-3.5 ${running ? "animate-spin" : ""}`} />
          {running ? "Comparing…" : "Run Agreement Check"}
        </Button>
        {runs.length > 0 && (
          <Button variant="outline" size="sm" onClick={() => void clearRuns()} disabled={running} className="gap-1.5">
            <Trash2 className="h-3.5 w-3.5" />
            Clear history
          </Button>
        )}
      </div>

      {runs.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-3">
          {runs.map((run, i) => (
            <div
              key={run._filename ?? i}
              className={`rounded-lg border p-3 text-sm ${i === 0 ? "border-emerald-200 bg-emerald-50/40" : "border-gray-100 bg-gray-50"}`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] font-medium uppercase tracking-wider text-gray-400">
                  {i === 0 ? "Most recent run" : `Earlier run ${i}`}
                </span>
                <span className="text-[11px] text-gray-400">{formatTimestamp(run.validated_at)}</span>
              </div>
              <div className={`mt-1 text-lg font-bold ${i === 0 ? "text-emerald-700" : "text-gray-900"}`}>
                {(run.agreement_rate * 100).toFixed(1)}% agreement
              </div>
              <div className="text-xs text-gray-500">
                {run.graded_count}/{run.total_labels} cases graded by the AI judge
              </div>
              {run.ungraded_count > 0 && (
                <div className="text-[11px] text-amber-600">{run.ungraded_count} could not be graded</div>
              )}
              {run.ungrounded_count > 0 && (
                <div className="text-[11px] text-amber-600">
                  {run.ungrounded_count} excluded (no expected keywords)
                </div>
              )}
              {run.graded_count > 0 && run.graded_count < 5 && (
                <div className="mt-1 text-[11px] text-amber-600">
                  Small sample — agreement may not be statistically meaningful
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {latest && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-gray-900">
            Cases where you and the AI judge disagreed ({disagreements.length})
          </h3>
          <div className="mt-2 space-y-3">
            {disagreements.map((c) => (
              <div key={c.case_id} className="rounded-lg border border-rose-100 bg-rose-50/50 p-3 text-sm">
                <div className="text-xs text-gray-500">{c.case_id} · mode: {c.mode}</div>
                <p className="mt-1 font-medium text-gray-900">{c.question}</p>
                <p className="mt-1 text-gray-700">{c.answer || "(empty)"}</p>
                <div className="mt-2 flex gap-4 text-xs">
                  <span>
                    Your label:{" "}
                    <strong className={c.human_label === "pass" ? "text-emerald-600" : "text-rose-600"}>
                      {c.human_label}
                    </strong>
                  </span>
                  <span>
                    AI judge:{" "}
                    <strong className={c.judge_verdict === "pass" ? "text-emerald-600" : "text-rose-600"}>
                      {c.judge_verdict ?? "no verdict"}
                    </strong>
                  </span>
                </div>
                {c.judge_reasoning && <p className="mt-1 text-xs italic text-gray-500">AI judge said: {c.judge_reasoning}</p>}
              </div>
            ))}
            {disagreements.length === 0 && (
              <p className="text-sm text-gray-500">No disagreements in the most recent run — you and the AI judge fully agreed.</p>
            )}
          </div>
        </div>
      )}

      <div className="mt-6 border-t border-gray-100 pt-4">
        <label className="text-[11px] font-medium uppercase tracking-wider text-gray-400">
          Your prediction — what will improving the judge prompt fix? (write this BEFORE you change it)
        </label>
        <textarea
          value={prediction}
          onChange={(e) => {
            setPrediction(e.target.value)
            setPredictionSaved(false)
          }}
          placeholder="One sentence: what do you expect changing the judge prompt to improve?"
          className="mt-1 w-full rounded-lg border border-gray-200 p-2 text-sm"
          rows={2}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => void savePrediction()}
          disabled={savingPrediction || !prediction.trim()}
          className="mt-2 gap-1.5"
        >
          <Save className="h-3.5 w-3.5" />
          {predictionSaved ? "Saved" : "Save prediction"}
        </Button>
      </div>
    </section>
  )
}
