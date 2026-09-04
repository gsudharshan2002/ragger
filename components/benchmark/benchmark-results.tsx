"use client"

import { useState, useMemo } from "react"
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  FileText,
  Target,
  BarChart3,
  ExternalLink,
  Brain,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Separator } from "@/components/ui/separator"
import { SelectField } from "@/components/ui/select-field"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

import { apiFetch } from "@/lib/api"
import { cn, formatDuration, formatNumber } from "@/lib/utils"
import {
  BenchmarkRun,
  TestCaseResult,
  EvaluationMetrics,
  Difficulty,
  ApiResponse,
} from "@/lib/types"
import { useBenchmark } from "@/hooks/use-benchmark"
import { useRagContext, normalizeTrace } from "@/hooks/use-rag"

const DIFFICULTY_STYLES: Record<Difficulty, { label: string; badge: string }> = {
  easy: { label: "Easy", badge: "bg-emerald-100 text-emerald-700" },
  medium: { label: "Medium", badge: "bg-amber-100 text-amber-700" },
  hard: { label: "Hard", badge: "bg-orange-100 text-orange-700" },
  expert: { label: "Expert", badge: "bg-rose-100 text-rose-700" },
}

const STATUS_STYLES: Record<string, { badge: string; icon: React.ReactNode }> = {
  passed: {
    badge: "bg-emerald-100 text-emerald-700",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  partial: {
    badge: "bg-amber-100 text-amber-700",
    icon: <AlertTriangle className="h-3 w-3" />,
  },
  failed: {
    badge: "bg-rose-100 text-rose-700",
    icon: <XCircle className="h-3 w-3" />,
  },
  not_run: {
    badge: "bg-gray-100 text-gray-500",
    icon: <Clock className="h-3 w-3" />,
  },
}

const FAILURE_CATEGORY_META: Record<
  string,
  { label: string; icon: React.ReactNode }
> = {
  retrieval_failure: {
    label: "Retrieval Failure",
    icon: <Target className="h-4 w-4 text-rose-500" />,
  },
  missing_source: {
    label: "Missing Source",
    icon: <FileText className="h-4 w-4 text-orange-500" />,
  },
  wrong_source: {
    label: "Wrong Source",
    icon: <ArrowRight className="h-4 w-4 text-amber-500" />,
  },
  poor_ranking: {
    label: "Poor Ranking",
    icon: <BarChart3 className="h-4 w-4 text-violet-500" />,
  },
  poor_context: {
    label: "Poor Context",
    icon: <FileText className="h-4 w-4 text-blue-500" />,
  },
  poor_answer: {
    label: "Poor Answer",
    icon: <XCircle className="h-4 w-4 text-red-500" />,
  },
  citation_failure: {
    label: "Citation Failure",
    icon: <ExternalLink className="h-4 w-4 text-cyan-500" />,
  },
  latency_failure: {
    label: "Latency Failure",
    icon: <Clock className="h-4 w-4 text-slate-500" />,
  },
  token_limit_failure: {
    label: "Token Limit Failure",
    icon: <AlertTriangle className="h-4 w-4 text-pink-500" />,
  },
  llm_failure: {
    label: "LLM Failure",
    icon: <AlertTriangle className="h-4 w-4 text-red-600" />,
  },
  prompt_issue: {
    label: "System Prompt Needs Improvement",
    icon: <Brain className="h-4 w-4 text-purple-500" />,
  },
}

const SCORE_METRICS = [
  { key: "hitRate" as const, label: "Hit Rate" },
  { key: "recall" as const, label: "Recall" },
  { key: "precision" as const, label: "Precision" },
  { key: "mrr" as const, label: "MRR" },
  { key: "ndcg" as const, label: "NDCG" },
]

const GRID_METRICS = [
  { key: "hitRate" as const, label: "Hit Rate", color: "bg-emerald-500" },
  { key: "recall" as const, label: "Recall", color: "bg-blue-500" },
  { key: "precision" as const, label: "Precision", color: "bg-violet-500" },
  { key: "mrr" as const, label: "MRR", color: "bg-amber-500" },
  { key: "ndcg" as const, label: "NDCG", color: "bg-rose-500" },
]

function metricValue(metrics: EvaluationMetrics, key: string): number {
  return ((metrics as unknown as Record<string, number>)[key]) ?? 0
}

function overallScore(m: EvaluationMetrics): number {
  const vals = [
    m.hitRate,
    m.recall,
    m.precision,
    m.mrr,
    m.ndcg,
  ]
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100)
}

export function BenchmarkResults() {
  const { runs, activeRun, comparisonRuns } = useBenchmark()
  const { setSelectedTrace, setTracePanelOpen } = useRagContext()
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("results")
  const [expandedFailureCategory, setExpandedFailureCategory] = useState<string | null>(null)
  const [compareA, setCompareA] = useState<string>("")
  const [compareB, setCompareB] = useState<string>("")

  const completedRuns = useMemo(
    () => runs.filter((r) => r.status === "completed"),
    [runs]
  )

  const previousRun = useMemo(() => {
    if (!activeRun) return null
    // The chronologically previous run, not just "the first other completed
    // run in array order" - completedRuns' order can't be relied on to put
    // the run right before activeRun next to it, e.g. when activeRun is an
    // older run opened via viewRun rather than whatever just finished.
    const activeTime = new Date(activeRun.completedAt || activeRun.startedAt).getTime()
    if (Number.isNaN(activeTime)) return null
    let previous: BenchmarkRun | null = null
    let previousTime = -Infinity
    for (const r of completedRuns) {
      if (r.id === activeRun.id) continue
      const t = new Date(r.completedAt || r.startedAt).getTime()
      if (Number.isNaN(t) || t >= activeTime) continue
      if (t > previousTime) {
        previous = r
        previousTime = t
      }
    }
    return previous
  }, [activeRun, completedRuns])

  const sortedResults = useMemo(() => {
    if (!activeRun) return []
    return [...activeRun.results].sort((a, b) => {
      const order: Record<string, number> = { failed: 0, partial: 1, not_run: 2, passed: 3 }
      return (order[a.status] ?? 4) - (order[b.status] ?? 4)
    })
  }, [activeRun])

  const failedResults = useMemo(() => {
    if (!activeRun) return []
    return activeRun.results.filter((r) => r.status === "failed")
  }, [activeRun])

  const difficultyRows: { level: Difficulty; label: string; badge: string; count: number; metrics: Partial<EvaluationMetrics> }[] = useMemo(() => {
    const levels: Difficulty[] = ["easy", "medium", "hard", "expert"]
    return levels.map((level) => {
      const bm = activeRun?.difficultyBreakdown[level]
      return {
        level,
        label: DIFFICULTY_STYLES[level].label,
        badge: DIFFICULTY_STYLES[level].badge,
        // Must match exactly what the backend excluded from
        // difficultyBreakdown's average (_execute_case in benchmark.py):
        // "not_run" cases, AND cases where the pipeline itself raised an
        // exception (status is "failed" for those too, but they carry no
        // real metrics - only the presence of `error` distinguishes them
        // from a genuine, evaluated failure). Otherwise this count can
        // disagree with how many cases the shown metrics were averaged over.
        count: activeRun?.results.filter((r) => r.difficulty === level && r.status !== "not_run" && !r.error).length ?? 0,
        metrics: bm ?? {},
      }
    })
  }, [activeRun])

  const failureCategoryData = useMemo(() => {
    if (!activeRun) return []
    const total = failedResults.length
    return Object.entries(activeRun.failureCategories)
      .filter(([, count]) => count > 0)
      .map(([category, count]) => ({
        category,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0,
        meta: FAILURE_CATEGORY_META[category] ?? { label: category, icon: <XCircle className="h-4 w-4 text-gray-500" /> },
        cases: failedResults.filter((r) => r.failureCategories.includes(category as any)),
      }))
      .sort((a, b) => b.count - a.count)
  }, [failedResults, activeRun])

  const comparisonData = useMemo(() => {
    if (!compareA || !compareB) return null
    const rA = completedRuns.find((r) => r.id === compareA)
    const rB = completedRuns.find((r) => r.id === compareB)
    if (!rA || !rB) return null

    return GRID_METRICS.map((gm) => {
      const valA = metricValue(rA.aggregateMetrics, gm.key)
      const valB = metricValue(rB.aggregateMetrics, gm.key)
      const delta = valB - valA
      const pct = valA !== 0 ? (delta / Math.abs(valA)) * 100 : 0
      return { label: gm.label, valA, valB, delta, pct, improved: delta > 0 }
    })
  }, [compareA, compareB, completedRuns])

  const handleViewTrace = async (result: TestCaseResult) => {
    if (!result.traceId) return
    try {
      const res = await apiFetch(`/traces/${result.traceId}`)
      const body: ApiResponse<Record<string, any>> = await res.json()
      if (body.success && body.data) {
        setSelectedTrace(normalizeTrace(body.data))
        setTracePanelOpen(true)
      }
    } catch (err) {
      console.error("Failed to load trace:", err)
    }
  }

  if (!activeRun || activeRun.status !== "completed" || completedRuns.length === 0) {
    return null
  }

  const run = activeRun
  const metrics = run.aggregateMetrics
  const score = overallScore(metrics)
  const totalDurationMs = run.results.reduce((acc, r) => acc + r.durationMs, 0)

  return (
    <div className="space-y-6">
      {/* Summary Bar */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6"
      >
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="text-[11px] font-medium uppercase tracking-wider text-gray-400">
            Total Tests
          </div>
          <div className="mt-1 text-2xl font-bold text-gray-900">{run.totalTests}</div>
        </div>

        <div className="rounded-xl border border-emerald-100 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-emerald-500">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Passed
          </div>
          <div className="mt-1 text-2xl font-bold text-emerald-700">{run.passedTests}</div>
        </div>

        <div className="rounded-xl border border-amber-100 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-amber-500">
            <AlertTriangle className="h-3.5 w-3.5" />
            Partial
          </div>
          <div className="mt-1 text-2xl font-bold text-amber-700">{run.partialTests}</div>
        </div>

        <div className="rounded-xl border border-rose-100 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-rose-500">
            <XCircle className="h-3.5 w-3.5" />
            Failed
          </div>
          <div className="mt-1 text-2xl font-bold text-rose-700">{run.failedTests}</div>
        </div>

        <div className="rounded-xl border border-indigo-100 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-indigo-500">
            <Target className="h-3.5 w-3.5" />
            Overall Score
          </div>
          <div className="mt-1 text-2xl font-bold text-indigo-700">{score}<span className="text-sm font-medium text-gray-400">/100</span></div>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-gray-400">
            <Clock className="h-3.5 w-3.5" />
            Duration
          </div>
          <div className="mt-1 text-2xl font-bold text-gray-900">{formatDuration(totalDurationMs)}</div>
        </div>
      </motion.div>

      {/* Metrics Grid */}
      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-gray-900">Evaluation Metrics</h3>
        <div className="grid grid-cols-3 gap-3 lg:grid-cols-5">
          {GRID_METRICS.map((gm) => {
            const value = metricValue(metrics, gm.key)
            const prevValue = previousRun
              ? metricValue(previousRun.aggregateMetrics, gm.key)
              : null
            const delta = prevValue !== null ? value - prevValue : null

            return (
              <motion.div
                key={gm.key}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-lg border border-gray-100 bg-gray-50 p-3"
              >
                <div className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
                  {gm.label}
                </div>
                <div className="mt-1 text-xs font-semibold text-gray-900">
                  {(value * 100).toFixed(4)}%
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-200">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${value * 100}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className={cn("h-full rounded-full", gm.color)}
                  />
                </div>
                {delta !== null && delta !== 0 && (
                  <div className="mt-2 flex items-center gap-1">
                    {delta > 0 ? (
                      <TrendingUp className="h-3 w-3 text-emerald-500" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-rose-500" />
                    )}
                    <span
                      className={cn(
                        "text-[10px] font-semibold",
                        delta > 0 ? "text-emerald-600" : "text-rose-600"
                      )}
                    >
                      {delta > 0 ? "+" : ""}
                      {(delta * 100).toFixed(4)}%
                    </span>
                  </div>
                )}
                {delta === null && (
                  <div className="mt-2 text-[10px] text-gray-300">No previous run</div>
                )}
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4 rounded-xl border border-gray-100 bg-white p-1 shadow-sm">
          <TabsTrigger value="results" className="rounded-lg px-3 py-1.5 text-xs font-medium">
            <BarChart3 className="mr-1.5 h-3.5 w-3.5" />
            Test Results
          </TabsTrigger>
          <TabsTrigger value="difficulty" className="rounded-lg px-3 py-1.5 text-xs font-medium">
            <Target className="mr-1.5 h-3.5 w-3.5" />
            Difficulty Breakdown
          </TabsTrigger>
          <TabsTrigger value="failures" className="rounded-lg px-3 py-1.5 text-xs font-medium">
            <AlertTriangle className="mr-1.5 h-3.5 w-3.5" />
            Failure Analysis
          </TabsTrigger>
          <TabsTrigger value="comparison" className="rounded-lg px-3 py-1.5 text-xs font-medium">
            <TrendingUp className="mr-1.5 h-3.5 w-3.5" />
            Comparison
          </TabsTrigger>
        </TabsList>

        {/* Test Results Tab */}
        <TabsContent value="results">
          <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-5 py-3">
              <h3 className="text-sm font-semibold text-gray-900">
                Test Case Results
              </h3>
            </div>
            <div className="max-h-[600px] overflow-y-auto overflow-x-auto">
              <table className="w-full text-left">
                <thead className="sticky top-0 z-10 bg-gray-50">
                  <tr className="border-b border-gray-100">
                    <th className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-gray-400">#</th>
                    <th className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-gray-400">Query</th>
                    <th className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-gray-400">Difficulty</th>
                    <th className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-gray-400">Hit Rate</th>
                    <th className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-gray-400">Recall</th>
                    <th className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-gray-400">Precision</th>
                    <th className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-gray-400">MRR</th>
                    <th className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-gray-400">NDCG</th>
                    <th className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-gray-400">Status</th>
                    <th className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-gray-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedResults.map((result, idx) => {
                    const isExpanded = expandedRow === result.caseId
                    const statusStyle = STATUS_STYLES[result.status] ?? STATUS_STYLES.not_run
                    const datasetVersion = run.config.datasetId
                    const difficultyStyle = DIFFICULTY_STYLES[result.difficulty] ?? DIFFICULTY_STYLES.medium

                    return (
                      <AnimatePresence key={result.caseId}>
                        <motion.tr
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: idx * 0.02 }}
                          className={cn(
                            "border-b border-gray-50 cursor-pointer transition-colors",
                            isExpanded ? "bg-indigo-50/50" : "hover:bg-gray-50"
                          )}
                          onClick={() => setExpandedRow(isExpanded ? null : result.caseId)}
                        >
                          <td className="px-4 py-2.5 text-xs text-gray-400">{idx + 1}</td>
                          <td className="max-w-[280px] px-4 py-2.5">
                            <span className="truncate text-xs text-gray-700 block">
                              {result.query || "—"}
                            </span>
                          </td>
                          <td className="px-4 py-2.5">
                            <Badge className={cn("text-[10px] rounded-full px-2 py-0.5 font-medium", difficultyStyle.badge)}>
                              {difficultyStyle.label}
                            </Badge>
                          </td>
                          <td className="px-4 py-2.5 text-xs font-semibold text-gray-700">
                            {(result.metrics.hitRate * 100).toFixed(4)}%
                          </td>
                          <td className="px-4 py-2.5 text-xs font-semibold text-gray-700">
                            {(result.metrics.recall * 100).toFixed(4)}%
                          </td>
                          <td className="px-4 py-2.5 text-xs font-semibold text-gray-700">
                            {(result.metrics.precision * 100).toFixed(4)}%
                          </td>
                          <td className="px-4 py-2.5 text-xs font-semibold text-gray-700">
                            {(result.metrics.mrr * 100).toFixed(4)}%
                          </td>
                          <td className="px-4 py-2.5 text-xs font-semibold text-gray-700">
                            {(result.metrics.ndcg * 100).toFixed(4)}%
                          </td>
                          <td className="px-4 py-2.5">
                            <Badge
                              className={cn(
                                "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold",
                                statusStyle.badge
                              )}
                            >
                              {statusStyle.icon}
                              {result.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-2.5">
                            <Button
                              variant="ghost"
                              size="xs"
                              className="text-[10px]"
                              disabled={!result.traceId}
                              onClick={(e) => {
                                e.stopPropagation()
                                handleViewTrace(result)
                              }}
                            >
                              <ExternalLink className="h-3 w-3 mr-1" />
                              View Trace
                            </Button>
                          </td>
                        </motion.tr>

                        {isExpanded && (
                          <tr key={`${result.caseId}-expanded`}>
                            <td colSpan={10} className="border-b border-indigo-100 bg-indigo-50/30 px-6 py-4">
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="space-y-4"
                              >
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <h4 className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                                      Expected Answer
                                    </h4>
                                    <p className="text-xs text-gray-700 leading-relaxed">
                                      {result.expectedAnswer || "—"}
                                    </p>
                                  </div>
                                  <div>
                                    <h4 className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                                      Actual Answer
                                    </h4>
                                    <p className="text-xs text-gray-700 leading-relaxed">
                                      {result.actualAnswer || "No answer generated"}
                                    </p>
                                  </div>
                                </div>

                                <Separator />

                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                                      Expected Sources
                                    </h4>
                                    <div className="overflow-hidden rounded-lg border border-gray-100">
                                      <table className="w-full text-left">
                                        <thead>
                                          <tr className="border-b border-gray-100 bg-gray-50">
                                            <th className="px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-gray-400">Document</th>
                                            <th className="px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-gray-400">Page</th>
                                            <th className="px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-gray-400">Section</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {result.expectedSources.length > 0 ? (
                                            result.expectedSources.map((src, si) => (
                                              <tr key={si} className="border-b border-gray-50 last:border-0">
                                                <td className="px-3 py-1.5 text-[11px] text-gray-700">{src.document}</td>
                                                <td className="px-3 py-1.5 text-[11px] text-gray-600">{src.page}</td>
                                                <td className="px-3 py-1.5 text-[11px] text-gray-600">{src.section || "—"}</td>
                                              </tr>
                                            ))
                                          ) : (
                                            <tr>
                                              <td colSpan={3} className="px-3 py-2 text-xs text-gray-400 italic">
                                                No expected sources available in result
                                              </td>
                                            </tr>
                                          )}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>

                                  <div>
                                    <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                                      Actual Sources
                                    </h4>
                                    <div className="overflow-hidden rounded-lg border border-gray-100">
                                      <table className="w-full text-left">
                                        <thead>
                                          <tr className="border-b border-gray-100 bg-gray-50">
                                            <th className="px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-gray-400">Document</th>
                                            <th className="px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-gray-400">Page</th>
                                            <th className="px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-gray-400">Section</th>
                                            <th className="px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-gray-400">Score</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {result.actualSources.length > 0 ? (
                                            result.actualSources.map((src, si) => (
                                              <tr key={si} className="border-b border-gray-50 last:border-0">
                                                <td className="px-3 py-1.5 text-[11px] text-gray-700">{src.document}</td>
                                                <td className="px-3 py-1.5 text-[11px] text-gray-600">{src.page}</td>
                                                <td className="px-3 py-1.5 text-[11px] text-gray-600">{src.section || "—"}</td>
                                                <td className="px-3 py-1.5 text-[11px] font-semibold text-gray-700">{(src.score * 100).toFixed(4)}%</td>
                                              </tr>
                                            ))
                                          ) : (
                                            <tr>
                                              <td colSpan={4} className="px-3 py-2 text-xs text-gray-400 italic">
                                                No sources retrieved
                                              </td>
                                            </tr>
                                          )}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                </div>

                                {result.failureCategories.length > 0 && (
                                  <>
                                    <Separator />
                                    <div>
                                      <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                                        Failure Categories
                                      </h4>
                                      <div className="flex flex-wrap gap-1.5">
                                        {result.failureCategories.map((cat) => (
                                          <Badge
                                            key={cat}
                                            className="rounded-full bg-rose-100 px-2.5 py-0.5 text-[10px] font-semibold text-rose-700"
                                          >
                                            {FAILURE_CATEGORY_META[cat]?.label ?? cat}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  </>
                                )}

                                {result.failureExplanation && (
                                  <div>
                                    <h4 className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                                      Failure Explanation
                                    </h4>
                                    <p className="text-xs text-gray-600 leading-relaxed">
                                      {result.failureExplanation}
                                    </p>
                                  </div>
                                )}

                                <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                                  <Clock className="h-3 w-3" />
                                  Duration: {formatDuration(result.durationMs)}
                                </div>
                              </motion.div>
                            </td>
                          </tr>
                        )}
                      </AnimatePresence>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Difficulty Breakdown Tab */}
        <TabsContent value="difficulty">
          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold text-gray-900">Difficulty Breakdown</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="pb-3 pr-4 text-[11px] font-medium uppercase tracking-wider text-gray-400">
                      Difficulty
                    </th>
                    <th className="pb-3 px-4 text-[11px] font-medium uppercase tracking-wider text-gray-400">
                      Test Count
                    </th>
                    {SCORE_METRICS.map((m) => (
                      <th key={m.key} className="pb-3 px-4 text-[11px] font-medium uppercase tracking-wider text-gray-400">
                        {m.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {difficultyRows.map((row) => (
                    <tr key={row.level} className="border-b border-gray-50 last:border-0">
                      <td className="py-3 pr-4">
                        <Badge className={cn("text-[10px] rounded-full px-2 py-0.5 font-medium", row.badge)}>
                          {row.label}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-xs font-semibold text-gray-700">{row.count}</td>
                      {SCORE_METRICS.map((m) => {
                        const val = row.metrics[m.key as keyof EvaluationMetrics] as number | undefined ?? 0
                        return (
                          <td key={m.key} className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${val * 100}%` }}
                                  transition={{ duration: 0.5, ease: "easeOut" }}
                                  className="h-full rounded-full bg-indigo-500"
                                />
                              </div>
                              <span className="text-[10px] font-semibold text-gray-600 w-10 text-right">
                                {(val * 100).toFixed(4)}%
                              </span>
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Failure Analysis Tab */}
        <TabsContent value="failures">
          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold text-gray-900">Failure Analysis</h3>
            {failureCategoryData.length > 0 ? (
              <div className="space-y-3">
                {failureCategoryData.map((cat) => {
                  const isExpanded = expandedFailureCategory === cat.category
                  return (
                    <div
                      key={cat.category}
                      className="rounded-lg border border-gray-100 bg-gray-50"
                    >
                      <div
                        className="flex cursor-pointer items-center justify-between px-4 py-3"
                        onClick={() =>
                          setExpandedFailureCategory(isExpanded ? null : cat.category)
                        }
                      >
                        <div className="flex items-center gap-3">
                          {cat.meta.icon}
                          <span className="text-xs font-medium text-gray-900">
                            {cat.meta.label}
                          </span>
                          <Badge className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                            {cat.count}
                          </Badge>
                          <span className="text-[10px] text-gray-400">
                            ({cat.percentage}%)
                          </span>
                        </div>
                        {isExpanded ? (
                          <TrendingUp className="h-4 w-4 text-gray-400 rotate-90 transition-transform" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-gray-400 -rotate-90 transition-transform" />
                        )}
                      </div>
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="border-t border-gray-100 px-4 py-3">
                              <div className="max-h-48 space-y-1.5 overflow-y-auto">
                                {cat.cases.map((c) => (
                                  <div
                                    key={c.caseId}
                                    className="flex items-center justify-between rounded-md bg-white px-3 py-2"
                                  >
                                    <span className="max-w-md truncate text-[11px] text-gray-600">
                                      {c.failureExplanation.slice(0, 80) || "No explanation"}
                                    </span>
                                    <Badge
                                      className={cn(
                                        "ml-2 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
                                        STATUS_STYLES[c.status]?.badge ?? STATUS_STYLES.not_run.badge
                                      )}
                                    >
                                      {c.status}
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <CheckCircle2 className="h-8 w-8 text-gray-300" />
                <p className="mt-2 text-xs text-gray-500">
                  No failures detected. All tests passed!
                </p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Comparison Tab */}
        <TabsContent value="comparison">
          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold text-gray-900">Run Comparison</h3>
            {completedRuns.length >= 2 ? (
              <>
                <div className="mb-6 flex items-end gap-4">
                  <div className="flex-1">
                    <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-gray-400">
                      Run A
                    </label>
                    <SelectField
                      value={compareA}
                      onChange={setCompareA}
                      placeholder="Select a run…"
                      options={completedRuns.map((r) => ({ value: r.id, label: `${r.id.slice(0, 8)} — ${r.datasetName} (${r.datasetVersion})` }))}
                    />
                  </div>
                  <div className="flex items-center pb-2">
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-gray-400">
                      Run B
                    </label>
                    <SelectField
                      value={compareB}
                      onChange={setCompareB}
                      placeholder="Select a run…"
                      options={completedRuns.map((r) => ({ value: r.id, label: `${r.id.slice(0, 8)} — ${r.datasetName} (${r.datasetVersion})` }))}
                    />
                  </div>
                </div>

                {comparisonData ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="pb-3 pr-4 text-[11px] font-medium uppercase tracking-wider text-gray-400">
                            Metric
                          </th>
                          <th className="pb-3 px-4 text-[11px] font-medium uppercase tracking-wider text-gray-400">
                            Run A
                          </th>
                          <th className="pb-3 px-4 text-[11px] font-medium uppercase tracking-wider text-gray-400">
                            Run B
                          </th>
                          <th className="pb-3 px-4 text-[11px] font-medium uppercase tracking-wider text-gray-400">
                            Delta
                          </th>
                          <th className="pb-3 px-4 text-[11px] font-medium uppercase tracking-wider text-gray-400">
                            Change
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {comparisonData.map((row) => (
                          <tr
                            key={row.label}
                            className={cn(
                              "border-b border-gray-50 last:border-0 transition-colors",
                              row.improved ? "bg-emerald-50/40" : row.delta < 0 ? "bg-rose-50/40" : ""
                            )}
                          >
                            <td className="py-3 pr-4 text-xs font-medium text-gray-700">
                              {row.label}
                            </td>
                            <td className="py-3 px-4 text-xs text-gray-600">
                              {(row.valA * 100).toFixed(4)}%
                            </td>
                            <td className="py-3 px-4 text-xs text-gray-600">
                              {(row.valB * 100).toFixed(4)}%
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={cn(
                                  "flex items-center gap-1 text-xs font-semibold",
                                  row.improved ? "text-emerald-600" : row.delta < 0 ? "text-rose-600" : "text-gray-400"
                                )}
                              >
                                {row.improved ? (
                                  <TrendingUp className="h-3 w-3" />
                                ) : row.delta < 0 ? (
                                  <TrendingDown className="h-3 w-3" />
                                ) : null}
                                {row.delta > 0 ? "+" : ""}
                                {(row.delta * 100).toFixed(4)}%
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={cn(
                                  "text-xs font-medium",
                                  row.improved ? "text-emerald-600" : row.delta < 0 ? "text-rose-600" : "text-gray-400"
                                )}
                              >
                                {row.pct > 0 ? "+" : ""}{row.pct.toFixed(4)}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12">
                    <TrendingUp className="h-8 w-8 text-gray-300" />
                    <p className="mt-2 text-xs text-gray-500">
                      Select two runs to compare their metrics side by side.
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <TrendingUp className="h-8 w-8 text-gray-300" />
                <p className="mt-2 text-xs text-gray-500">
                  You need at least two completed runs to compare.
                </p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
