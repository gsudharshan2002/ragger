"use client"

import { useState, useMemo } from "react"
import { useBenchmark } from "@/hooks/use-benchmark"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { GitCompare, TrendingUp, TrendingDown, ArrowRight, BarChart3, ChevronDown } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn, formatDuration, formatNumber } from "@/lib/utils"
import type { BenchmarkRun, EvaluationMetrics, RagStrategy } from "@/lib/types"

type MetricKey = keyof EvaluationMetrics

const METRIC_LABELS: Record<MetricKey, string> = {
  hitRate: "Hit Rate", recall: "Recall", precision: "Precision", mrr: "MRR", ndcg: "NDCG",
  faithfulness: "Faithfulness", answerRelevance: "Answer Relevance", contextPrecision: "Context Precision", contextRecall: "Context Recall",
  latencyMs: "Latency", inputTokens: "Input Tokens", outputTokens: "Output Tokens", totalTokens: "Total Tokens", cost: "Cost",
}

const PERFORMANCE_METRICS: MetricKey[] = ["hitRate", "recall", "precision", "mrr", "ndcg"]
const QUALITY_METRICS: MetricKey[] = ["faithfulness", "answerRelevance", "contextPrecision", "contextRecall"]
const SYSTEM_METRICS: MetricKey[] = ["latencyMs", "inputTokens", "outputTokens", "totalTokens", "cost"]
const HIGHER_IS_BETTER: MetricKey[] = ["hitRate", "recall", "precision", "mrr", "ndcg", "faithfulness", "answerRelevance", "contextPrecision", "contextRecall"]

function isHigherBetter(key: MetricKey): boolean { return HIGHER_IS_BETTER.includes(key) }

function getVal(m: EvaluationMetrics, key: MetricKey): number { return ((m as unknown as Record<string, number>)[key]) ?? 0 }

function getStrategyLabel(strategy: RagStrategy): string {
  const labels: Record<string, string> = { vector: "Vector Search", bm25: "BM25", hybrid: "Hybrid", "hybrid-rrf": "Hybrid + RRF", "hybrid-rerank": "Hybrid + Rerank", "hybrid-rerank-mmr": "Hybrid + Rerank + MMR" }
  return labels[strategy] ?? strategy
}

function formatMetricValue(key: MetricKey, value: number): string {
  if (key === "latencyMs") return formatDuration(value)
  if (["inputTokens", "outputTokens", "totalTokens"].includes(key)) return formatNumber(value)
  if (key === "cost") return `$${value.toFixed(4)}`
  return value.toFixed(4)
}

function HorizontalBar({ label, valueA, valueB, maxValue, metricKey, runALabel, runBLabel }: { label: string; valueA: number; valueB: number; maxValue: number; metricKey: MetricKey; runALabel: string; runBLabel: string }) {
  const percentA = maxValue > 0 ? (valueA / maxValue) * 100 : 0
  const percentB = maxValue > 0 ? (valueB / maxValue) * 100 : 0
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-xs text-gray-500">{formatMetricValue(metricKey, valueA)} vs {formatMetricValue(metricKey, valueB)}</span>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 w-20 truncate shrink-0">{runALabel}</span>
          <div className="flex-1 h-4 bg-gray-200 rounded-full overflow-hidden"><motion.div className="h-full rounded-full bg-indigo-500" initial={{ width: 0 }} animate={{ width: `${percentA}%` }} transition={{ duration: 0.6, ease: "easeOut" }} /></div>
          <span className="text-xs font-mono text-gray-600 w-16 text-right shrink-0">{formatMetricValue(metricKey, valueA)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 w-20 truncate shrink-0">{runBLabel}</span>
          <div className="flex-1 h-4 bg-gray-200 rounded-full overflow-hidden"><motion.div className="h-full rounded-full bg-indigo-500" initial={{ width: 0 }} animate={{ width: `${percentB}%` }} transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }} /></div>
          <span className="text-xs font-mono text-gray-600 w-16 text-right shrink-0">{formatMetricValue(metricKey, valueB)}</span>
        </div>
      </div>
    </div>
  )
}

export function StrategyComparison() {
  const { runs } = useBenchmark()
  const [selectedRunA, setSelectedRunA] = useState("")
  const [selectedRunB, setSelectedRunB] = useState("")
  const [dropdownOpen, setDropdownOpen] = useState<"a" | "b" | null>(null)

  const runA = useMemo(() => runs.find((r) => r.id === selectedRunA) ?? null, [runs, selectedRunA])
  const runB = useMemo(() => runs.find((r) => r.id === selectedRunB) ?? null, [runs, selectedRunB])

  const comparisons = useMemo(() => {
    if (!runA || !runB) return null
    const metricKeys = Object.keys(METRIC_LABELS) as MetricKey[]
    const improvements: { key: MetricKey; delta: number; change: number }[] = []
    const regressions: { key: MetricKey; delta: number; change: number }[] = []
    const stable: { key: MetricKey; delta: number; change: number }[] = []
    for (const key of metricKeys) {
      const valA = getVal(runA.aggregateMetrics, key), valB = getVal(runB.aggregateMetrics, key)
      const delta = valB - valA, change = valA !== 0 ? ((valB - valA) / Math.abs(valA)) * 100 : valB === 0 ? 0 : 100
      const effectiveDelta = isHigherBetter(key) ? delta : -delta
      if (Math.abs(delta) < 0.01) stable.push({ key, delta, change })
      else if (effectiveDelta > 0) improvements.push({ key, delta, change })
      else regressions.push({ key, delta, change })
    }
    return { metricKeys, improvements, regressions, stable }
  }, [runA, runB])

  const recommendations = useMemo(() => {
    if (!comparisons || !runA || !runB) return []
    const recs: string[] = []
    const stratA = getStrategyLabel(runA.strategy), stratB = getStrategyLabel(runB.strategy)
    const highRecall = comparisons.improvements.find((i) => i.key === "recall")
    const highLatency = comparisons.regressions.find((r) => r.key === "latencyMs")
    if (highRecall && highLatency) recs.push(`${stratB} shows ${Math.abs(highRecall.change).toFixed(0)}% better recall but ${Math.abs(highLatency.change).toFixed(0)}% higher latency. Consider if the quality improvement justifies the cost increase.`)
    const lowMRR = comparisons.regressions.find((r) => r.key === "mrr")
    if (lowMRR) recs.push(`MRR regression with ${stratB} suggests the first relevant result may appear lower in rankings.`)
    if (comparisons.improvements.length === 0 && comparisons.regressions.length > 0) recs.push(`${stratA} outperforms ${stratB} across most metrics.`)
    if (comparisons.regressions.length === 0 && comparisons.improvements.length > 0) recs.push(`${stratB} outperforms ${stratA} across multiple dimensions. Consider migrating.`)
    if (recs.length === 0) recs.push("Both strategies show comparable results with minor trade-offs.")
    return recs
  }, [comparisons, runA, runB])

  function RunDropdown({ label, side, runs: runList, selectedId, onSelect }: { label: string; side: "a" | "b"; runs: BenchmarkRun[]; selectedId: string; onSelect: (id: string) => void }) {
    const selected = runList.find((r) => r.id === selectedId)
    const isOpen = dropdownOpen === side
    return (
      <div className="relative">
        <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
        <button type="button" onClick={() => setDropdownOpen(isOpen ? null : side)} className={cn("w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 text-left transition-all", isOpen ? "border-indigo-500 ring-2 ring-indigo-500/20" : "border-gray-200 hover:border-gray-300", selected ? "bg-white" : "bg-gray-50 text-gray-400")}>
          <div className="flex-1 min-w-0">
            {selected ? (
              <div>
                <div className="font-medium text-gray-900 truncate">{getStrategyLabel(selected.strategy)} — {selected.datasetName}</div>
                <div className="text-xs text-gray-500 mt-0.5">{new Date(selected.startedAt).toLocaleDateString()} {new Date(selected.startedAt).toLocaleTimeString()}</div>
              </div>
            ) : <span>Select a benchmark run...</span>}
          </div>
          <ChevronDown className={cn("h-4 w-4 text-gray-400 transition-transform shrink-0 ml-2", isOpen && "rotate-180")} />
        </button>
        <AnimatePresence>{isOpen && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }} className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
            <ScrollArea className="max-h-64">
              {runList.length === 0 ? <div className="px-4 py-6 text-center text-sm text-gray-500">No runs available.</div> : runList.map((run) => (
                <button key={run.id} type="button" onClick={() => { onSelect(run.id); setDropdownOpen(null) }} className={cn("w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0", run.id === selectedId && "bg-indigo-50")}>
                  <div className="font-medium text-gray-900 text-sm">{getStrategyLabel(run.strategy)} — {run.datasetName}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{new Date(run.startedAt).toLocaleDateString()} {new Date(run.startedAt).toLocaleTimeString()}</div>
                  <div className="flex items-center gap-2 mt-1"><Badge variant="secondary" className="text-[10px]">{run.strategy}</Badge><Badge variant="outline" className="text-[10px]">{formatNumber(run.aggregateMetrics.totalTokens)} tokens</Badge></div>
                </button>
              ))}
            </ScrollArea>
          </motion.div>
        )}</AnimatePresence>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-indigo-100 rounded-lg"><GitCompare className="h-5 w-5 text-indigo-600" /></div>
        <div><h2 className="text-xl font-bold text-gray-900">Strategy Comparison</h2><p className="text-sm text-gray-500">Compare benchmark results across different RAG strategies.</p></div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <RunDropdown label="Run A" side="a" runs={runs} selectedId={selectedRunA} onSelect={setSelectedRunA} />
          <div className="flex items-end justify-center pb-1">
            <button
              type="button"
              onClick={() => { if (selectedRunA && selectedRunB) { /* compare triggers automatically via state */ } }}
              className="hidden md:flex items-center gap-1 px-4 py-2 rounded-full bg-red-50 text-red-600 text-sm font-semibold hover:bg-red-100 hover:text-red-700 transition-colors cursor-pointer border border-red-200"
            >
              Go <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <RunDropdown label="Run B" side="b" runs={runs} selectedId={selectedRunB} onSelect={setSelectedRunB} />
        </div>
      </div>

      {runA && runB && comparisons && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Overall Comparison</h3>
              <p className="text-xs text-gray-500 mt-0.5">{getStrategyLabel(runA.strategy)} ({runA.datasetName}) vs {getStrategyLabel(runB.strategy)} ({runB.datasetName})</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-6 py-3 font-medium text-gray-600">Metric</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Run A</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Run B</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Delta</th>
                  <th className="text-center px-6 py-3 font-medium text-gray-600">Winner</th>
                </tr></thead>
                <tbody>{comparisons.metricKeys.map((key) => {
                  const valA = getVal(runA.aggregateMetrics, key), valB = getVal(runB.aggregateMetrics, key)
                  const delta = valB - valA, higher = isHigherBetter(key), effectiveDelta = higher ? delta : -delta
                  let winner: "a" | "b" | "tie" = "tie"
                  if (Math.abs(delta) >= 0.01) winner = effectiveDelta > 0 ? "b" : "a"
                  return (
                    <tr key={key} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-6 py-3 font-medium text-gray-800">{METRIC_LABELS[key]}</td>
                      <td className={cn("text-right px-4 py-3 font-mono", winner === "a" ? "font-bold text-gray-900" : "text-gray-600")}>{formatMetricValue(key, valA)}</td>
                      <td className={cn("text-right px-4 py-3 font-mono", winner === "b" ? "font-bold text-gray-900" : "text-gray-600")}>{formatMetricValue(key, valB)}</td>
                      <td className={cn("text-right px-4 py-3 font-mono text-xs", winner === "b" ? "text-green-600" : winner === "a" ? "text-red-600" : "text-gray-500")}>{delta >= 0 ? "+" : ""}{formatMetricValue(key, delta)}</td>
                      <td className="text-center px-6 py-3">{winner === "b" ? <TrendingUp className="h-4 w-4 text-green-500 inline" /> : winner === "a" ? <TrendingDown className="h-4 w-4 text-red-500 inline" /> : <span className="text-gray-400 text-xs">—</span>}</td>
                    </tr>
                  )
                })}</tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            {[{ title: "Performance", desc: "Retrieval effectiveness", metrics: PERFORMANCE_METRICS }, { title: "Quality", desc: "Answer quality", metrics: QUALITY_METRICS }, { title: "System", desc: "Resource usage", metrics: SYSTEM_METRICS }].map((section) => (
              <div key={section.title} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <h4 className="font-semibold text-gray-900 mb-1">{section.title}</h4>
                <p className="text-xs text-gray-500 mb-4">{section.desc}</p>
                <div className="space-y-4">{section.metrics.map((key) => (
                  <HorizontalBar key={key} label={METRIC_LABELS[key]} valueA={getVal(runA.aggregateMetrics, key)} valueB={getVal(runB.aggregateMetrics, key)} maxValue={Math.max(getVal(runA.aggregateMetrics, key), getVal(runB.aggregateMetrics, key), 1)} metricKey={key} runALabel={getStrategyLabel(runA.strategy)} runBLabel={getStrategyLabel(runB.strategy)} />
                ))}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            {comparisons.improvements.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3 bg-green-50 border-b border-green-100"><div className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-green-600" /><h4 className="font-semibold text-green-800 text-sm">Improvements</h4><Badge className="bg-green-100 text-green-700 text-[10px] border-0">{comparisons.improvements.length}</Badge></div></div>
                <div className="p-4 space-y-2">{comparisons.improvements.map((item) => (<div key={item.key} className="flex items-center justify-between py-2 px-3 rounded-lg bg-green-50/50"><span className="text-sm text-gray-700">{METRIC_LABELS[item.key]}</span><span className="text-sm font-mono font-medium text-green-700">+{Math.abs(item.change).toFixed(1)}%</span></div>))}</div>
              </div>
            )}
            {comparisons.regressions.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3 bg-red-50 border-b border-red-100"><div className="flex items-center gap-2"><TrendingDown className="h-4 w-4 text-red-600" /><h4 className="font-semibold text-red-800 text-sm">Regressions</h4><Badge className="bg-red-100 text-red-700 text-[10px] border-0">{comparisons.regressions.length}</Badge></div></div>
                <div className="p-4 space-y-2">{comparisons.regressions.map((item) => (<div key={item.key} className="flex items-center justify-between py-2 px-3 rounded-lg bg-red-50/50"><span className="text-sm text-gray-700">{METRIC_LABELS[item.key]}</span><span className="text-sm font-mono font-medium text-red-700">{item.change.toFixed(1)}%</span></div>))}</div>
              </div>
            )}
            {comparisons.stable.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3 bg-gray-50 border-b border-gray-100"><div className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-gray-500" /><h4 className="font-semibold text-gray-700 text-sm">Stable</h4><Badge className="bg-gray-100 text-gray-600 text-[10px] border-0">{comparisons.stable.length}</Badge></div></div>
                <div className="p-4 space-y-2">{comparisons.stable.map((item) => (<div key={item.key} className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50/50"><span className="text-sm text-gray-700">{METRIC_LABELS[item.key]}</span><span className="text-sm font-mono text-gray-500">~0%</span></div>))}</div>
              </div>
            )}
          </div>

          {recommendations.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mt-6">
              <h3 className="font-semibold text-gray-900 mb-3">Recommendations</h3>
              <div className="space-y-3">{recommendations.map((rec, i) => (<div key={i} className="flex items-start gap-3 p-3 bg-indigo-50/50 rounded-lg border border-indigo-100"><ArrowRight className="h-4 w-4 text-indigo-500 mt-0.5 shrink-0" /><p className="text-sm text-gray-700">{rec}</p></div>))}</div>
            </div>
          )}
        </motion.div>
      )}

      {(!runA || !runB) && runs.length >= 2 && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 shadow-sm text-center">
          <GitCompare className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Select two benchmark runs above to compare their results.</p>
        </div>
      )}
      {runs.length < 2 && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 shadow-sm text-center">
          <GitCompare className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">You need at least two benchmark runs to compare.</p>
        </div>
      )}
    </div>
  )
}
