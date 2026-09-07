"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown, ChevronRight, Search, Sparkles, Flag, Loader2, AlertCircle, FileText } from "lucide-react"
import type { AgentStep, AgentTool } from "@/lib/types"
import { cn, formatDuration } from "@/lib/utils"

interface StepsPanelProps {
  steps: AgentStep[]
  isExecuting: boolean
}

const TOOL_ICON: Record<AgentTool, typeof Search> = {
  retrieve: Search,
  answer: Sparkles,
  finish: Flag,
}

const TOOL_LABEL: Record<AgentTool, string> = {
  retrieve: "Retrieve",
  answer: "Answer",
  finish: "Finish",
}

function StepCard({ step }: { step: AgentStep }) {
  const [expanded, setExpanded] = useState(false)
  const Icon = TOOL_ICON[step.action.tool] ?? Search
  const hasError = Boolean(step.observation?.error)
  const chunks = (step.observation?.output?.chunks ?? []) as {
    document: string
    page: number
    section?: string
    excerpt: string
  }[]
  const isRetrieveHit = step.action.tool === "retrieve" && chunks.length > 0

  return (
    <div
      className={cn(
        "rounded-xl border bg-white shadow-sm overflow-hidden transition-colors",
        hasError ? "border-red-200" : isRetrieveHit ? "border-emerald-200" : "border-black/[0.06]"
      )}
    >
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-gray-50/70 transition-colors"
      >
        {expanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-gray-300 shrink-0" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-gray-300 shrink-0" />
        )}

        <span className="shrink-0 w-5 h-5 rounded-full bg-gray-900 text-white text-[10px] font-semibold flex items-center justify-center">
          {step.stepNumber}
        </span>

        <span
          className={cn(
            "shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium",
            hasError
              ? "bg-red-50 text-red-600"
              : isRetrieveHit
                ? "bg-emerald-50 text-emerald-700"
                : "bg-gray-100 text-gray-600"
          )}
        >
          <Icon className="w-3 h-3" />
          {TOOL_LABEL[step.action.tool] ?? step.action.tool}
        </span>

        <span className="flex-1 min-w-0 truncate text-xs text-gray-500">{step.reason}</span>

        <span className="shrink-0 text-[10px] text-gray-300 font-mono">{formatDuration(step.latencyMs)}</span>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pt-1 space-y-2.5 border-t border-black/[0.04]">
              <div>
                <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1">Thought</div>
                <p className="text-xs text-gray-700 leading-relaxed">{step.reason}</p>
              </div>

              {Object.keys(step.action.inputs ?? {}).length > 0 && (
                <div>
                  <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1">Action inputs</div>
                  <pre className="text-[11px] text-gray-600 bg-gray-50 rounded-lg px-2.5 py-1.5 overflow-x-auto">
                    {JSON.stringify(step.action.inputs, null, 2)}
                  </pre>
                </div>
              )}

              {hasError && (
                <div className="flex items-start gap-1.5 text-xs text-red-600 bg-red-50 rounded-lg px-2.5 py-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{step.observation?.error}</span>
                </div>
              )}

              {step.action.tool === "retrieve" && (
                <div>
                  <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1">
                    Retrieved chunks ({chunks.length})
                  </div>
                  {chunks.length === 0 ? (
                    <p className="text-xs text-gray-400">No relevant chunks found.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {chunks.map((c, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-2 rounded-lg border border-emerald-100 bg-emerald-50/50 px-2.5 py-1.5"
                        >
                          <FileText className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <div className="text-[11px] font-medium text-gray-700 truncate">
                              {c.document} — page {c.page}
                              {c.section ? ` · ${c.section}` : ""}
                            </div>
                            <p className="text-[11px] text-gray-500 line-clamp-2">{c.excerpt}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {step.action.tool === "answer" && (
                <div>
                  <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1">Answer</div>
                  <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {step.observation?.output?.answer ?? ""}
                  </p>
                </div>
              )}

              {step.action.tool === "finish" && step.observation?.output?.message && (
                <div>
                  <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1">Note</div>
                  <p className="text-xs text-gray-700">{step.observation.output.message}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function StepsPanel({ steps, isExecuting }: StepsPanelProps) {
  if (steps.length === 0 && !isExecuting) {
    return null
  }

  return (
    <div className="rounded-2xl bg-gray-50/60 border border-black/[0.04] p-3 space-y-2">
      <div className="flex items-center gap-2 px-1">
        <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Agent steps</span>
        {isExecuting && (
          <span className="flex items-center gap-1 text-[11px] text-gray-400">
            <Loader2 className="w-3 h-3 animate-spin" />
            working...
          </span>
        )}
      </div>

      {steps.length === 0 && isExecuting ? (
        <div className="flex items-center gap-2 px-2 py-3 text-xs text-gray-400">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Reasoning about the first step...
        </div>
      ) : (
        <div className="space-y-1.5">
          {steps.map((step) => (
            <StepCard key={step.stepNumber} step={step} />
          ))}
        </div>
      )}
    </div>
  )
}
