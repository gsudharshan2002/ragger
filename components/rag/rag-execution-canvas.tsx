"use client"

import { useEffect, useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Search,
  FileText,
  Blend,
  ArrowUpDown,
  Filter,
  Layers,
  MessageSquare,
  Sparkles,
  Check,
  X,
  Clock,
  Loader2,
  SkipForward,
  AlertCircle,
} from "lucide-react"
import type { RagEvent } from "@/lib/events"
import { getStageColor, getStageLabel, getStagesForStrategy } from "@/lib/events"
import type { RagStrategy, Chunk, StageStatus, RagTrace } from "@/lib/types"
import { cn, formatDuration } from "@/lib/utils"
import { ChunkCard } from "./chunk-card"

interface RagExecutionCanvasProps {
  events: RagEvent[]
  strategy: RagStrategy
  trace: RagTrace | null
  isExecuting: boolean
}

interface StageState {
  id: string
  status: StageStatus
  latencyMs: number
  chunks: Chunk[]
  config: Record<string, string | number>
  details: Record<string, unknown>
}

export function RagExecutionCanvas({ events, strategy, trace, isExecuting }: RagExecutionCanvasProps) {
  const stages = getStagesForStrategy(strategy)
  const [stageStates, setStageStates] = useState<Record<string, StageState>>({})
  const [currentStage, setCurrentStage] = useState<string | null>(null)
  const [llmAnswer, setLlmAnswer] = useState("")

  useEffect(() => {
    const initial: Record<string, StageState> = {}
    stages.forEach((s) => {
      initial[s] = {
        id: s,
        status: "idle",
        latencyMs: 0,
        chunks: [],
        config: {},
        details: {},
      }
    })
    setStageStates(initial)
    setCurrentStage(null)
    setLlmAnswer("")
  }, [strategy, events.length === 0])

  useEffect(() => {
    if (events.length === 0) return

    const latest = events[events.length - 1]
    const { type, data } = latest

    setStageStates((prev) => {
      const next = { ...prev }

      const defaultStage = (id: string): StageState => ({
        id,
        status: "idle",
        latencyMs: 0,
        chunks: [],
        config: {},
        details: {},
      })

      const ensureStage = (id: string) => {
        if (!next[id]) next[id] = defaultStage(id)
      }

      if (type === "query.started") {
        ensureStage("query")
        next["query"] = { ...next["query"], status: "running" }
        setCurrentStage("query")
      } else if (type === "query.processed") {
        ensureStage("query")
        next["query"] = { ...next["query"], status: "completed", latencyMs: data.latencyMs as number }
      } else if (type === "vector.started") {
        ensureStage("vector")
        next["vector"] = {
          ...next["vector"],
          status: "running",
          config: {
            "Embedding Model": (data.embeddingModel as string) || "local MiniLM",
            Dimensions: (data.dimensions as number) || "pending",
            "Top K": (data.topK as number) || "pending",
            Similarity: (data.similarity as string) || "cosine",
          },
        }
        setCurrentStage("vector")
      } else if (type === "vector.chunk.retrieved") {
        ensureStage("vector")
        const chunk = data.chunk as Chunk
        next["vector"] = { ...next["vector"], chunks: [...next["vector"].chunks, chunk] }
      } else if (type === "vector.completed") {
        ensureStage("vector")
        next["vector"] = { ...next["vector"], status: "completed", latencyMs: data.latencyMs as number }
      } else if (type === "bm25.started") {
        ensureStage("bm25")
        next["bm25"] = {
          ...next["bm25"],
          status: "running",
          config: {
            "Top K": (data.topK as number) || "pending",
            "Query Terms": Array.isArray(data.queryTerms)
              ? data.queryTerms.join(", ")
              : "pending",
          },
        }
        setCurrentStage("bm25")
      } else if (type === "bm25.chunk.retrieved") {
        ensureStage("bm25")
        const chunk = data.chunk as Chunk
        next["bm25"] = { ...next["bm25"], chunks: [...next["bm25"].chunks, chunk] }
      } else if (type === "bm25.completed") {
        ensureStage("bm25")
        next["bm25"] = { ...next["bm25"], status: "completed", latencyMs: data.latencyMs as number }
      } else if (type === "rrf.started") {
        ensureStage("rrf")
        next["rrf"] = { ...next["rrf"], status: "running" }
        setCurrentStage("rrf")
      } else if (type === "rrf.completed") {
        ensureStage("rrf")
        next["rrf"] = {
          ...next["rrf"],
          status: "completed",
          latencyMs: data.latencyMs as number,
          chunks: data.chunks as Chunk[],
        }
      } else if (type === "reranker.started") {
        ensureStage("reranker")
        next["reranker"] = {
          ...next["reranker"],
          status: "running",
          config: {
            Model: (data.model as string) || "local cross-encoder",
            Candidates: (data.candidates as number) || "pending",
            "Top N": (data.topN as number) || "pending",
          },
        }
        setCurrentStage("reranker")
      } else if (type === "rerank.updated") {
        ensureStage("reranker")
        const chunk = data.chunk as Chunk
        next["reranker"] = { ...next["reranker"], chunks: [...next["reranker"].chunks, chunk] }
      } else if (type === "reranker.completed") {
        ensureStage("reranker")
        next["reranker"] = {
          ...next["reranker"],
          status: "completed",
          latencyMs: data.latencyMs as number,
          details: { beforeChunks: data.beforeChunks, afterChunks: data.afterChunks },
        }
      } else if (type === "mmr.started") {
        ensureStage("mmr")
        next["mmr"] = {
          ...next["mmr"],
          status: "running",
          config: {
            Lambda: (data.lambda as number) ?? "pending",
            Candidates: (data.candidateCount as number) || "pending",
          },
        }
        setCurrentStage("mmr")
      } else if (type === "mmr.completed") {
        ensureStage("mmr")
        next["mmr"] = {
          ...next["mmr"],
          status: "completed",
          latencyMs: data.latencyMs as number,
          chunks: data.selectedChunks as Chunk[],
          details: { rejectedChunks: data.rejectedChunks },
        }
      } else if (type === "context.built") {
        ensureStage("context")
        next["context"] = {
          ...next["context"],
          status: "completed",
          latencyMs: data.latencyMs as number,
          chunks: (data.context as { chunks: Chunk[] }).chunks,
          config: {
            Chunks: (data.context as { chunkCount: number }).chunkCount,
            Documents: (data.context as { documentCount: number }).documentCount,
            "Total Tokens": (data.context as { totalTokens: number }).totalTokens,
          },
        }
        setCurrentStage("context")
      } else if (type === "prompt.built") {
        ensureStage("prompt")
        next["prompt"] = {
          ...next["prompt"],
          status: "completed",
          latencyMs: data.latencyMs as number,
          details: data.prompt as Record<string, unknown>,
        }
        setCurrentStage("prompt")
      } else if (type === "llm.started") {
        ensureStage("llm")
        next["llm"] = {
          ...next["llm"],
          status: "running",
          config: {
            Model: data.model as string,
            Temperature: data.temperature as number,
            "Max Tokens": data.maxTokens as number,
          },
        }
        setCurrentStage("llm")
      } else if (type === "llm.token.generated") {
        setLlmAnswer((prev) => prev + (data.token as string))
      } else if (type === "llm.completed") {
        ensureStage("llm")
        next["llm"] = {
          ...next["llm"],
          status: "completed",
          latencyMs: data.latencyMs as number,
          details: data.llm as Record<string, unknown>,
        }
        setCurrentStage(null)
      }

      return next
    })
  }, [events])

  if (events.length === 0 && !isExecuting) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="px-4 py-3"
    >
      <div className="max-w-3xl mx-auto space-y-3">
        <div className="flex items-center gap-2 px-1">
          {isExecuting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
          ) : (
            <Check className="w-3.5 h-3.5 text-emerald-500" />
          )}
          <span className="text-[11px] font-medium text-gray-500">
            {isExecuting ? "Executing RAG pipeline..." : "Pipeline complete"}
          </span>
        </div>

        <div className="space-y-2">
          {stages.map((stageId) => {
            const state = stageStates[stageId]
            if (!state) return null
            if (state.status === "idle" && events.length === 0) return null

            return (
              <PipelineStage
                key={stageId}
                stageId={stageId}
                state={state}
                isCurrent={currentStage === stageId}
              />
            )
          })}
        </div>
      </div>
    </motion.div>
  )
}

function PipelineStage({
  stageId,
  state,
  isCurrent,
}: {
  stageId: string
  state: StageState
  isCurrent: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const color = getStageColor(stageId)
  const label = getStageLabel(stageId)

  const hasContent = (state.chunks?.length ?? 0) > 0 || Object.keys(state.details ?? {}).length > 0 || Object.keys(state.config ?? {}).length > 0
  const canExpand = state.status !== "idle" && hasContent

  const statusIcon = useMemo(() => {
    switch (state.status) {
      case "running":
        return <Loader2 className="w-3 h-3 animate-spin" style={{ color }} />
      case "completed":
        return <Check className="w-3 h-3" style={{ color }} />
      case "error":
        return <AlertCircle className="w-3 h-3 text-red-500" />
      case "skipped":
        return <SkipForward className="w-3 h-3 text-gray-400" />
      default:
        return <div className="w-3 h-3 rounded-full border-2 border-gray-200" />
    }
  }, [state.status, color])

  if (state.status === "idle") return null

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "rounded-xl border transition-all",
        state.status === "running" && `shadow-[0_0_20px_-4px_${color}30]`,
        state.status === "completed" && "bg-white border-black/[0.04] shadow-sm",
        state.status === "running" && "bg-white border-black/[0.06] shadow-md",
        state.status === "error" && "bg-red-50/50 border-red-200/50",
        state.status === "skipped" && "bg-gray-50/50 border-gray-200/50 opacity-50"
      )}
    >
      <button
        onClick={() => canExpand && setExpanded(!expanded)}
        className={cn(
          "flex items-center gap-3 w-full px-4 py-3 text-left",
          canExpand && "cursor-pointer hover:bg-gray-50/50 rounded-xl transition-colors"
        )}
      >
        <div
          className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${color}10` }}
        >
          {getStageIcon(stageId, color)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-800">{label}</span>
            {statusIcon}
          </div>
          {Object.keys(state.config).length > 0 && state.status === "completed" && (
            <div className="flex items-center gap-2 mt-0.5">
              {Object.entries(state.config).slice(0, 3).map(([key, val]) => (
                <span key={key} className="text-[10px] text-gray-400">
                  {key}: <span className="text-gray-600 font-medium">{String(val)}</span>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {state.latencyMs > 0 && (
            <span className="text-[10px] font-mono text-gray-400">
              {formatDuration(state.latencyMs)}
            </span>
          )}
          {state.chunks.length > 0 && (
            <span className="text-[10px] font-medium text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
              {state.chunks.length}
            </span>
          )}
          {canExpand && (
            <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <svg className="w-3.5 h-3.5 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </motion.div>
          )}
        </div>
      </button>

      <AnimatePresence>
        {expanded && hasContent && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 border-t border-black/[0.04]">
              {Object.keys(state.config).length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
                  {Object.entries(state.config).map(([key, val]) => (
                    <div key={key} className="px-3 py-2 rounded-lg bg-gray-50/80">
                      <div className="text-[10px] text-gray-400 mb-0.5">{key}</div>
                      <div className="text-xs font-medium text-gray-700">{String(val)}</div>
                    </div>
                  ))}
                </div>
              )}

              {state.chunks.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                    Retrieved Chunks
                  </div>
                  <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
                    {state.chunks.slice(0, 10).map((chunk) => (
                      <ChunkCard key={chunk.id} chunk={chunk} stage={stageId} color={color} />
                    ))}
                    {state.chunks.length > 10 && (
                      <div className="text-[10px] text-gray-400 text-center py-1">
                        +{state.chunks.length - 10} more chunks
                      </div>
                    )}
                  </div>
                </div>
              )}

              {stageId === "rrf" && state.details && "mergedChunks" in state.details && (
                <RrfVisualization chunks={state.chunks} />
              )}

              {stageId === "reranker" && state.details && "beforeChunks" in state.details && (
                <RerankerVisualization
                  beforeChunks={state.details.beforeChunks as Chunk[]}
                  afterChunks={state.chunks}
                />
              )}

              {stageId === "mmr" && state.details && "rejectedChunks" in state.details && (
                <MmrVisualization
                  selected={state.chunks}
                  rejected={state.details.rejectedChunks as Chunk[]}
                />
              )}

              {stageId === "context" && state.chunks.length > 0 && (
                <ContextVisualization chunks={state.chunks} />
              )}

              {stageId === "prompt" && state.details && (
                <PromptVisualization prompt={state.details as Record<string, unknown>} />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function getStageIcon(stageId: string, color: string) {
  const iconClass = "w-3.5 h-3.5"
  switch (stageId) {
    case "query": return <Search className={iconClass} style={{ color }} />
    case "vector": return <Search className={iconClass} style={{ color }} />
    case "bm25": return <FileText className={iconClass} style={{ color }} />
    case "rrf": return <Blend className={iconClass} style={{ color }} />
    case "reranker": return <ArrowUpDown className={iconClass} style={{ color }} />
    case "mmr": return <Filter className={iconClass} style={{ color }} />
    case "context": return <Layers className={iconClass} style={{ color }} />
    case "prompt": return <MessageSquare className={iconClass} style={{ color }} />
    case "llm": return <Sparkles className={iconClass} style={{ color }} />
    default: return <div className={cn("w-3.5 h-3.5 rounded-full", `bg-[${color}]`)} />
  }
}

function RrfVisualization({ chunks }: { chunks: Chunk[] }) {
  return (
    <div className="mt-3">
      <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-2">
        RRF Ranking
      </div>
      <div className="space-y-1">
        {chunks.slice(0, 8).map((chunk, i) => (
          <div key={chunk.id} className="flex items-center gap-2 text-[11px]">
            <span className="w-4 text-right font-mono text-gray-400">{i + 1}</span>
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(20, ((chunk.rrfScore || 0) / 0.04) * 100)}%` }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
                className="h-full rounded-full bg-purple-400/60"
              />
            </div>
            <span className="font-mono text-gray-500 w-16 text-right">{chunk.rrfScore?.toFixed(4)}</span>
            <span className="text-gray-400 w-20 truncate">{chunk.id}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function RerankerVisualization({ beforeChunks, afterChunks }: { beforeChunks: Chunk[]; afterChunks: Chunk[] }) {
  return (
    <div className="mt-3">
      <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-2">
        Reranking Results
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <div className="text-[10px] text-gray-400 mb-1">Before</div>
          <div className="space-y-0.5">
            {beforeChunks.slice(0, 6).map((c) => (
              <div key={c.id} className="flex items-center gap-1.5 text-[10px] text-gray-500">
                <span className="font-mono text-gray-400 w-3">{c.rank}</span>
                <span className="text-gray-400">{c.id}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-gray-400 mb-1">After</div>
          <div className="space-y-0.5">
            {afterChunks.slice(0, 6).map((c) => (
              <div key={c.id} className="flex items-center gap-1.5 text-[10px]">
                <span className="font-mono w-3" style={{ color: getStageColor("reranker") }}>{c.rank}</span>
                <span className="text-gray-600">{c.id}</span>
                {c.rerankScore && (
                  <span className="font-mono text-purple-400 ml-auto">{c.rerankScore.toFixed(3)}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function MmrVisualization({ selected, rejected }: { selected: Chunk[]; rejected: Chunk[] }) {
  return (
    <div className="mt-3">
      <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-2">
        MMR Selection
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <div className="text-[10px] text-emerald-500 font-medium mb-1">Selected ({selected.length})</div>
          <div className="space-y-0.5">
            {selected.map((c) => (
              <div key={c.id} className="flex items-center gap-1.5 text-[10px] text-emerald-600">
                <Check className="w-2.5 h-2.5" />
                <span>{c.id}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-gray-400 font-medium mb-1">Rejected ({rejected.length})</div>
          <div className="space-y-0.5">
            {rejected.map((c) => (
              <div key={c.id} className="flex items-center gap-1.5 text-[10px] text-gray-400 line-through">
                <X className="w-2.5 h-2.5" />
                <span>{c.id}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function ContextVisualization({ chunks }: { chunks: Chunk[] }) {
  const [expandedChunk, setExpandedChunk] = useState<string | null>(null)
  const docs = new Set(chunks.map((c) => c.document))
  const totalTokens = chunks.reduce((sum, c) => sum + c.tokens, 0)

  return (
    <div className="mt-3">
      <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-2">
        Final Context
      </div>
      <div className="flex items-center gap-3 mb-2">
        <span className="text-[10px] text-gray-500">{chunks.length} chunks</span>
        <span className="text-[10px] text-gray-300">·</span>
        <span className="text-[10px] text-gray-500">{docs.size} documents</span>
        <span className="text-[10px] text-gray-300">·</span>
        <span className="text-[10px] text-gray-500">{totalTokens.toLocaleString()} tokens</span>
      </div>
      <div className="space-y-1 max-h-48 overflow-y-auto">
        {chunks.map((chunk) => (
          <button
            key={chunk.id}
            onClick={() => setExpandedChunk(expandedChunk === chunk.id ? null : chunk.id)}
            className="w-full text-left px-3 py-2 rounded-lg bg-gray-50/80 hover:bg-gray-100/80 transition-colors"
          >
            <div className="flex items-center gap-2 text-[10px]">
              <span className="font-mono text-emerald-500">#{chunk.rank}</span>
              <span className="font-medium text-gray-600">{chunk.document}</span>
              <span className="text-gray-400">p.{chunk.page}</span>
              <span className="text-gray-400">·</span>
              <span className="text-gray-400">{chunk.section}</span>
              <span className="ml-auto font-mono text-gray-400">{chunk.id}</span>
            </div>
            {expandedChunk === chunk.id && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mt-2 text-[11px] text-gray-600 leading-relaxed border-t border-gray-200/50 pt-2"
              >
                {chunk.content}
              </motion.div>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

function PromptVisualization({ prompt }: { prompt: Record<string, unknown> }) {
  const [tab, setTab] = useState<"system" | "context" | "user">("system")

  return (
    <div className="mt-3">
      <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-2">
        Prompt Construction
      </div>
      <div className="flex items-center gap-1 mb-2">
        {(["system", "context", "user"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors",
              tab === t ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            )}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      <div className="bg-gray-50 rounded-lg p-3 text-[11px] text-gray-600 leading-relaxed font-mono max-h-32 overflow-y-auto">
        {String(prompt[tab] ?? "")}
      </div>
      <div className="flex items-center gap-3 mt-2">
        <span className="text-[10px] text-gray-400">System: {String(prompt.systemTokens ?? "")} tokens</span>
        <span className="text-[10px] text-gray-400">Context: {String(prompt.contextTokens ?? "")} tokens</span>
        <span className="text-[10px] text-gray-400">User: {String(prompt.userTokens ?? "")} tokens</span>
        <span className="text-[10px] font-medium text-gray-500">Total: {String(prompt.totalTokens ?? "")} tokens</span>
      </div>
    </div>
  )
}
