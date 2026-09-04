import type {
  RagStrategy,
  Chunk,
  VectorSearchInfo,
  BM25Info,
  RRFInfo,
  RerankerInfo,
  MMRInfo,
  ContextInfo,
  PromptInfo,
  LLMInfo,
  TraceOverview,
  RagTrace,
  StageStatus,
} from "./types"

export type RagEventType =
  | "query.started"
  | "query.processed"
  | "vector.started"
  | "vector.chunk.retrieved"
  | "vector.completed"
  | "bm25.started"
  | "bm25.chunk.retrieved"
  | "bm25.completed"
  | "rrf.started"
  | "rrf.result.retrieved"
  | "rrf.completed"
  | "reranker.started"
  | "rerank.score.updated"
  | "reranker.completed"
  | "mmr.started"
  | "mmr.selection.updated"
  | "mmr.completed"
  | "context.built"
  | "prompt.built"
  | "llm.started"
  | "llm.token"
  | "llm.token.generated"
  | "llm.done"
  | "llm.completed"
  | "kb.scope"
  | "trace.completed"
  | "trace.failed"
  | "error"

export interface RagEvent {
  type: RagEventType
  timestamp: number
  data: Record<string, unknown>
}

export interface RagEventListener {
  (event: RagEvent): void
}

export class RagEventBus {
  private listeners: RagEventListener[] = []

  subscribe(listener: RagEventListener): () => void {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener)
    }
  }

  emit(event: RagEvent): void {
    // Emit asynchronously to avoid state updates during synchronous execution
    queueMicrotask(() => {
      this.listeners.forEach((l) => l(event))
    })
  }

  clear(): void {
    this.listeners = []
  }
}

export function createEventBus(): RagEventBus {
  return new RagEventBus()
}

export function getStagesForStrategy(strategy: RagStrategy): string[] {
  const stages: string[] = ["query"]
  if (strategy === "vector" || strategy === "hybrid" || strategy === "hybrid-rrf" || strategy === "hybrid-rerank" || strategy === "hybrid-rerank-mmr") {
    stages.push("vector")
  }
  if (strategy === "bm25" || strategy === "hybrid" || strategy === "hybrid-rrf" || strategy === "hybrid-rerank" || strategy === "hybrid-rerank-mmr") {
    stages.push("bm25")
  }
  if (strategy === "hybrid-rrf" || strategy === "hybrid-rerank-mmr") {
    stages.push("rrf")
  }
  if (strategy === "hybrid-rerank" || strategy === "hybrid-rerank-mmr") {
    stages.push("reranker")
  }
  if (strategy === "hybrid-rerank-mmr") {
    stages.push("mmr")
  }
  stages.push("context", "prompt", "llm")
  return stages
}

export function getStageColor(stage: string): string {
  switch (stage) {
    case "query": return "#3b82f6"
    case "vector": return "#6366f1"
    case "bm25": return "#f59e0b"
    case "rrf": return "#8b5cf6"
    case "reranker": return "#a855f7"
    case "mmr": return "#ec4899"
    case "context": return "#10b981"
    case "prompt": return "#3b82f6"
    case "llm": return "#06b6d4"
    default: return "#94a3b8"
  }
}

export function getStageLabel(stage: string): string {
  switch (stage) {
    case "query": return "Query Processing"
    case "vector": return "Vector Search"
    case "bm25": return "BM25"
    case "rrf": return "Reciprocal Rank Fusion"
    case "reranker": return "Cross-Encoder Reranking"
    case "mmr": return "MMR Selection"
    case "context": return "Context Building"
    case "prompt": return "Prompt Construction"
    case "llm": return "LLM Generation"
    default: return stage
  }
}

export function getStagePulseClass(stage: string): string {
  switch (stage) {
    case "vector": return "animate-stage-pulse-vector"
    case "bm25": return "animate-stage-pulse-bm25"
    case "rrf": return "animate-stage-pulse-rrf"
    case "reranker": return "animate-stage-pulse-reranker"
    case "mmr": return "animate-stage-pulse-mmr"
    case "context": return "animate-stage-pulse-context"
    case "prompt": return "animate-stage-pulse-prompt"
    case "llm": return "animate-stage-pulse-llm"
    default: return ""
  }
}
