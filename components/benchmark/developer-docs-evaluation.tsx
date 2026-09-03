"use client"

import { useEffect, useRef, useState } from "react"
import { AlertCircle, CheckCircle2, FileJson, Minus, RefreshCw, TrendingDown, TrendingUp } from "lucide-react"
import { apiFetch } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { SelectField } from "@/components/ui/select-field"
import { RAG_STRATEGIES } from "@/lib/types"

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

const STRATEGY_OPTIONS = RAG_STRATEGIES.map((s) => ({ value: s.value, label: s.label }))

function percent(value: number | undefined): string {
  if (value === undefined) return "—"
  return `${(value * 100).toFixed(2)}%`
}

function deltaPoints(after: number | undefined, before: number | undefined): number | undefined {
  if (after === undefined || before === undefined) return undefined
  return (after - before) * 100
}

// A higher score is always better for these metrics, so the sign of the
// delta alone tells us whether the "improved" strategy actually improved
// on the baseline, regressed, or made no meaningful difference.
const DELTA_EPSILON = 0.005

function DeltaBadge({ after, before }: { after: number | undefined; before: number | undefined }) {
  const value = deltaPoints(after, before)
  if (value === undefined) {
    return <span className="flex items-center gap-1 text-xs font-semibold text-gray-400">—</span>
  }
  if (value > DELTA_EPSILON) {
    return (
      <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
        <TrendingUp className="h-3.5 w-3.5" />+{value.toFixed(2)}%
      </span>
    )
  }
  if (value < -DELTA_EPSILON) {
    return (
      <span className="flex items-center gap-1 text-xs font-semibold text-rose-600">
        <TrendingDown className="h-3.5 w-3.5" />{value.toFixed(2)}%
      </span>
    )
  }
  return (
    <span className="flex items-center gap-1 text-xs font-semibold text-gray-500">
      <Minus className="h-3.5 w-3.5" />{value.toFixed(2)}%
    </span>
  )
}

const DEFAULT_CASES: Record<string, unknown>[] = []

export function DeveloperDocsEvaluation() {
  const [reports, setReports] = useState<ReportsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState("")
  const [baselineStrategy, setBaselineStrategy] = useState("vector")
  const [improvedStrategy, setImprovedStrategy] = useState("hybrid-rrf")
  const [casesJson, setCasesJson] = useState<string>("")
  const [casesFileName, setCasesFileName] = useState<string>("")
  const [fileReading, setFileReading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setCasesFileName(file.name)
    setFileReading(true)
    const reader = new FileReader()
    reader.onload = () => {
      const text = reader.result as string
      try {
        JSON.parse(text)
        setCasesJson(text)
        setError("")
      } catch {
        setError("Invalid JSON in uploaded file")
      } finally {
        setFileReading(false)
      }
    }
    reader.onerror = () => {
      setError("Failed to read the selected file")
      setFileReading(false)
    }
    reader.readAsText(file)
  }

  async function runEval() {
    let cases: Record<string, unknown>[]
    try {
      cases = casesJson ? JSON.parse(casesJson) : DEFAULT_CASES
    } catch {
      setError("Cases JSON is invalid — fix the file or paste valid JSON")
      return
    }
    if (!cases.length) {
      setError("Upload or paste a cases JSON file before running")
      return
    }
    setRunning(true)
    setError("")
    try {
      const response = await apiFetch("/benchmark/developer-docs/run", {
        method: "POST",
        body: JSON.stringify({
          cases,
          baselineStrategy,
          improvedStrategy,
          noJudge: false,
          casesFileName: casesFileName || undefined,
        }),
      })
      if (!response.ok) throw new Error(`Run failed: ${response.status}`)
      const body: { success: boolean; data?: ReportsResponse } = await response.json()
      setReports(body.data ?? {})
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "Eval run failed — is the backend running?")
    } finally {
      setRunning(false)
    }
  }

  useEffect(() => {
    loadReports()
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
            Upload a test-case JSON, pick two strategies to compare, then click Refresh to run.
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium uppercase tracking-wider text-gray-400">Baseline</label>
          <SelectField
            value={baselineStrategy}
            onChange={setBaselineStrategy}
            options={STRATEGY_OPTIONS}
            width="w-[190px]"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium uppercase tracking-wider text-gray-400">Improved</label>
          <SelectField
            value={improvedStrategy}
            onChange={setImprovedStrategy}
            options={STRATEGY_OPTIONS}
            width="w-[190px]"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium uppercase tracking-wider text-gray-400">Test cases</label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="gap-1.5"
          >
            <FileJson className="h-3.5 w-3.5" />
            {casesFileName || "Choose JSON…"}
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={() => void runEval()} disabled={loading || running || fileReading}>
          <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading || running ? "animate-spin" : ""}`} />
          {running ? "Running eval…" : fileReading ? "Reading file…" : "Refresh"}
        </Button>
      </div>

      {loading && <p className="mt-6 text-sm text-gray-500">Loading evaluation reports...</p>}
      {running && !loading && (
        <p className="mt-6 text-sm text-blue-600">
          Running {baselineStrategy} vs {improvedStrategy} — this may take a minute…
        </p>
      )}
      {error && <p className="mt-6 flex items-center gap-2 text-sm text-rose-600"><AlertCircle className="h-4 w-4" />{error}</p>}
      {!loading && !error && !baseline && !improved && (
        <p className="mt-6 text-sm text-amber-700">No reports found. Upload a cases file and click Refresh to run.</p>
      )}
      {!loading && !error && improved && !baseline && (
        <p className="mt-6 text-sm text-amber-700">
          Only one run found ({improved.strategy}). Pick a different baseline strategy and run again to compare.
        </p>
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
                  <DeltaBadge after={after as number | undefined} before={before as number | undefined} />
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
                      <td className="px-3 py-3 font-mono">
                        <DeltaBadge after={after?.combined_score} before={before?.combined_score} />
                      </td>
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
