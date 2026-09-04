"use client"

import { useEffect, useState } from "react"
import { AlertCircle, CheckCircle2, Minus, RefreshCw, TrendingDown, TrendingUp } from "lucide-react"
import { apiFetch } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { SelectField } from "@/components/ui/select-field"
import { RAG_STRATEGIES } from "@/lib/types"

type ProblemTypeScore = {
  cases: number
  combined_score: number
}

type ModeScore = {
  cases: number
  passed: number
  pass_rate: number
}

type CaseAssertions = {
  unknown_endpoints: string[]
  deprecated_without_migration_note: string[][]
}

type CaseResult = {
  id: string
  question: string
  mode: string
  regression: boolean
  assertions?: CaseAssertions
  faithfulness?: number | null
  context_precision?: number | null
  retrieval_score?: number
}

type EvaluationReport = {
  label: string
  strategy: string
  summary: {
    retrieval_score: number
    answer_score: number
    combined_score: number
    problem_type_scores: Record<string, ProblemTypeScore>
    mode_scores?: Record<string, ModeScore>
    faithfulness?: number | null
    context_precision?: number | null
  }
  results?: CaseResult[]
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
  const [useRagas, setUseRagas] = useState(false)
  const [noJudge, setNoJudge] = useState(false)
  const [runCaseCount, setRunCaseCount] = useState(0)

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

  async function runEval() {
    let cases: Record<string, unknown>[]
    try {
      cases = casesJson ? JSON.parse(casesJson) : DEFAULT_CASES
    } catch {
      setError("Cases JSON is invalid — fix and paste valid JSON")
      return
    }
    if (!cases.length) {
      setError("Paste a cases JSON array before running")
      return
    }
    setRunning(true)
    setError("")
    setRunCaseCount(cases.length)
    try {
      const response = await apiFetch("/benchmark/developer-docs/run", {
        method: "POST",
        body: JSON.stringify({
          cases,
          baselineStrategy,
          improvedStrategy,
          noJudge,
          useRagas,
        }),
      })
      if (!response.ok) {
        let msg = `Run failed: ${response.status}`
        try {
          const errBody = await response.json()
          if (response.status === 422 && errBody.detail) {
            const details = Array.isArray(errBody.detail) ? errBody.detail : [errBody.detail]
            msg = `Validation error: ${details.map((d: any) => d.msg || d.loc?.join(".") || String(d)).join("; ")}`
          } else if (errBody.detail) {
            msg = errBody.detail
          }
        } catch { /* use default msg */ }
        throw new Error(msg)
      }
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
  const modes = Array.from(new Set([
    ...Object.keys(baseline?.summary.mode_scores ?? {}),
    ...Object.keys(improved?.summary.mode_scores ?? {}),
  ]))

  // Assertion violations and regression cases are read off the "improved"
  // run's per-case results - that's the run whose numbers are being judged,
  // so its assertion/regression state is what matters right now.
  const improvedResults = improved?.results ?? []
  const assertionChecked = improvedResults.length
  const endpointViolations = improvedResults.flatMap((r) => r.assertions?.unknown_endpoints ?? [])
  const deprecationViolations = improvedResults.flatMap((r) => r.assertions?.deprecated_without_migration_note ?? [])
  const assertionViolationCount = endpointViolations.length + deprecationViolations.length
  const regressionCases = improvedResults.filter((r) => r.regression)

  // The bonus finding: an answer fully grounded in *some* context
  // (faithfulness >= 0.9) while that context was the wrong document
  // version for the question (mode === wrong_source). The average
  // faithfulness across all cases can look fine while hiding exactly this.
  const confidentlyWrongCases = improvedResults.filter(
    (r) => r.mode === "wrong_source" && (r.faithfulness ?? 0) >= 0.9
  )

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <h2 className="text-lg font-semibold text-gray-900">Developer Documentation Evaluation Reference</h2>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Paste a test-case JSON array, pick two strategies to compare, then click Refresh to run.
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
        <Button variant="outline" size="sm" onClick={() => void runEval()} disabled={loading || running}>
          <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading || running ? "animate-spin" : ""}`} />
          {running ? "Running eval…" : "Refresh"}
        </Button>
      </div>

      <label className="mt-3 flex items-center gap-2 text-xs text-gray-500">
        <input
          type="checkbox"
          checked={noJudge}
          onChange={(e) => setNoJudge(e.target.checked)}
          className="h-3.5 w-3.5"
        />
        Skip LLM judge (keyword-only scoring — faster, no API cost)
      </label>
      <label className="mt-2 flex items-center gap-2 text-xs text-gray-500">
        <input
          type="checkbox"
          checked={useRagas}
          onChange={(e) => setUseRagas(e.target.checked)}
          className="h-3.5 w-3.5"
        />
        Also compute RAGAS bonus metrics (faithfulness, context precision) — 2 extra LLM calls per case, slower
      </label>

      {loading && <p className="mt-6 text-sm text-gray-500">Loading evaluation reports...</p>}
      {running && !loading && (
        <p className="mt-6 text-sm text-blue-600">
          Running {baselineStrategy} vs {improvedStrategy} on {runCaseCount} cases — each case makes {noJudge ? "1" : "2"} LLM call{noJudge ? "" : "s"}{useRagas ? " + 2 RAGAS" : ""}. This may take a few minutes…
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

          {modes.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-gray-900">Pass Rate by Mode</h3>
              <p className="mt-1 text-xs text-gray-500">
                A single overall pass rate can hide a regression on one mode while another mode carries the
                number - this breaks it out per taxonomy mode instead.
              </p>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full min-w-[540px] text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                      <th className="px-3 py-2 font-medium">Mode</th>
                      <th className="px-3 py-2 font-medium">Cases</th>
                      <th className="px-3 py-2 font-medium">Baseline</th>
                      <th className="px-3 py-2 font-medium">Improved</th>
                      <th className="px-3 py-2 font-medium">Delta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modes.map((mode) => {
                      const before = baseline?.summary.mode_scores?.[mode]
                      const after = improved?.summary.mode_scores?.[mode]
                      return (
                        <tr key={mode} className="border-b border-gray-100 last:border-0">
                          <td className="px-3 py-3 font-medium text-gray-800">{mode.replaceAll("_", " ")}</td>
                          <td className="px-3 py-3 text-gray-500">{after?.cases ?? before?.cases ?? 0}</td>
                          <td className="px-3 py-3 font-mono text-gray-600">
                            {before ? `${before.passed}/${before.cases} (${percent(before.pass_rate)})` : "—"}
                          </td>
                          <td className="px-3 py-3 font-mono text-gray-600">
                            {after ? `${after.passed}/${after.cases} (${percent(after.pass_rate)})` : "—"}
                          </td>
                          <td className="px-3 py-3 font-mono">
                            <DeltaBadge after={after?.pass_rate} before={before?.pass_rate} />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {improvedResults.length > 0 && (
            <div className="mt-6 rounded-lg border border-gray-100 bg-gray-50 p-4">
              <h3 className="text-sm font-semibold text-gray-900">Deterministic Assertions</h3>
              <p className="mt-1 text-xs text-gray-500">
                Checked on every answer in the improved run - a parser and a spec/list lookup, not judged by the LLM.
              </p>
              <div className="mt-2 flex flex-wrap gap-4 text-sm">
                <span className="text-gray-600">{assertionChecked} answers checked</span>
                <span className={assertionViolationCount > 0 ? "font-semibold text-rose-600" : "font-semibold text-emerald-600"}>
                  {assertionViolationCount} violation{assertionViolationCount === 1 ? "" : "s"}
                </span>
                {endpointViolations.length > 0 && (
                  <span className="text-gray-600">{endpointViolations.length} unknown endpoint{endpointViolations.length === 1 ? "" : "s"}</span>
                )}
                {deprecationViolations.length > 0 && (
                  <span className="text-gray-600">{deprecationViolations.length} deprecated symbol{deprecationViolations.length === 1 ? "" : "s"} without a migration note</span>
                )}
              </div>
              {assertionViolationCount > 0 && (
                <ul className="mt-3 space-y-1 text-xs text-rose-700">
                  {endpointViolations.map((path, i) => (
                    <li key={`endpoint-${i}`}>Unknown endpoint mentioned: <span className="font-mono">{path}</span></li>
                  ))}
                  {deprecationViolations.map((symbols, i) => (
                    <li key={`deprecation-${i}`}>Deprecated symbol without migration note: <span className="font-mono">{symbols.join(", ")}</span></li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {regressionCases.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-gray-900">Regression Cases ({regressionCases.length})</h3>
              <p className="mt-1 text-xs text-gray-500">
                Cases replayed verbatim from a real, previously-observed failure - locked in so it can't silently
                come back.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {regressionCases.map((r) => (
                  <span
                    key={r.id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800"
                  >
                    {r.id}
                  </span>
                ))}
              </div>
            </div>
          )}

          {(improved?.summary.faithfulness != null || improved?.summary.context_precision != null) && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-gray-900">RAGAS Bonus Metrics</h3>
              <p className="mt-1 text-xs text-gray-500">
                Faithfulness: is the answer grounded in *some* retrieved context? Context precision: was the
                *right* context ranked highly? An answer can score high faithfulness while confidently grounded
                in the wrong document version — that's what context precision (and the retrieval score) exposes
                but the faithfulness average alone hides.
              </p>
              <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {[
                  ["Faithfulness", baseline?.summary.faithfulness, improved?.summary.faithfulness],
                  ["Context Precision", baseline?.summary.context_precision, improved?.summary.context_precision],
                ].map(([label, before, after]) => (
                  <div key={label as string} className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                    <div className="text-[11px] font-medium uppercase tracking-wider text-gray-400">{label as string}</div>
                    <div className="mt-2 flex items-end justify-between gap-2">
                      <div className="text-xl font-bold text-gray-900">{percent(after as number | undefined ?? undefined)}</div>
                      <DeltaBadge after={after as number | undefined ?? undefined} before={before as number | undefined ?? undefined} />
                    </div>
                    <div className="mt-1 text-xs text-gray-500">Baseline: {percent(before as number | undefined ?? undefined)}</div>
                  </div>
                ))}
              </div>

              {confidentlyWrongCases.length > 0 ? (
                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-semibold text-amber-900">
                    Confidently wrong: {confidentlyWrongCases.length} case{confidentlyWrongCases.length === 1 ? "" : "s"} found
                  </p>
                  <ul className="mt-2 space-y-2 text-xs text-amber-800">
                    {confidentlyWrongCases.map((r) => (
                      <li key={r.id}>
                        <span className="font-mono font-semibold">{r.id}</span>: faithfulness {percent(r.faithfulness ?? undefined)}
                        {" "}while retrieval_score is {percent(r.retrieval_score)} and context_precision is{" "}
                        {percent(r.context_precision ?? undefined)} — grounded in a real chunk, just the wrong version.
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs text-amber-700">
                    The average faithfulness above ({percent(improved?.summary.faithfulness ?? undefined)}) looks
                    healthy precisely because cases like this pull it up while being wrong.
                  </p>
                </div>
              ) : (
                <p className="mt-3 text-xs text-gray-400">
                  No confidently-wrong case found in this run (none of the wrong_source-mode cases scored ≥90% faithfulness).
                </p>
              )}
            </div>
          )}

          <p className="mt-4 text-xs text-gray-400">
            Reference reports: {baseline?.strategy ?? "not available"} to {improved?.strategy ?? "not available"}. Current dataset results appear in Benchmark Results below.
          </p>
        </>
      )}
    </section>
  )
}
