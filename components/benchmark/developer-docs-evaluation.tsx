"use client"

import { useEffect, useState } from "react"
import { AlertCircle, CheckCircle2, RefreshCw, TrendingUp } from "lucide-react"
import { apiFetch } from "@/lib/api"
import { Button } from "@/components/ui/button"

type ProblemTypeScore = {
  cases: number
  combined_score: number
}

type EvaluationReport = {
  label: string
  strategy: string
  summary: {
    retrieval_score: number
    answer_score: number
    combined_score: number
    problem_type_scores: Record<string, ProblemTypeScore>
  }
}

type ReportsResponse = {
  baseline?: EvaluationReport
  improved?: EvaluationReport
}

function percent(value: number | undefined): string {
  return `${((value ?? 0) * 100).toFixed(2)}%`
}

function delta(after: number | undefined, before: number | undefined): string {
  const value = ((after ?? 0) - (before ?? 0)) * 100
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`
}

export function DeveloperDocsEvaluation() {
  const [reports, setReports] = useState<ReportsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  async function fetchReports(): Promise<ReportsResponse> {
    const response = await apiFetch("/benchmark/developer-docs/results")
    if (!response.ok) throw new Error(`Request failed: ${response.status}`)
    const body: { success: boolean; data?: ReportsResponse } = await response.json()
    return body.data ?? {}
  }

  async function loadReports() {
    setLoading(true)
    setError("")
    try {
      setReports(await fetchReports())
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load evaluation reports")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReports()
      .then(setReports)
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Unable to load evaluation reports"))
      .finally(() => setLoading(false))
  }, [])

  const baseline = reports?.baseline
  const improved = reports?.improved
  const problemTypes = Array.from(new Set([
    ...Object.keys(baseline?.summary.problem_type_scores ?? {}),
    ...Object.keys(improved?.summary.problem_type_scores ?? {}),
  ]))

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <h2 className="text-lg font-semibold text-gray-900">Developer Documentation Evaluation Reference</h2>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Saved Week 6 evaluator results. Run the selected dataset below to generate current benchmark results.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void loadReports()} disabled={loading}>
          <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {loading && <p className="mt-6 text-sm text-gray-500">Loading evaluation reports...</p>}
      {error && <p className="mt-6 flex items-center gap-2 text-sm text-rose-600"><AlertCircle className="h-4 w-4" />{error}</p>}
      {!loading && !error && !baseline && !improved && (
        <p className="mt-6 text-sm text-amber-700">No reports found. Run the evaluator from the backend first.</p>
      )}

      {!loading && !error && (baseline || improved) && (
        <>
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              ["Combined Score", baseline?.summary.combined_score, improved?.summary.combined_score],
              ["Retrieval Score", baseline?.summary.retrieval_score, improved?.summary.retrieval_score],
              ["Answer Score", baseline?.summary.answer_score, improved?.summary.answer_score],
            ].map(([label, before, after]) => (
              <div key={label as string} className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                <div className="text-[11px] font-medium uppercase tracking-wider text-gray-400">{label as string}</div>
                <div className="mt-2 flex items-end justify-between gap-2">
                  <div className="text-xl font-bold text-gray-900">{percent(after as number | undefined)}</div>
                  <div className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
                    <TrendingUp className="h-3.5 w-3.5" />{delta(after as number | undefined, before as number | undefined)}
                  </div>
                </div>
                <div className="mt-1 text-xs text-gray-500">Baseline: {percent(before as number | undefined)}</div>
              </div>
            ))}
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[540px] text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                  <th className="px-3 py-2 font-medium">Problem Type</th>
                  <th className="px-3 py-2 font-medium">Cases</th>
                  <th className="px-3 py-2 font-medium">Baseline</th>
                  <th className="px-3 py-2 font-medium">Improved</th>
                  <th className="px-3 py-2 font-medium">Delta</th>
                </tr>
              </thead>
              <tbody>
                {problemTypes.map((problemType) => {
                  const before = baseline?.summary.problem_type_scores[problemType]
                  const after = improved?.summary.problem_type_scores[problemType]
                  return (
                    <tr key={problemType} className="border-b border-gray-100 last:border-0">
                      <td className="px-3 py-3 font-medium text-gray-800">{problemType.replaceAll("_", " ")}</td>
                      <td className="px-3 py-3 text-gray-500">{after?.cases ?? before?.cases ?? 0}</td>
                      <td className="px-3 py-3 font-mono text-gray-600">{percent(before?.combined_score)}</td>
                      <td className="px-3 py-3 font-mono text-gray-600">{percent(after?.combined_score)}</td>
                      <td className="px-3 py-3 font-mono font-semibold text-emerald-600">{delta(after?.combined_score, before?.combined_score)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <p className="mt-4 text-xs text-gray-400">
            Reference reports: {baseline?.strategy ?? "not available"} to {improved?.strategy ?? "not available"}. Current dataset results appear in Benchmark Results below.
          </p>
        </>
      )}
    </section>
  )
}
