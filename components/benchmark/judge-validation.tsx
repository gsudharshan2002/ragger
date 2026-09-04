"use client"

import { useEffect, useState } from "react"
import { AlertCircle, Gavel, RefreshCw, Save } from "lucide-react"
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
      .then((r) => (r.ok ? r.json() : null))
      .then((body: { data?: { text: string; exists: boolean } } | null) => {
        if (body?.data?.exists) {
          setPrediction(body.data.text)
          setPredictionSaved(true)
        }
      })
      .catch(() => {})
  }, [])

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
      setRuns((prev) => [...prev, body.data])
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

  const latest = runs[runs.length - 1]
  const disagreements = latest?.comparisons.filter((c) => !c.agree && c.has_keywords) ?? []

  return (
    <section className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2">
        <Gavel className="h-5 w-5 text-emerald-600" />
        <h2 className="text-lg font-semibold text-gray-900">Judge Agreement</h2>
      </div>
      <p className="mt-1 text-sm text-gray-500">
        Runs the currently active judge prompt against the exact answers you already hand-labeled, and measures
        agreement. Run this once now (before), write your prediction, then again after the judge prompt is
        iterated (after) - the two runs below will show the before/after comparison.
      </p>

      {error && (
        <p className="mt-4 flex items-center gap-2 text-sm text-rose-600">
          <AlertCircle className="h-4 w-4" />{error}
        </p>
      )}

      <Button variant="outline" size="sm" onClick={() => void runValidation()} disabled={running} className="mt-4">
        <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${running ? "animate-spin" : ""}`} />
        {running ? "Running judge…" : `Run Judge Validation${runs.length > 0 ? " Again" : ""}`}
      </Button>

      {runs.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-3">
          {runs.map((run, i) => (
            <div key={i} className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm">
              <div className="text-[11px] font-medium uppercase tracking-wider text-gray-400">
                Run {i + 1}
                {i === 0 ? " (before)" : ""}
                {i === 1 ? " (after)" : ""}
              </div>
              <div className="mt-1 text-lg font-bold text-gray-900">{(run.agreement_rate * 100).toFixed(1)}%</div>
              <div className="text-xs text-gray-500">{run.graded_count}/{run.total_labels} graded</div>
              {run.ungrounded_count > 0 && (
                <div className="text-[11px] text-amber-600">
                  {run.ungrounded_count} excluded (no expected keywords to grade against)
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {latest && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-gray-900">Disagreements ({disagreements.length})</h3>
          <div className="mt-2 space-y-3">
            {disagreements.map((c) => (
              <div key={c.case_id} className="rounded-lg border border-rose-100 bg-rose-50/50 p-3 text-sm">
                <div className="text-xs text-gray-500">{c.case_id} · mode: {c.mode}</div>
                <p className="mt-1 font-medium text-gray-900">{c.question}</p>
                <p className="mt-1 text-gray-700">{c.answer || "(empty)"}</p>
                <div className="mt-2 flex gap-4 text-xs">
                  <span>
                    You: <strong className={c.human_label === "pass" ? "text-emerald-600" : "text-rose-600"}>{c.human_label}</strong>
                  </span>
                  <span>
                    Judge: <strong className={c.judge_verdict === "pass" ? "text-emerald-600" : "text-rose-600"}>{c.judge_verdict ?? "no verdict"}</strong>
                  </span>
                </div>
                {c.judge_reasoning && <p className="mt-1 text-xs italic text-gray-500">Judge said: {c.judge_reasoning}</p>}
              </div>
            ))}
            {disagreements.length === 0 && <p className="text-sm text-gray-500">No disagreements in this run.</p>}
          </div>
        </div>
      )}

      <div className="mt-6 border-t border-gray-100 pt-4">
        <label className="text-[11px] font-medium uppercase tracking-wider text-gray-400">
          Prediction (write this BEFORE iterating the judge prompt)
        </label>
        <textarea
          value={prediction}
          onChange={(e) => {
            setPrediction(e.target.value)
            setPredictionSaved(false)
          }}
          placeholder="One sentence: what do you think fixing the judge prompt will fix?"
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
          {predictionSaved ? "Saved" : "Save Prediction"}
        </Button>
      </div>
    </section>
  )
}
