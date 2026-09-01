"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Database,
  GitCompare,
  Hash,
  History,
  Layers,
  Play,
  Plus,
  Target,
  Trash2,
  XCircle,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SelectField } from "@/components/ui/select-field"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { cn, formatDuration, formatNumber } from "@/lib/utils"
import { useBenchmark } from "@/hooks/use-benchmark"

const METRIC_DEFS = [
  { key: "hitRate" as const, label: "Hit Rate", color: "bg-emerald-100 text-emerald-700" },
  { key: "recall" as const, label: "Recall", color: "bg-blue-100 text-blue-700" },
  { key: "precision" as const, label: "Precision", color: "bg-violet-100 text-violet-700" },
  { key: "mrr" as const, label: "MRR", color: "bg-amber-100 text-amber-700" },
  { key: "ndcg" as const, label: "NDCG", color: "bg-rose-100 text-rose-700" },
  { key: "latencyMs" as const, label: "Avg Latency", color: "bg-slate-100 text-slate-700", isLatency: true },
  { key: "inputTokens" as const, label: "Input Tokens", color: "bg-cyan-100 text-cyan-700", isTokens: true },
  { key: "outputTokens" as const, label: "Output Tokens", color: "bg-teal-100 text-teal-700", isTokens: true },
  { key: "totalTokens" as const, label: "Total Tokens", color: "bg-pink-100 text-pink-700", isTokens: true },
  { key: "cost" as const, label: "Cost", color: "bg-lime-100 text-lime-700", isCurrency: true },
]

const DIFFICULTY_LEVELS = [
  { key: "easy" as const, label: "Easy", color: "text-emerald-600", bg: "bg-emerald-50" },
  { key: "medium" as const, label: "Medium", color: "text-amber-600", bg: "bg-amber-50" },
  { key: "hard" as const, label: "Hard", color: "text-orange-600", bg: "bg-orange-50" },
  { key: "expert" as const, label: "Expert", color: "text-rose-600", bg: "bg-rose-50" },
]

function formatMetricValue(def: (typeof METRIC_DEFS)[number], value: number | undefined): string {
  if (value === undefined || value === null) return "—"
  if (def.isLatency) return `${Math.round(value)}ms`
  if (def.isTokens) return formatNumber(value)
  if (def.isCurrency) return `$${value.toFixed(4)}`
  return `${(value * 100).toFixed(4)}%`
}

export function BenchmarkDashboard() {
  const { datasets, selectedDataset, selectedVersion, setSelectedDataset, setSelectedVersion, runs, config, isRunning, deleteRun, activeRun, viewRun } = useBenchmark()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("overview")
  const [pendingDeleteRun, setPendingDeleteRun] = useState<{ ids: string[]; label: string } | null>(null)
  const [selectedRunIds, setSelectedRunIds] = useState<Set<string>>(new Set())

  const latestRun = useMemo(() => {
    if (!runs || runs.length === 0) return null
    return [...runs].sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())[0]
  }, [runs])

  const m = latestRun?.aggregateMetrics

  const handleRunBenchmark = () => router.push("/benchmark/config")

  const failureCategories = useMemo(() => {
    if (!latestRun) return []
    const counts: Record<string, { total: number; cases: { id: string; query: string; error: string }[] }> = {}
    for (const r of latestRun.results) {
      for (const fc of r.failureCategories) {
        if (!counts[fc]) counts[fc] = { total: 0, cases: [] }
        counts[fc].total += 1
        const gc = latestRun.results.find((x) => x.caseId === r.caseId)
        if (gc) {
          counts[fc].cases.push({ id: r.caseId, query: r.actualAnswer.slice(0, 60), error: r.failureExplanation.slice(0, 80) })
        }
      }
    }
    return Object.entries(counts).map(([category, data]) => ({ category, ...data })).sort((a, b) => b.total - a.total)
  }, [latestRun])

  const difficultyData = useMemo(() => {
    if (!latestRun) return []
    return DIFFICULTY_LEVELS.map((level) => {
      const bm = latestRun.difficultyBreakdown[level.key]
      return { ...level, data: bm || {} }
    })
  }, [latestRun])

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">RAG Benchmark</h1>
          <p className="mt-1 text-sm text-gray-500">Evaluate and improve your RAG pipeline using real test cases.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push("/datasets")} className="rounded-full border-gray-200 px-4 text-xs font-medium text-gray-600 hover:bg-gray-50">
            <Database className="mr-1.5 h-3.5 w-3.5" /> New Dataset
          </Button>
          <Button variant="outline" size="sm" onClick={() => router.push("/benchmark/compare")} className="rounded-full border-gray-200 px-4 text-xs font-medium text-gray-600 hover:bg-gray-50">
            <GitCompare className="mr-1.5 h-3.5 w-3.5" /> Compare Runs
          </Button>
          <Button size="sm" className="rounded-full bg-emerald-600 px-4 text-xs font-medium text-white shadow-sm shadow-emerald-600/30 hover:bg-emerald-500 hover:shadow-md hover:shadow-emerald-500/40" onClick={handleRunBenchmark}>
            <Play className="mr-1.5 h-3.5 w-3.5" /> {isRunning ? "Running..." : "Configure Benchmark"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {METRIC_DEFS.map((def) => {
          const value = m ? (m as unknown as Record<string, number>)[def.key] : undefined
          return (
            <motion.div key={def.key} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-gray-400">{def.label}</div>
              <div className="mb-2 text-lg font-semibold text-gray-900">{formatMetricValue(def, value)}</div>
              <Badge className={cn("text-[10px] font-medium rounded-full px-2 py-0.5", def.color)}>
                {value !== undefined ? "Latest" : "—"}
              </Badge>
            </motion.div>
          )
        })}
      </div>

      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
              <BookOpen className="h-5 w-5 text-gray-500" />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900">{selectedDataset?.name ?? "No dataset selected"}</div>
              <div className="mt-0.5 flex items-center gap-3 text-xs text-gray-500">
                <span>Version <span className="font-medium text-gray-700">{selectedVersion ?? "—"}</span></span>
                <span className="text-gray-300">·</span>
                <span>{selectedDataset?.versions?.find((v) => v.version === selectedVersion)?.cases?.length ?? 0} test cases</span>
                {latestRun && (
                  <>
                    <span className="text-gray-300">·</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Last run {formatDuration(Date.now() - new Date(latestRun.startedAt).getTime())} ago
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SelectField
              value={selectedDataset?.id ?? ""}
              onChange={(v) => { const ds = datasets.find((d) => d.id === v); if (ds) setSelectedDataset(ds) }}
              placeholder="Select dataset…"
              options={datasets.map((ds) => ({ value: ds.id, label: ds.name }))}
              width="auto"
            />
            <SelectField
              value={selectedVersion ?? ""}
              onChange={(v) => setSelectedVersion(v)}
              placeholder="Version…"
              options={(selectedDataset?.versions ?? []).map((v) => ({ value: v.version, label: `v${v.version} (${v.cases.length} cases)` }))}
              width="auto"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        {[
          { value: "overview", label: "Overview", icon: BarChart3 },
          { value: "difficulty", label: "Difficulty", icon: Layers },
          { value: "tags", label: "Tags", icon: Hash },
          { value: "failures", label: "Failures", icon: AlertTriangle },
          { value: "history", label: "History", icon: History },
        ].map((tab) => {
          const isActive = activeTab === tab.value
          const Icon = tab.icon
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-xs font-medium transition-all",
                isActive
                  ? "border-gray-900 bg-gray-900 text-white shadow-sm"
                  : "border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-700"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
              {isActive && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                  <Check className="h-3 w-3" />
                </motion.div>
              )}
            </button>
          )
        })}
      </div>

      <div>
        {activeTab === "overview" && (
          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            {latestRun ? (
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">Latest Run Summary</h3>
                    <p className="mt-0.5 text-xs text-gray-500">
                      Run <span className="font-mono text-gray-700">{latestRun.id.slice(0, 8)}</span> · {new Date(latestRun.startedAt).toLocaleDateString()} at {new Date(latestRun.startedAt).toLocaleTimeString()}
                    </p>
                  </div>
                  <Badge className={cn("text-[10px] font-medium rounded-full px-2.5 py-0.5", latestRun.status === "completed" ? "bg-emerald-100 text-emerald-700" : latestRun.status === "running" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600")}>
                    {latestRun.status}
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                    <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /><span className="text-xs font-medium text-emerald-700">Passed</span></div>
                    <div className="mt-2 text-2xl font-bold text-emerald-900">{latestRun.passedTests}</div>
                    <div className="mt-0.5 text-[11px] text-emerald-600">{latestRun.totalTests > 0 ? `${((latestRun.passedTests / latestRun.totalTests) * 100).toFixed(4)}%` : "0.0000%"} of {latestRun.totalTests} cases</div>
                  </div>
                  <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
                    <div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-600" /><span className="text-xs font-medium text-amber-700">Partial</span></div>
                    <div className="mt-2 text-2xl font-bold text-amber-900">{latestRun.partialTests}</div>
                    <div className="mt-0.5 text-[11px] text-amber-600">{latestRun.totalTests > 0 ? `${((latestRun.partialTests / latestRun.totalTests) * 100).toFixed(4)}%` : "0.0000%"} of {latestRun.totalTests} cases</div>
                  </div>
                  <div className="rounded-xl border border-rose-100 bg-rose-50 p-4">
                    <div className="flex items-center gap-2"><XCircle className="h-4 w-4 text-rose-600" /><span className="text-xs font-medium text-rose-700">Failed</span></div>
                    <div className="mt-2 text-2xl font-bold text-rose-900">{latestRun.failedTests}</div>
                    <div className="mt-0.5 text-[11px] text-rose-600">{latestRun.totalTests > 0 ? `${((latestRun.failedTests / latestRun.totalTests) * 100).toFixed(4)}%` : "0.0000%"} of {latestRun.totalTests} cases</div>
                  </div>
                </div>

                <div className="mt-6">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-600">Overall Pass Rate</span>
                    <span className="text-xs font-semibold text-gray-900">{latestRun.totalTests > 0 ? `${((latestRun.passedTests / latestRun.totalTests) * 100).toFixed(4)}%` : "—"}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${latestRun.totalTests > 0 ? (latestRun.passedTests / latestRun.totalTests) * 100 : 0}%` }} transition={{ duration: 0.8, ease: "easeOut" }} className="h-full rounded-full bg-emerald-500" />
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-50">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${latestRun.totalTests > 0 ? (latestRun.partialTests / latestRun.totalTests) * 100 : 0}%` }} transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }} className="h-full rounded-full bg-amber-400" />
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-5 gap-3">
                  {METRIC_DEFS.slice(0, 5).map((def) => {
                    const value = m ? (m as unknown as Record<string, number>)[def.key] : undefined
                    return (
                      <div key={def.key} className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-center">
                        <div className="text-[10px] font-medium uppercase tracking-wider text-gray-400">{def.label}</div>
                        <div className="mt-1 text-base font-bold text-gray-900">{formatMetricValue(def, value)}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100"><BarChart3 className="h-7 w-7 text-gray-400" /></div>
                <h3 className="mt-4 text-sm font-medium text-gray-900">No benchmark runs yet</h3>
                <p className="mt-1 text-xs text-gray-500">Select a dataset and run your first benchmark to see results.</p>
                <Button className="mt-4 rounded-full bg-emerald-600 px-4 text-xs font-medium text-white shadow-sm shadow-emerald-600/30 hover:bg-emerald-500 hover:shadow-md hover:shadow-emerald-500/40" onClick={handleRunBenchmark}><Play className="mr-1.5 h-3.5 w-3.5" />Configure First Benchmark</Button>
              </div>
            )}
          </div>
        )}

        {activeTab === "difficulty" && (
          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold text-gray-900">Difficulty Analysis</h3>
            {latestRun ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead><tr className="border-b border-gray-100">
                    <th className="pb-3 pr-4 text-[11px] font-medium uppercase tracking-wider text-gray-400">Difficulty</th>
                    {METRIC_DEFS.slice(0, 5).map((def) => (<th key={def.key} className="pb-3 px-4 text-[11px] font-medium uppercase tracking-wider text-gray-400">{def.label}</th>))}
                  </tr></thead>
                  <tbody>{difficultyData.map((row) => (
                    <tr key={row.key} className="border-b border-gray-50 last:border-0">
                      <td className="py-3 pr-4"><Badge className={cn("text-[10px] rounded-full px-2 py-0.5", row.bg, row.color)}>{row.label}</Badge></td>
                      {METRIC_DEFS.slice(0, 5).map((def) => {
                        const val = (row.data as Record<string, number | undefined>)[def.key]
                        return <td key={def.key} className="py-3 px-4 text-xs text-gray-600">{formatMetricValue(def, val)}</td>
                      })}
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            ) : <div className="flex flex-col items-center justify-center py-12"><Layers className="h-8 w-8 text-gray-300" /><p className="mt-2 text-xs text-gray-500">No difficulty data available.</p></div>}
          </div>
        )}

        {activeTab === "tags" && (
          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold text-gray-900">Tag Analysis</h3>
            {latestRun && Object.keys(latestRun.tagBreakdown).length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead><tr className="border-b border-gray-100">
                    <th className="pb-3 pr-4 text-[11px] font-medium uppercase tracking-wider text-gray-400">Tag</th>
                    {METRIC_DEFS.slice(0, 5).map((def) => (<th key={def.key} className="pb-3 px-4 text-[11px] font-medium uppercase tracking-wider text-gray-400">{def.label}</th>))}
                  </tr></thead>
                  <tbody>{Object.entries(latestRun.tagBreakdown).map(([tag, vals]) => (
                    <tr key={tag} className="border-b border-gray-50 last:border-0">
                      <td className="py-3 pr-4"><Badge className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-700">{tag}</Badge></td>
                      {METRIC_DEFS.slice(0, 5).map((def) => {
                        const val = (vals as Record<string, number | undefined>)[def.key]
                        return <td key={def.key} className="py-3 px-4 text-xs text-gray-600">{formatMetricValue(def, val)}</td>
                      })}
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            ) : <div className="flex flex-col items-center justify-center py-12"><Hash className="h-8 w-8 text-gray-300" /><p className="mt-2 text-xs text-gray-500">No tag data available.</p></div>}
          </div>
        )}

        {activeTab === "failures" && (
          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold text-gray-900">Failure Analysis</h3>
            {failureCategories.length > 0 ? (
              <div className="space-y-3">
                {failureCategories.map((cat) => (
                  <div key={cat.category} className="rounded-lg border border-gray-100 bg-gray-50">
                    <div className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-3">
                        <XCircle className="h-4 w-4 text-rose-500" />
                        <span className="text-xs font-medium text-gray-900">{cat.category.replace(/_/g, " ")}</span>
                        <Badge className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-medium text-rose-700">{cat.total}</Badge>
                      </div>
                    </div>
                    <div className="border-t border-gray-100 px-4 py-3">
                      <div className="max-h-48 space-y-2 overflow-y-auto">
                        {cat.cases.map((c) => (
                          <div key={c.id} className="flex items-start justify-between rounded-md bg-white px-3 py-2">
                            <span className="max-w-md truncate text-[11px] text-gray-600">{c.query}</span>
                            <span className="ml-3 shrink-0 text-[10px] text-gray-400">{c.error}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <CheckCircle2 className="h-8 w-8 text-gray-300" />
                <p className="mt-2 text-xs text-gray-500">{latestRun && latestRun.failedTests === 0 && latestRun.totalTests > 0 ? "No failures detected!" : "No failure data available."}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "history" && (() => {
          const sortedRuns = [...runs].sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
          const allSelected = sortedRuns.length > 0 && sortedRuns.every((r) => selectedRunIds.has(r.id))
          const toggleSelectAll = () => {
            setSelectedRunIds(allSelected ? new Set() : new Set(sortedRuns.map((r) => r.id)))
          }
          const toggleSelectOne = (id: string) => {
            setSelectedRunIds((prev) => {
              const next = new Set(prev)
              if (next.has(id)) next.delete(id)
              else next.add(id)
              return next
            })
          }
          return (
            <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">Run History</h3>
                {selectedRunIds.size > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={() => setPendingDeleteRun({ ids: [...selectedRunIds], label: `${selectedRunIds.size} selected run${selectedRunIds.size > 1 ? "s" : ""}` })}
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    Delete Selected ({selectedRunIds.size})
                  </Button>
                )}
              </div>
              {sortedRuns.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-3 px-4 py-1">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-gray-300 accent-gray-900"
                    />
                    <span className="text-[11px] font-medium uppercase tracking-wider text-gray-400">Select all</span>
                  </div>
                  {sortedRuns.map((run) => (
                    <div
                      key={run.id}
                      onClick={() => {
                        viewRun(run)
                        document.getElementById("benchmark-results-section")?.scrollIntoView({ behavior: "smooth", block: "start" })
                      }}
                      className={cn(
                        "flex items-center justify-between rounded-lg border px-4 py-3 transition-colors cursor-pointer",
                        activeRun?.id === run.id ? "border-indigo-200 bg-indigo-50/50" : "border-gray-100 hover:bg-gray-50"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedRunIds.has(run.id)}
                          onChange={() => toggleSelectOne(run.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="h-4 w-4 rounded border-gray-300 accent-gray-900"
                        />
                        <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", run.status === "completed" ? "bg-emerald-100" : "bg-gray-100")}>
                          {run.status === "completed" ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Clock className="h-4 w-4 text-gray-500" />}
                        </div>
                        <div>
                          <div className="text-xs font-medium text-gray-900">Run <span className="font-mono">{run.id.slice(0, 8)}</span></div>
                          <div className="mt-0.5 text-[11px] text-gray-500">{new Date(run.startedAt).toLocaleDateString()} · {run.strategy} · {run.passedTests}/{run.totalTests} passed</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">Hit Rate: {(run.aggregateMetrics.hitRate * 100).toFixed(4)}%</Badge>
                        <span className="hidden sm:inline text-[11px] text-gray-400">View details</span>
                        <ChevronRight className="h-3.5 w-3.5 text-gray-300" />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:bg-red-50 hover:text-red-700"
                          onClick={(e) => {
                            e.stopPropagation()
                            setPendingDeleteRun({ ids: [run.id], label: `${run.id.slice(0, 8)} (${run.strategy})` })
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <div className="flex flex-col items-center justify-center py-12"><History className="h-8 w-8 text-gray-300" /><p className="mt-2 text-xs text-gray-500">No benchmark runs recorded.</p></div>}
            </div>
          )
        })()}
      </div>

      <Dialog open={!!pendingDeleteRun} onOpenChange={(open) => { if (!open) setPendingDeleteRun(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-red-50">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <DialogTitle className="text-center">
              {pendingDeleteRun && pendingDeleteRun.ids.length > 1 ? "Delete these benchmark runs?" : "Delete this benchmark run?"}
            </DialogTitle>
            <DialogDescription className="text-center">
              This will permanently delete <span className="font-medium text-gray-700">&ldquo;{pendingDeleteRun?.label}&rdquo;</span> {pendingDeleteRun && pendingDeleteRun.ids.length > 1 ? "and their results" : "and its results"}. Every other run stays intact. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center">
            <Button variant="outline" onClick={() => setPendingDeleteRun(null)}>Cancel</Button>
            <Button
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={() => {
                if (pendingDeleteRun) {
                  for (const id of pendingDeleteRun.ids) deleteRun(id)
                  setSelectedRunIds(new Set())
                }
                setPendingDeleteRun(null)
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
