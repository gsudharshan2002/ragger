"use client"

import { useEffect, useState, useMemo, useRef } from "react"
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
  // How many of `events` have already been folded into stageStates - lets
  // the effect below process every new event since the last run, not just
  // events[events.length - 1]. The caller batches multiple bus events into
  // one setEvents() call to cut re-renders, so more than one new event can
  // land between effect runs; reading only the last one silently drops the
  // rest (e.g. vector.chunk.retrieved / bm25.chunk.retrieved events).
  const processedCountRef = useRef(0)

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
    processedCountRef.current = 0
  }, [strategy, events.length === 0])

  useEffect(() => {
    if (events.length === 0) return

    // Process every event since the last run, not just the latest one -
    // the producer batches several bus events into one setEvents() call to
    // cut re-renders, so more than one new event can land between runs.
    const newEvents = events.slice(processedCountRef.current)
    processedCountRef.current = events.length
    if (newEvents.length === 0) return

    let currentStageChanged = false
    let nextCurrentStage: string | null = null
    let llmAnswerDelta = ""

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

      const recordCurrentStage = (stage: string | null) => {
        currentStageChanged = true
        nextCurrentStage = stage
      }

      // Builds a minimal Chunk from a per-item retrieval/update event.
      // These events (verified against rag_engine.py's actual emit calls)
      // send flat stub fields - chunk_id/rank/score/document/page at most,
      // sometimes less - never a full chunk with content/section/tokens.
      // That richer data only ever arrives later via the final trace, so
      // live cards during vector/bm25/rrf/reranker/mmr stages necessarily
      // show only what's actually streamed: id, rank, score, and
      // document/page where the backend happens to include them.
      const buildChunkStub = (raw: Record<string, unknown>, method: Chunk["method"]): Chunk => ({
        id: (raw.chunk_id as string) ?? "",
        rank: (raw.rank as number) ?? 0,
        score: (raw.score as number) ?? (raw.rrf_score as number) ?? (raw.rerank_score as number) ?? (raw.mmr_score as number) ?? 0,
        document: (raw.document as string) ?? "",
        page: (raw.page as number) ?? 0,
        section: "",
        tokens: 0,
        content: "",
        method,
      })

      for (const { type, data } of newEvents) {
      if (type === "query.started") {
        ensureStage("query")
        next["query"] = { ...next["query"], status: "running" }
        recordCurrentStage("query")
      } else if (type === "query.processed") {
        // Backend sends chunk_count only - no latency for this event.
        ensureStage("query")
        next["query"] = { ...next["query"], status: "completed" }
      } else if (type === "vector.started") {
        ensureStage("vector")
        next["vector"] = {
          ...next["vector"],
          status: "running",
          config: {
            "Embedding Model": (data.embedding_model as string) || "local MiniLM",
            Dimensions: (data.dimensions as number) || "pending",
            "Top K": (data.top_k as number) || "pending",
            Similarity: (data.similarity as string) || "cosine",
          },
        }
        recordCurrentStage("vector")
      } else if (type === "vector.chunk.retrieved") {
        ensureStage("vector")
        const chunk = buildChunkStub(data, "vector")
        next["vector"] = { ...next["vector"], chunks: [...next["vector"].chunks, chunk] }
      } else if (type === "vector.completed") {
        // Backend sends result_count only - no latency for this event.
        ensureStage("vector")
        next["vector"] = { ...next["vector"], status: "completed" }
      } else if (type === "bm25.started") {
        ensureStage("bm25")
        next["bm25"] = {
          ...next["bm25"],
          status: "running",
          config: {
            "Top K": (data.top_k as number) || "pending",
            "Query Terms": Array.isArray(data.query_terms)
              ? (data.query_terms as string[]).join(", ")
              : "pending",
          },
        }
        recordCurrentStage("bm25")
      } else if (type === "bm25.chunk.retrieved") {
        ensureStage("bm25")
        const chunk = buildChunkStub(data, "bm25")
        next["bm25"] = { ...next["bm25"], chunks: [...next["bm25"].chunks, chunk] }
      } else if (type === "bm25.completed") {
        // Backend sends result_count only - no latency for this event.
        ensureStage("bm25")
        next["bm25"] = { ...next["bm25"], status: "completed" }
      } else if (type === "rrf.started") {
        ensureStage("rrf")
        next["rrf"] = { ...next["rrf"], status: "running" }
        recordCurrentStage("rrf")
      } else if (type === "rrf.result.retrieved") {
        // Real event name is "rrf.result.retrieved", not "rrf.chunk.retrieved".
        ensureStage("rrf")
        const chunk = buildChunkStub(data, "rrf")
        next["rrf"] = { ...next["rrf"], chunks: [...next["rrf"].chunks, chunk] }
      } else if (type === "rrf.completed") {
        // Backend sends result_count only, not a chunks array - the fused
        // chunks list is whatever accumulated from rrf.result.retrieved above.
        ensureStage("rrf")
        next["rrf"] = { ...next["rrf"], status: "completed" }
      } else if (type === "reranker.started") {
        ensureStage("reranker")
        next["reranker"] = {
          ...next["reranker"],
          status: "running",
          config: {
            Model: (data.model as string) || "local cross-encoder",
            Candidates: (data.candidates as number) || "pending",
            "Top N": (data.top_n as number) || "pending",
          },
        }
        recordCurrentStage("reranker")
      } else if (type === "rerank.score.updated") {
        // Real event name is "rerank.score.updated", not "rerank.updated" -
        // that name never matched anything the backend actually emits.
        ensureStage("reranker")
        const chunk = buildChunkStub(data, "reranker")
        next["reranker"] = { ...next["reranker"], chunks: [...next["reranker"].chunks, chunk] }
      } else if (type === "reranker.completed") {
        // Backend sends result_count only - beforeChunks/afterChunks were
        // never actually sent. "Before" is whatever RRF fused (or vector's
        // results, if RRF didn't run); "after" is what accumulated above.
        ensureStage("reranker")
        next["reranker"] = {
          ...next["reranker"],
          status: "completed",
          details: {
            beforeChunks: next["rrf"]?.chunks ?? next["vector"]?.chunks ?? [],
            afterChunks: next["reranker"].chunks,
          },
        }
      } else if (type === "mmr.started") {
        ensureStage("mmr")
        next["mmr"] = {
          ...next["mmr"],
          status: "running",
          config: {
            Lambda: (data.lambda as number) ?? "pending",
            Candidates: (data.candidate_count as number) || "pending",
          },
        }
        recordCurrentStage("mmr")
      } else if (type === "mmr.selection.updated") {
        // Only fires for chunks MMR actually selected - the backend never
        // reports rejected chunks individually, only a rejected_count.
        ensureStage("mmr")
        const chunk = { ...buildChunkStub(data, "mmr"), selected: true }
        next["mmr"] = { ...next["mmr"], chunks: [...next["mmr"].chunks, chunk] }
      } else if (type === "mmr.completed") {
        // Backend sends selected_count/rejected_count, not chunk arrays -
        // selected chunks are whatever accumulated from
        // mmr.selection.updated above; rejected chunks were never sent at
        // all (only the count), so that list is honestly empty, not guessed.
        ensureStage("mmr")
        next["mmr"] = {
          ...next["mmr"],
          status: "completed",
          config: {
            ...next["mmr"].config,
            Selected: (data.selected_count as number) ?? next["mmr"].chunks.length,
            Rejected: (data.rejected_count as number) ?? 0,
          },
          details: { rejectedChunks: [] },
        }
      } else if (type === "context.built") {
        // Backend sends chunk_count/document_count/total_tokens as
        // top-level snake_case fields on `data` directly (rag_engine.py's
        // context.built emit) - there is no nested "context" object and no
        // per-chunk detail in this event at all, despite what this code
        // used to assume.
        ensureStage("context")
        next["context"] = {
          ...next["context"],
          status: "completed",
          latencyMs: data.latencyMs as number,
          chunks: next["context"]?.chunks ?? [],
          config: {
            Chunks: (data.chunk_count as number) ?? (data.chunkCount as number) ?? 0,
            Documents: (data.document_count as number) ?? (data.documentCount as number) ?? 0,
            "Total Tokens": (data.total_tokens as number) ?? (data.totalTokens as number) ?? 0,
          },
        }
        recordCurrentStage("context")
      } else if (type === "prompt.built") {
        // Backend sends system_tokens/context_tokens/user_tokens/total_tokens
        // as flat top-level fields - there is no nested "prompt" object.
        ensureStage("prompt")
        next["prompt"] = {
          ...next["prompt"],
          status: "completed",
          details: {
            systemTokens: data.system_tokens,
            contextTokens: data.context_tokens,
            userTokens: data.user_tokens,
            totalTokens: data.total_tokens,
          },
        }
        recordCurrentStage("prompt")
      } else if (type === "llm.started") {
        ensureStage("llm")
        next["llm"] = {
          ...next["llm"],
          status: "running",
          config: {
            Model: data.model as string,
            Temperature: data.temperature as number,
            "Max Tokens": data.max_tokens as number,
          },
        }
        recordCurrentStage("llm")
      } else if (type === "llm.token.generated" || type === "llm.token") {
        // Note: use-rag.tsx's event collector filters llm.token events out
        // of the array this component receives, so this branch does not
        // currently fire in practice - kept for whichever event name
        // eventually reaches here if that filtering ever changes.
        llmAnswerDelta += (data.content as string) ?? (data.token as string) ?? ""
      } else if (type === "llm.completed") {
        // Backend sends model/latency_ms/status/error as flat top-level
        // fields - there is no nested "llm" object.
        ensureStage("llm")
        next["llm"] = {
          ...next["llm"],
          status: "completed",
          latencyMs: data.latency_ms as number,
          details: { model: data.model, status: data.status, error: data.error },
        }
        recordCurrentStage(null)
      } else if (type === "trace.failed" || type === "error") {
        // Mark any stage still "running" as errored instead of leaving it
        // stuck that way forever - nothing else is coming to complete it.
        for (const id of Object.keys(next)) {
          if (next[id].status === "running") {
            next[id] = { ...next[id], status: "error" }
          }
        }
        recordCurrentStage(null)
      }
      }

      return next
    })

    if (currentStageChanged) setCurrentStage(nextCurrentStage)
    if (llmAnswerDelta) setLlmAnswer((prev) => prev + llmAnswerDelta)
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
          {(state.chunks?.length ?? 0) > 0 && (
            <span className="text-[10px] font-medium text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
              {(state.chunks?.length ?? 0)}
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

              {(state.chunks?.length ?? 0) > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                    Retrieved Chunks
                  </div>
                  <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
                    {state.chunks.slice(0, 10).map((chunk) => (
                      <ChunkCard key={chunk.id} chunk={chunk} stage={stageId} color={color} />
                    ))}
                    {(state.chunks?.length ?? 0) > 10 && (
                      <div className="text-[10px] text-gray-400 text-center py-1">
                        +{(state.chunks?.length ?? 0) - 10} more chunks
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

              {stageId === "context" && (state.chunks?.length ?? 0) > 0 && (
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
    default: return <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: color }} />
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
