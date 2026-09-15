"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Bot,
  Cog,
  CheckCircle2,
  XCircle,
  Clock,
  Package,
  ShieldCheck,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  TrendingDown,
  DollarSign,
  Target,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn, formatDuration } from "@/lib/utils"

interface RaceRow {
  system: string
  caseId: string
  passed: boolean
  latencyMs: number
  inputTokens: number
  outputTokens: number
  cost: number
  answer: string
}

const RACE_QUESTIONS = [
  { id: "combine-001", question: "What does the Combine framework provide?", requiresDeprecation: false },
  { id: "combine-005", question: "What is AnyPublisher in Combine?", requiresDeprecation: false },
  { id: "gh-001", question: "In the current GitHub API version, what field should you read to get your core rate limit information?", requiresDeprecation: false },
  { id: "gh-004", question: "On the current API version, what value does a submodule entry report for its type field?", requiresDeprecation: false },
  { id: "gh-009", question: "What HTTP status code does the current API version return on a successful workflow dispatch request?", requiresDeprecation: false },
  { id: "gh-002", question: "Using API Version 2026-03-10, does the GET /rate_limit response still include a top-level rate field?", requiresDeprecation: true },
  { id: "gh-003", question: "If my integration currently reads the top-level rate field from /rate_limit, what should I change?", requiresDeprecation: true },
  { id: "gh-006", question: "Does the current version of GET /repos/{owner}/{repo} still include a has_downloads field?", requiresDeprecation: true },
  { id: "gh-007", question: "My code reads pull_request.merge_commit_sha after a merge completes. Will that still work?", requiresDeprecation: true },
  { id: "gh-013", question: "What changed about attestation list responses between API Version 2022-11-28 and 2026-03-10?", requiresDeprecation: true },
]

const RACE_DATA: RaceRow[] = [
  { system: "agent", caseId: "combine-001", passed: true, latencyMs: 59715, inputTokens: 1581, outputTokens: 193, cost: 0.000887, answer: "The Combine framework provides a declarative Swift API for processing values over time." },
  { system: "agent", caseId: "combine-005", passed: true, latencyMs: 10971, inputTokens: 1885, outputTokens: 130, cost: 0.0010075, answer: "AnyPublisher in Combine is a publisher that performs type erasure by wrapping another publisher." },
  { system: "agent", caseId: "gh-001", passed: true, latencyMs: 15020, inputTokens: 1888, outputTokens: 116, cost: 0.001002, answer: "In the current GitHub API version, you should read the `resources.core` field to get your core rate limit information." },
  { system: "agent", caseId: "gh-004", passed: true, latencyMs: 12690, inputTokens: 1640, outputTokens: 147, cost: 0.0008935, answer: "A submodule entry reports `submodule` for its type field when listing repository contents." },
  { system: "agent", caseId: "gh-009", passed: true, latencyMs: 34295, inputTokens: 2589, outputTokens: 271, cost: 0.00143, answer: "The current API version returns 200 OK on a successful workflow dispatch request. The response body includes the triggered workflow run's details." },
  { system: "agent", caseId: "gh-002", passed: true, latencyMs: 27811, inputTokens: 1926, outputTokens: 203, cost: 0.0010645, answer: "No, the GET /rate_limit response does not include a top-level rate field when using API Version 2026-03-10." },
  { system: "agent", caseId: "gh-003", passed: false, latencyMs: 13324, inputTokens: 2024, outputTokens: 178, cost: 0.001101, answer: "To keep working on the current API version, you should replace any code reading the top-level `rate` field with `resources.core`." },
  { system: "agent", caseId: "gh-006", passed: false, latencyMs: 37831, inputTokens: 956, outputTokens: 105, cost: 0.00053, answer: "I could not find a sufficient answer within the allotted budget." },
  { system: "agent", caseId: "gh-007", passed: true, latencyMs: 19521, inputTokens: 1707, outputTokens: 168, cost: 0.0009375, answer: "No, that will not work on the current API version, as the `merge_commit_sha` field has been removed." },
  { system: "agent", caseId: "gh-013", passed: true, latencyMs: 16575, inputTokens: 1538, outputTokens: 131, cost: 0.0008345, answer: "The `bundle` property has been removed from attestation list responses in API Version 2026-03-10." },
  { system: "workflow", caseId: "combine-001", passed: true, latencyMs: 8690, inputTokens: 594, outputTokens: 82, cost: 0.000338, answer: "The Combine framework provides a declarative Swift API for processing values over time." },
  { system: "workflow", caseId: "combine-005", passed: true, latencyMs: 2692, inputTokens: 658, outputTokens: 20, cost: 0.000339, answer: "AnyPublisher in Combine is a publisher that performs type erasure by wrapping another publisher." },
  { system: "workflow", caseId: "gh-001", passed: true, latencyMs: 2605, inputTokens: 637, outputTokens: 18, cost: 0.0003275, answer: "You should read the `resources.core` field to get your core rate limit information." },
  { system: "workflow", caseId: "gh-004", passed: true, latencyMs: 1819, inputTokens: 593, outputTokens: 20, cost: 0.0003065, answer: "A submodule entry reports `submodule` for its type field when listing repository contents." },
  { system: "workflow", caseId: "gh-009", passed: true, latencyMs: 4100, inputTokens: 548, outputTokens: 42, cost: 0.000295, answer: "The current API version returns 200 OK on a successful workflow dispatch request." },
  { system: "workflow", caseId: "gh-002", passed: true, latencyMs: 6214, inputTokens: 620, outputTokens: 48, cost: 0.000334, answer: "No, the GET /rate_limit response does not include a top-level `rate` field when using API Version 2026-03-10." },
  { system: "workflow", caseId: "gh-003", passed: false, latencyMs: 3432, inputTokens: 686, outputTokens: 48, cost: 0.000367, answer: "To keep working on the current API version, you should replace any code reading the top-level `rate` field with `resources.core`." },
  { system: "workflow", caseId: "gh-006", passed: true, latencyMs: 8330, inputTokens: 501, outputTokens: 33, cost: 0.000267, answer: "No, the current version of GET /repos/{owner}/{repo} does not include a `has_downloads` field." },
  { system: "workflow", caseId: "gh-007", passed: true, latencyMs: 2306, inputTokens: 589, outputTokens: 49, cost: 0.000319, answer: "No, that will not work on the current API version, as the `merge_commit_sha` field has been removed." },
  { system: "workflow", caseId: "gh-013", passed: true, latencyMs: 3387, inputTokens: 601, outputTokens: 34, cost: 0.0003175, answer: "The `bundle` property has been removed from attestation list responses in API Version 2026-03-10." },
]

function formatCost(v: number): string {
  return `$${v.toFixed(4)}`
}

function formatTokens(v: number): string {
  if (v >= 1000) return `${(v / 1000).toFixed(1)}K`
  return v.toString()
}

export function AgentRaceDashboard({ raceTrigger = 0 }: { raceTrigger?: number }) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [dynamicData, setDynamicData] = useState<RaceRow[] | null>(null)

  useEffect(() => {
    fetch("http://localhost:8000/api/v1/benchmark/race/results")
      .then(res => res.json())
      .then(json => {
        if (json.success && json.data) {
          const allRows: RaceRow[] = [...json.data.agent, ...json.data.workflow]
          setDynamicData(allRows)
        }
      })
      .catch(() => {})
  }, [raceTrigger])

  const rows = dynamicData ?? RACE_DATA
  const agentRows = rows.filter(r => r.system === "agent")
  const wfRows = rows.filter(r => r.system === "workflow")

  const agentPassRate = agentRows.filter(r => r.passed).length / agentRows.length
  const wfPassRate = wfRows.filter(r => r.passed).length / wfRows.length
  const agentP50 = Math.round(agentRows.reduce((a, r) => a + r.latencyMs, 0) / agentRows.length)
  const wfP50 = Math.round(wfRows.reduce((a, r) => a + r.latencyMs, 0) / wfRows.length)
  const agentCostSuccess = agentRows.filter(r => r.passed).reduce((a, r) => a + r.cost, 0) / Math.max(agentRows.filter(r => r.passed).length, 1)
  const wfCostSuccess = wfRows.filter(r => r.passed).reduce((a, r) => a + r.cost, 0) / Math.max(wfRows.filter(r => r.passed).length, 1)
  const agentInputTokens = agentRows.reduce((a, r) => a + r.inputTokens, 0)
  const wfInputTokens = wfRows.reduce((a, r) => a + r.inputTokens, 0)
  const agentOutputTokens = agentRows.reduce((a, r) => a + r.outputTokens, 0)
  const wfOutputTokens = wfRows.reduce((a, r) => a + r.outputTokens, 0)

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { label: "Pass Rate", icon: Target, agent: `${(agentPassRate * 100).toFixed(0)}%`, wf: `${(wfPassRate * 100).toFixed(0)}%`, better: "wf" },
          { label: "p50 Latency", icon: Clock, agent: formatDuration(agentP50), wf: formatDuration(wfP50), better: "wf" },
          { label: "p99 Latency", icon: Clock, agent: formatDuration(Math.max(...agentRows.map(r => r.latencyMs))), wf: formatDuration(Math.max(...wfRows.map(r => r.latencyMs))), better: "wf" },
          { label: "Input Tokens", icon: Package, agent: formatTokens(agentInputTokens), wf: formatTokens(wfInputTokens), better: "wf" },
          { label: "Output Tokens", icon: Package, agent: formatTokens(agentOutputTokens), wf: formatTokens(wfOutputTokens), better: "wf" },
          { label: "Cost / Success", icon: DollarSign, agent: formatCost(agentCostSuccess), wf: formatCost(wfCostSuccess), better: "wf" },
        ].map((m, i) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04 * i }}
            className="rounded-xl border border-gray-100 bg-white/80 backdrop-blur p-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-gray-50 border border-gray-100">
                <m.icon className="h-5 w-5 text-gray-600" />
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">{m.label}</div>
                {m.better === "wf" && (
                  <Badge variant="secondary" className="text-[8px] bg-emerald-50 text-emerald-600 border-emerald-200 px-1 py-0">
                    <TrendingDown className="h-2 w-2 mr-0.5" /> Better
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <div className="text-sm font-bold text-gray-400">{m.agent}</div>
                <ArrowRight className="h-3 w-3 text-gray-300" />
                <div className="text-sm font-bold text-emerald-600">{m.wf}</div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white/80 backdrop-blur shadow-sm overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-3 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold tracking-tight text-gray-900">Question-by-Question Breakdown</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {RACE_QUESTIONS.length} questions · {agentRows.filter(r => r.passed).length + wfRows.filter(r => r.passed).length} / {RACE_QUESTIONS.length * 2} passed
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2 py-0.5">
              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
              <span className="text-[10px] font-medium text-emerald-700">Workflow</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg bg-gray-100 px-2 py-0.5">
              <XCircle className="h-3 w-3 text-gray-500" />
              <span className="text-[10px] font-medium text-gray-600">Agent</span>
            </div>
          </div>
        </div>
        <div className="divide-y divide-gray-100">
          {RACE_QUESTIONS.map((q, i) => {
            const agentRow = agentRows.find(r => r.caseId === q.id)!
            const wfRow = wfRows.find(r => r.caseId === q.id)!
            const agentFailed = !agentRow.passed
            const wfFailed = !wfRow.passed
            const expanded = expandedId === q.id

            return (
              <motion.div key={q.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.02 * i }}>
                <button
                  onClick={() => setExpandedId(expandedId === q.id ? null : q.id)}
                  className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-gray-50/50 transition-colors"
                >
                  <span className="w-5 text-[10px] font-mono text-gray-400 text-center">{i + 1}</span>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[10px] text-gray-400">{q.id}</span>
                      {q.requiresDeprecation ? (
                        <Badge variant="secondary" className="text-[9px] bg-amber-50 text-amber-700 border-amber-200">
                          <ShieldCheck className="h-2 w-2 mr-0.5" /> Deprecation
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[9px] bg-blue-50 text-blue-700 border-blue-200">
                          Straightforward
                        </Badge>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-gray-600 leading-snug line-clamp-1">{q.question}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-center">
                      <div className="text-[8px] text-gray-400 mb-0.5">Agent</div>
                      {agentFailed ? (
                        <XCircle className="h-4 w-4 text-red-500" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      )}
                    </div>
                    <div className="text-center">
                      <div className="text-[8px] text-gray-400 mb-0.5">WF</div>
                      {wfFailed ? (
                        <XCircle className="h-4 w-4 text-red-500" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      )}
                    </div>
                    <div className="text-right w-16">
                      <div className="text-[10px] font-mono text-gray-500">{formatDuration(agentRow.latencyMs)}</div>
                      <div className="text-[9px] text-gray-400">→ {formatDuration(wfRow.latencyMs)}</div>
                    </div>
                    {expanded ? (
                      <ChevronUp className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                    )}
                  </div>
                </button>

                <AnimatePresence>
                  {expanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-4 pl-14">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className={cn("rounded-lg border p-3", agentFailed ? "border-red-100 bg-red-50/50" : "border-emerald-100 bg-emerald-50/50")}>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-1.5 text-[10px] font-semibold" style={{ color: agentFailed ? "#dc2626" : "#059669" }}>
                                <Bot className="h-3 w-3" /> Agent
                              </div>
                              <div className="flex items-center gap-1 text-[9px] text-gray-400">
                                <Clock className="h-2.5 w-2.5" /> {formatDuration(agentRow.latencyMs)}
                                <span className="ml-1">·</span>
                                <Package className="h-2.5 w-2.5" /> {formatTokens(agentRow.inputTokens)} in / {formatTokens(agentRow.outputTokens)} out
                                <span className="ml-1">·</span>
                                <DollarSign className="h-2.5 w-2.5" /> {formatCost(agentRow.cost)}
                              </div>
                            </div>
                            {agentFailed ? (
                              <div>
                                <p className="text-[11px] font-medium text-red-700">FAIL</p>
                                <p className="text-[10px] text-red-500 mt-0.5">Missing exact keyword — answer correct, test strict</p>
                              </div>
                            ) : (
                              <p className="text-[11px] text-emerald-700">PASS</p>
                            )}
                            <p className="text-[10px] text-gray-600 mt-1.5 leading-relaxed line-clamp-2">{agentRow.answer}</p>
                          </div>
                          <div className={cn("rounded-lg border p-3", wfFailed ? "border-red-100 bg-red-50/50" : "border-emerald-100 bg-emerald-50/50")}>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-1.5 text-[10px] font-semibold" style={{ color: wfFailed ? "#dc2626" : "#059669" }}>
                                <Cog className="h-3 w-3" /> Workflow
                              </div>
                              <div className="flex items-center gap-1 text-[9px] text-gray-400">
                                <Clock className="h-2.5 w-2.5" /> {formatDuration(wfRow.latencyMs)}
                                <span className="ml-1">·</span>
                                <Package className="h-2.5 w-2.5" /> {formatTokens(wfRow.inputTokens)} in / {formatTokens(wfRow.outputTokens)} out
                                <span className="ml-1">·</span>
                                <DollarSign className="h-2.5 w-2.5" /> {formatCost(wfRow.cost)}
                              </div>
                            </div>
                            {wfFailed ? (
                              <div>
                                <p className="text-[11px] font-medium text-red-700">FAIL</p>
                                <p className="text-[10px] text-red-500 mt-0.5">Missing exact keyword — answer correct, test strict</p>
                              </div>
                            ) : (
                              <p className="text-[11px] text-emerald-700">PASS</p>
                            )}
                            <p className="text-[10px] text-gray-600 mt-1.5 leading-relaxed line-clamp-2">{wfRow.answer}</p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </div>
      </div>

    </div>
  )
}
