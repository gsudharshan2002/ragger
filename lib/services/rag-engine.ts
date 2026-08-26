import { getSettings } from "./settings"
import { getAllChunks, getAllDocuments } from "./document-service"
import { isEmbeddingConfigured, generateQueryEmbedding } from "./embedding-service"
import { vectorSearch } from "./vector-search"
import { bm25Search } from "./bm25"
import { rrfFusion } from "./rrf"
import { rerankChunks, isRerankerConfigured } from "./reranker"
import { mmrSelection } from "./mmr"
import { buildPrompt } from "./prompt-builder"
import { isGroqConfigured, generateCompletionStream } from "./groq-service"
import { createTraceId, createRunId, saveTrace, createTraceEvent } from "./trace-service"
import type {
  RagStrategy,
  RagEngineConfig,
  FullTrace,
  TraceEvent,
  StoredChunk,
  FinalContextChunk,
  VectorResult,
  BM25Result,
  RRFResult,
  RerankResult,
  MMRResult,
} from "@/lib/types"
import type { RagEventType } from "@/lib/events"
import { generateId } from "@/lib/utils"

// ============================================================
// Yield event types
// ============================================================

interface RagEngineYieldEvent {
  type: RagEventType
  timestamp: string
  data: Record<string, unknown>
}

interface LlmTokenYieldEvent {
  type: "llm.token"
  content: string
}

interface LlmDoneYieldEvent {
  type: "llm.done"
  data: Record<string, unknown>
}

interface ErrorYieldEvent {
  type: "error"
  error: string
}

type RagEngineYield =
  | RagEngineYieldEvent
  | LlmTokenYieldEvent
  | LlmDoneYieldEvent
  | ErrorYieldEvent

// ============================================================
// Helper: build a RagEngineConfig from settings + strategy
// ============================================================

export async function getDefaultRagConfig(
  strategy: RagStrategy
): Promise<RagEngineConfig> {
  const settings = await getSettings()

  return {
    strategy,
    vector: {
      embeddingModel: settings.embeddingModel,
      topK: settings.defaultTopK,
      similarity: "cosine",
      similarityThreshold: 0.0,
    },
    bm25: {
      topK: settings.defaultTopK,
      language: "english",
      tokenizer: "standard",
    },
    rrf: {
      k: 60,
      vectorWeight: 1.0,
      bm25Weight: 1.0,
    },
    reranker: {
      enabled: false,
      model: settings.rerankerModel || undefined,
      candidateCount: settings.defaultTopK,
      topN: 10,
    },
    mmr: {
      enabled: false,
      lambda: settings.mmrLambda,
      candidateCount: settings.defaultTopK,
      finalCount: 10,
    },
    llm: {
      model: settings.groqModel,
      temperature: 0.3,
      maxTokens: 2048,
      systemPrompt: settings.systemPrompt,
    },
    chunking: {
      chunkSize: settings.chunkSize,
      chunkOverlap: settings.chunkOverlap,
      method: "token",
    },
  }
}

// ============================================================
// Helpers: adapt strategy to enable/disable stages
// ============================================================

function shouldRunVector(strategy: RagStrategy): boolean {
  return strategy === "vector" || strategy === "hybrid" || strategy === "hybrid-rrf" || strategy === "hybrid-rerank" || strategy === "hybrid-rerank-mmr"
}

function shouldRunBM25(strategy: RagStrategy): boolean {
  return strategy === "bm25" || strategy === "hybrid" || strategy === "hybrid-rrf" || strategy === "hybrid-rerank" || strategy === "hybrid-rerank-mmr"
}

function shouldRunRRF(strategy: RagStrategy): boolean {
  return strategy === "hybrid-rrf" || strategy === "hybrid-rerank-mmr"
}

function shouldRunReranker(strategy: RagStrategy, config: RagEngineConfig): boolean {
  if (strategy === "hybrid-rerank" || strategy === "hybrid-rerank-mmr") return true
  return config.reranker.enabled
}

function shouldRunMMR(strategy: RagStrategy, config: RagEngineConfig): boolean {
  if (strategy === "hybrid-rerank-mmr") return true
  return config.mmr.enabled
}

function estimateTokens(text: string): number {
  if (!text) return 0
  return Math.ceil(text.split(/\s+/).filter(Boolean).length / 0.75)
}

// ============================================================
// Core generator: executeRag
// ============================================================

export async function* executeRag(
  query: string,
  strategy?: RagStrategy,
  configOverrides?: Partial<RagEngineConfig>,
  knowledgeBaseId?: string
): AsyncGenerator<RagEngineYield> {
  const traceId = createTraceId()
  const runId = createRunId()
  const requestId = generateId()
  const startTime = performance.now()

  // --- Apply overrides & defaults ---
  const settingsStrategy = strategy || settings_defaultStrategy
  let config: RagEngineConfig

  try {
    config = await getDefaultRagConfig(settingsStrategy)
  } catch {
    config = await getDefaultRagConfig("hybrid-rrf")
  }

  if (configOverrides) {
    config = deepMerge(config as unknown as Record<string, unknown>, configOverrides as unknown as Record<string, unknown>) as unknown as RagEngineConfig
  }
  config.strategy = settingsStrategy

  const events: TraceEvent[] = []

  function emit(stage: string, event: string, data: Record<string, unknown>): RagEngineYieldEvent {
    const traceEvent = createTraceEvent(traceId, runId, stage, event, data)
    events.push(traceEvent)
    return {
      type: event as RagEventType,
      timestamp: traceEvent.timestamp,
      data,
    }
  }

  // --------------------------------------------------------
  // Query started
  // --------------------------------------------------------
  yield emit("query", "query.started", {
    query,
    strategy: config.strategy,
    requestId,
    knowledgeBaseId: knowledgeBaseId ?? null,
  })

  // --------------------------------------------------------
  // KB scope event
  // --------------------------------------------------------
  if (knowledgeBaseId) {
    yield emit("kb", "kb.scope", {
      knowledgeBaseId,
      scope: "knowledge-base",
    })
  }

  // --------------------------------------------------------
  // Load chunks
  // --------------------------------------------------------
  let allChunks: StoredChunk[]
  try {
    if (knowledgeBaseId) {
      const allDocs = await getAllDocuments()
      const kbDocIds = new Set(
        allDocs
          .filter(d => "knowledgeBaseId" in d && (d as { knowledgeBaseId?: string }).knowledgeBaseId === knowledgeBaseId)
          .map(d => d.id)
      )
      const allChunksRaw = await getAllChunks()
      allChunks = allChunksRaw.filter(c => kbDocIds.has(c.documentId))
    } else {
      allChunks = await getAllChunks()
    }
  } catch (err) {
    yield emit("query", "trace.failed", {
      error: `Failed to load chunks: ${err instanceof Error ? err.message : String(err)}`,
    })
    yield {
      type: "error",
      error: `Failed to load chunks: ${err instanceof Error ? err.message : String(err)}`,
    }
    return
  }

  if (allChunks.length === 0) {
    yield emit("query", "trace.failed", {
      error: "No document chunks found. Please upload and process documents first.",
    })
    yield {
      type: "error",
      error: "No document chunks found. Please upload and process documents first.",
    }
    return
  }

  yield emit("query", "query.processed", {
    chunkCount: allChunks.length,
    processingDurationMs: Math.round(performance.now() - startTime),
  })

  // --------------------------------------------------------
  // Stage variables
  // --------------------------------------------------------
  let vectorResults: VectorResult[] = []
  let bm25Results: BM25Result[] = []
  let fusedResults: RRFResult[] = []
  let rerankResults: RerankResult[] = []
  let mmrResults: MMRResult[] = []
  let finalChunks: FinalContextChunk[] = []
  let answer = ""
  let llmInputTokens: number | null = null
  let llmOutputTokens: number | null = null
  let llmTotalTokens: number | null = null
  let llmLatencyMs = 0
  let llmStatus: "completed" | "failed" | "streaming" = "streaming"

  // --------------------------------------------------------
  // Vector Search stage
  // --------------------------------------------------------
  if (shouldRunVector(config.strategy)) {
    yield emit("vector", "vector.started", {
      topK: config.vector.topK,
      embeddingModel: config.vector.embeddingModel,
    })

    const embeddingConfigured = await isEmbeddingConfigured()

    if (embeddingConfigured) {
      try {
        const queryEmbedding = await generateQueryEmbedding(query)

        if (queryEmbedding) {
          const t0 = performance.now()
          vectorResults = vectorSearch(
            queryEmbedding,
            allChunks,
            config.vector.topK,
            config.vector.similarityThreshold
          )
          const latencyMs = Math.round(performance.now() - t0)

          for (const result of vectorResults) {
            yield emit("vector", "vector.chunk.retrieved", {
              chunkId: result.chunkId,
              rank: result.rank,
              score: result.score,
              document: result.chunk.documentName,
              page: result.chunk.page,
            })
          }

          yield emit("vector", "vector.completed", {
            resultCount: vectorResults.length,
            latencyMs,
            embeddingModel: config.vector.embeddingModel,
            dimensions: queryEmbedding.length,
          })
        } else {
          yield emit("vector", "vector.skipped", {
            reason: "Failed to generate query embedding",
          })
        }
      } catch (err) {
        yield emit("vector", "vector.skipped", {
          reason: `Embedding generation error: ${err instanceof Error ? err.message : String(err)}`,
        })
      }
    } else {
      yield emit("vector", "vector.skipped", {
        reason: "Embeddings not configured (no provider or API key)",
      })
    }
  }

  // --------------------------------------------------------
  // BM25 stage
  // --------------------------------------------------------
  if (shouldRunBM25(config.strategy)) {
    yield emit("bm25", "bm25.started", {
      topK: config.bm25.topK,
      language: config.bm25.language,
    })

    const t0 = performance.now()
    bm25Results = bm25Search(query, allChunks, config.bm25.topK)
    const latencyMs = Math.round(performance.now() - t0)

    for (const result of bm25Results) {
      yield emit("bm25", "bm25.chunk.retrieved", {
        chunkId: result.chunkId,
        rank: result.rank,
        score: result.score,
        document: result.chunk.documentName,
        page: result.chunk.page,
        queryTerms: result.queryTerms,
      })
    }

    yield emit("bm25", "bm25.completed", {
      resultCount: bm25Results.length,
      latencyMs,
      queryTerms: bm25Results.length > 0 ? bm25Results[0].queryTerms : [],
    })
  }

  // --------------------------------------------------------
  // RRF stage
  // --------------------------------------------------------
  if (shouldRunRRF(config.strategy)) {
    yield emit("rrf", "rrf.started", {
      k: config.rrf.k,
      vectorWeight: config.rrf.vectorWeight,
      bm25Weight: config.rrf.bm25Weight,
      vectorResultCount: vectorResults.length,
      bm25ResultCount: bm25Results.length,
    })

    const t0 = performance.now()
    fusedResults = rrfFusion(
      vectorResults,
      bm25Results,
      config.rrf.k,
      config.rrf.vectorWeight,
      config.rrf.bm25Weight
    )
    const latencyMs = Math.round(performance.now() - t0)

    yield emit("rrf", "rrf.completed", {
      resultCount: fusedResults.length,
      latencyMs,
      inputVectorChunks: vectorResults.length,
      inputBM25Chunks: bm25Results.length,
    })
  }

  // --------------------------------------------------------
  // Determine pre-rerank chunks
  // --------------------------------------------------------
  let preRerankChunks: StoredChunk[] = []
  let preRerankScores: number[] = []

  if (shouldRunRRF(config.strategy)) {
    preRerankChunks = fusedResults.map((r) => r.chunk)
    preRerankScores = fusedResults.map((r) => r.rrfScore)
  } else if (shouldRunVector(config.strategy) && shouldRunBM25(config.strategy)) {
    const seen = new Set<string>()
    for (const r of vectorResults) {
      if (!seen.has(r.chunkId)) {
        seen.add(r.chunkId)
        preRerankChunks.push(r.chunk)
        preRerankScores.push(r.score)
      }
    }
    for (const r of bm25Results) {
      if (!seen.has(r.chunkId)) {
        seen.add(r.chunkId)
        preRerankChunks.push(r.chunk)
        preRerankScores.push(r.score)
      }
    }
  } else if (shouldRunVector(config.strategy)) {
    preRerankChunks = vectorResults.map((r) => r.chunk)
    preRerankScores = vectorResults.map((r) => r.score)
  } else if (shouldRunBM25(config.strategy)) {
    preRerankChunks = bm25Results.map((r) => r.chunk)
    preRerankScores = bm25Results.map((r) => r.score)
  }

  // --------------------------------------------------------
  // Reranker stage
  // --------------------------------------------------------
  if (shouldRunReranker(config.strategy, config)) {
    yield emit("reranker", "reranker.started", {
      candidateCount: Math.min(preRerankChunks.length, config.reranker.candidateCount),
      topN: config.reranker.topN,
      configured: isRerankerConfigured(),
    })

    if (preRerankChunks.length === 0) {
      yield emit("reranker", "reranker.completed", {
        resultCount: 0,
        latencyMs: 0,
        skipped: true,
        skipReason: "No candidate chunks to rerank",
      })
    } else {
      try {
        const t0 = performance.now()
        rerankResults = await rerankChunks(
          query,
          preRerankChunks,
          config.reranker.candidateCount,
          config.reranker.topN
        )
        const latencyMs = Math.round(performance.now() - t0)

        for (const result of rerankResults) {
          yield emit("reranker", "rerank.updated", {
            chunkId: result.chunkId,
            rank: result.rank,
            rerankScore: result.rerankScore,
            originalScore: result.originalScore,
          })
        }

        yield emit("reranker", "reranker.completed", {
          resultCount: rerankResults.length,
          latencyMs,
          model: config.reranker.model || "heuristic",
        })
      } catch (err) {
        yield emit("reranker", "reranker.completed", {
          resultCount: 0,
          latencyMs: 0,
          skipped: true,
          skipReason: `Reranker error: ${err instanceof Error ? err.message : String(err)}`,
        })
      }
    }
  }

  // --------------------------------------------------------
  // Determine pre-MMR chunks
  // --------------------------------------------------------
  let preMmrChunks: StoredChunk[] = []
  let preMmrScores: number[] = []

  if (shouldRunReranker(config.strategy, config) && rerankResults.length > 0) {
    preMmrChunks = rerankResults.map((r) => r.chunk)
    preMmrScores = rerankResults.map((r) => r.rerankScore)
  } else {
    preMmrChunks = preRerankChunks
    preMmrScores = preRerankScores
  }

  // --------------------------------------------------------
  // MMR stage
  // --------------------------------------------------------
  if (shouldRunMMR(config.strategy, config)) {
    yield emit("mmr", "mmr.started", {
      lambda: config.mmr.lambda,
      candidateCount: Math.min(preMmrChunks.length, config.mmr.candidateCount),
      finalCount: config.mmr.finalCount,
    })

    if (preMmrChunks.length === 0) {
      yield emit("mmr", "mmr.completed", {
        selectedCount: 0,
        rejectedCount: 0,
        latencyMs: 0,
        skipped: true,
        skipReason: "No candidate chunks for MMR selection",
      })
    } else {
      const t0 = performance.now()
      mmrResults = mmrSelection(
        preMmrChunks,
        preMmrScores,
        config.mmr.lambda,
        config.mmr.candidateCount,
        config.mmr.finalCount
      )
      const latencyMs = Math.round(performance.now() - t0)

      const selected = mmrResults.filter((r) => r.selected)
      const rejected = mmrResults.filter((r) => !r.selected)

      for (const result of selected) {
        yield emit("mmr", "mmr.selection.updated", {
          chunkId: result.chunkId,
          rank: result.rank,
          mmrScore: result.mmrScore,
          relevanceScore: result.relevanceScore,
          maxSimilarity: result.maxSimilarity,
          selected: true,
        })
      }

      yield emit("mmr", "mmr.completed", {
        selectedCount: selected.length,
        rejectedCount: rejected.length,
        latencyMs,
        lambda: config.mmr.lambda,
      })
    }
  }

  // --------------------------------------------------------
  // Context Building
  // --------------------------------------------------------
  finalChunks = buildFinalContext(
    config.strategy,
    vectorResults,
    bm25Results,
    fusedResults,
    rerankResults,
    mmrResults,
    config
  )

  yield emit("context", "context.built", {
    chunkCount: finalChunks.length,
    documentCount: new Set(finalChunks.map((c) => c.documentId)).size,
    totalTokens: finalChunks.reduce((sum, c) => sum + c.tokenCount, 0),
    chunks: finalChunks.map((c) => ({
      chunkId: c.chunkId,
      document: c.documentName,
      page: c.page,
      score: c.score,
      method: c.method,
    })),
  })

  // --------------------------------------------------------
  // Prompt Building
  // --------------------------------------------------------
  const prompt = buildPrompt(query, finalChunks, config)

  yield emit("prompt", "prompt.built", {
    systemTokens: prompt.systemTokens,
    contextTokens: prompt.contextTokens,
    userTokens: prompt.userTokens,
    totalTokens: prompt.totalTokens,
  })

  // --------------------------------------------------------
  // LLM Generation
  // --------------------------------------------------------
  if (!(await isGroqConfigured())) {
    yield emit("llm", "trace.failed", {
      error: "LLM API key not configured. Cannot generate LLM response.",
    })
    yield {
      type: "error",
      error: "LLM API key not configured. Please set GROQ_API_KEY or GEMINI_API_KEY in your environment variables.",
    }
    return
  }

  yield emit("llm", "llm.started", {
    model: config.llm.model,
    temperature: config.llm.temperature,
    maxTokens: config.llm.maxTokens,
  })

  const llmStartTime = performance.now()

  try {
    const stream = generateCompletionStream(
      prompt.system + "\n\n--- Context ---\n\n" + prompt.context,
      prompt.user,
      config.llm
    )

    let tokenCount = 0

    for await (const chunk of stream) {
      if (chunk.type === "token" && chunk.content) {
        tokenCount++
        answer += chunk.content
        yield {
          type: "llm.token",
          content: chunk.content,
        }
      } else if (chunk.type === "done") {
        llmInputTokens = chunk.tokens?.input ?? null
        llmOutputTokens = chunk.tokens?.output ?? tokenCount
        llmTotalTokens = chunk.tokens?.total ?? (llmInputTokens !== null ? llmInputTokens + tokenCount : null)
        llmStatus = "completed"
      } else if (chunk.type === "error") {
        llmStatus = "failed"
        yield emit("llm", "trace.failed", {
          error: chunk.error || "LLM generation failed",
        })
        yield {
          type: "error",
          error: chunk.error || "LLM generation failed",
        }
        llmLatencyMs = Math.round(performance.now() - llmStartTime)

        yield emit("llm", "llm.completed", {
          model: config.llm.model,
          latencyMs: llmLatencyMs,
          status: "failed",
          error: chunk.error,
        })

        await finalizeTrace(
          traceId, runId, requestId, query, config, events,
          vectorResults, bm25Results, fusedResults, rerankResults, mmrResults,
          finalChunks, prompt, answer, llmInputTokens, llmOutputTokens, llmTotalTokens,
          llmLatencyMs, llmStatus, startTime, "failed", chunk.error, knowledgeBaseId
        )
        return
      }
    }

    llmLatencyMs = Math.round(performance.now() - llmStartTime)

    yield {
      type: "llm.done",
      data: {
        model: config.llm.model,
        latencyMs: llmLatencyMs,
        inputTokens: llmInputTokens,
        outputTokens: llmOutputTokens,
        totalTokens: llmTotalTokens,
      },
    }

    yield emit("llm", "llm.completed", {
      model: config.llm.model,
      latencyMs: llmLatencyMs,
      inputTokens: llmInputTokens,
      outputTokens: llmOutputTokens,
      totalTokens: llmTotalTokens,
      status: "completed",
    })
  } catch (err) {
    llmLatencyMs = Math.round(performance.now() - llmStartTime)
    llmStatus = "failed"
    const errorMsg = `LLM streaming error: ${err instanceof Error ? err.message : String(err)}`

    yield emit("llm", "trace.failed", { error: errorMsg })
    yield { type: "error", error: errorMsg }

    yield emit("llm", "llm.completed", {
      model: config.llm.model,
      latencyMs: llmLatencyMs,
      status: "failed",
      error: errorMsg,
    })

    await finalizeTrace(
      traceId, runId, requestId, query, config, events,
      vectorResults, bm25Results, fusedResults, rerankResults, mmrResults,
      finalChunks, prompt, answer, llmInputTokens, llmOutputTokens, llmTotalTokens,
      llmLatencyMs, llmStatus, startTime, "failed", errorMsg, knowledgeBaseId
    )
    return
  }

  // --------------------------------------------------------
  // Trace Completed
  // --------------------------------------------------------
  const trace = await finalizeTrace(
    traceId, runId, requestId, query, config, events,
    vectorResults, bm25Results, fusedResults, rerankResults, mmrResults,
    finalChunks, prompt, answer, llmInputTokens, llmOutputTokens, llmTotalTokens,
    llmLatencyMs, llmStatus, startTime, "completed", undefined, knowledgeBaseId
  )

  yield emit("trace", "trace.completed", {
    traceId,
    runId,
    totalLatencyMs: trace.totalLatencyMs,
    status: "completed",
  })
}

// ============================================================
// Context builder: converts pipeline results → FinalContextChunk[]
// ============================================================

function buildFinalContext(
  strategy: RagStrategy,
  vectorResults: VectorResult[],
  bm25Results: BM25Result[],
  fusedResults: RRFResult[],
  rerankResults: RerankResult[],
  mmrResults: MMRResult[],
  config: RagEngineConfig
): FinalContextChunk[] {
  const chunks: FinalContextChunk[] = []

  if (shouldRunMMR(strategy, config) && mmrResults.length > 0) {
    const selected = mmrResults.filter((r) => r.selected)
    for (let i = 0; i < selected.length; i++) {
      const r = selected[i]
      chunks.push({
        chunkId: r.chunkId,
        documentId: r.chunk.documentId,
        documentName: r.chunk.documentName,
        page: r.chunk.page,
        section: r.chunk.section,
        content: r.chunk.content,
        score: r.mmrScore,
        method: "mmr",
        tokenCount: r.chunk.tokenCount,
        rank: r.rank,
      })
    }
    return chunks
  }

  if (shouldRunReranker(strategy, config) && rerankResults.length > 0) {
    for (let i = 0; i < rerankResults.length; i++) {
      const r = rerankResults[i]
      chunks.push({
        chunkId: r.chunkId,
        documentId: r.chunk.documentId,
        documentName: r.chunk.documentName,
        page: r.chunk.page,
        section: r.chunk.section,
        content: r.chunk.content,
        score: r.rerankScore,
        method: "reranker",
        tokenCount: r.chunk.tokenCount,
        rank: r.rank,
      })
    }
    return chunks
  }

  if (shouldRunRRF(strategy) && fusedResults.length > 0) {
    for (let i = 0; i < fusedResults.length; i++) {
      const r = fusedResults[i]
      chunks.push({
        chunkId: r.chunkId,
        documentId: r.chunk.documentId,
        documentName: r.chunk.documentName,
        page: r.chunk.page,
        section: r.chunk.section,
        content: r.chunk.content,
        score: r.rrfScore,
        method: "rrf",
        tokenCount: r.chunk.tokenCount,
        rank: i + 1,
      })
    }
    return chunks
  }

  // Hybrid (no fusion): merge vector + bm25, deduplicated
  if (shouldRunVector(strategy) && shouldRunBM25(strategy)) {
    const seen = new Set<string>()
    let rank = 1

    for (const r of vectorResults) {
      if (!seen.has(r.chunkId)) {
        seen.add(r.chunkId)
        chunks.push({
          chunkId: r.chunkId,
          documentId: r.chunk.documentId,
          documentName: r.chunk.documentName,
          page: r.chunk.page,
          section: r.chunk.section,
          content: r.chunk.content,
          score: r.score,
          method: "vector",
          tokenCount: r.chunk.tokenCount,
          rank: rank++,
        })
      }
    }

    for (const r of bm25Results) {
      if (!seen.has(r.chunkId)) {
        seen.add(r.chunkId)
        chunks.push({
          chunkId: r.chunkId,
          documentId: r.chunk.documentId,
          documentName: r.chunk.documentName,
          page: r.chunk.page,
          section: r.chunk.section,
          content: r.chunk.content,
          score: r.score,
          method: "bm25",
          tokenCount: r.chunk.tokenCount,
          rank: rank++,
        })
      }
    }

    return chunks
  }

  // Vector only
  if (shouldRunVector(strategy)) {
    for (const r of vectorResults) {
      chunks.push({
        chunkId: r.chunkId,
        documentId: r.chunk.documentId,
        documentName: r.chunk.documentName,
        page: r.chunk.page,
        section: r.chunk.section,
        content: r.chunk.content,
        score: r.score,
        method: "vector",
        tokenCount: r.chunk.tokenCount,
        rank: r.rank,
      })
    }
    return chunks
  }

  // BM25 only
  if (shouldRunBM25(strategy)) {
    for (const r of bm25Results) {
      chunks.push({
        chunkId: r.chunkId,
        documentId: r.chunk.documentId,
        documentName: r.chunk.documentName,
        page: r.chunk.page,
        section: r.chunk.section,
        content: r.chunk.content,
        score: r.score,
        method: "bm25",
        tokenCount: r.chunk.tokenCount,
        rank: r.rank,
      })
    }
    return chunks
  }

  return chunks
}

// ============================================================
// Build and persist the FullTrace
// ============================================================

async function finalizeTrace(
  traceId: string,
  runId: string,
  requestId: string,
  query: string,
  config: RagEngineConfig,
  events: TraceEvent[],
  vectorResults: VectorResult[],
  bm25Results: BM25Result[],
  fusedResults: RRFResult[],
  rerankResults: RerankResult[],
  mmrResults: MMRResult[],
  contextChunks: FinalContextChunk[],
  prompt: ReturnType<typeof buildPrompt>,
  answer: string,
  llmInputTokens: number | null,
  llmOutputTokens: number | null,
  llmTotalTokens: number | null,
  llmLatencyMs: number,
  llmStatus: "completed" | "failed" | "streaming",
  startTime: number,
  overallStatus: "completed" | "failed" | "partial",
  error?: string,
  knowledgeBaseId?: string
): Promise<FullTrace> {
  const totalLatencyMs = Math.round(performance.now() - startTime)

  const trace: FullTrace = {
    id: traceId,
    runId,
    sessionId: requestId,
    requestId,
    timestamp: new Date(startTime).toISOString(),
    query,
    strategy: config.strategy,
    config,
    events,
    ...(knowledgeBaseId ? { knowledgeBaseId } : {}),
    queryProcessing: {
      originalQuery: query,
      tokenCount: estimateTokens(query),
      processingDurationMs: 0,
    },
    context: {
      chunks: contextChunks,
      totalTokens: contextChunks.reduce((sum, c) => sum + c.tokenCount, 0),
      chunkCount: contextChunks.length,
      documentCount: new Set(contextChunks.map((c) => c.documentId)).size,
    },
    prompt: {
      system: prompt.system,
      context: prompt.context,
      user: prompt.user,
      systemTokens: prompt.systemTokens,
      contextTokens: prompt.contextTokens,
      userTokens: prompt.userTokens,
      totalTokens: prompt.totalTokens,
    },
    llm: {
      provider: "groq",
      model: config.llm.model,
      startTime: new Date(startTime).toISOString(),
      endTime: new Date().toISOString(),
      latencyMs: llmLatencyMs,
      inputTokens: llmInputTokens,
      outputTokens: llmOutputTokens,
      totalTokens: llmTotalTokens,
      answer,
      status: llmStatus,
      ...(error ? { error } : {}),
    },
    sources: contextChunks.map((c) => ({
      documentId: c.documentId,
      documentName: c.documentName,
      page: c.page,
      section: c.section,
      chunkId: c.chunkId,
      retrievalMethod: c.method,
      score: c.score,
    })),
    totalLatencyMs,
    status: overallStatus,
    ...(error ? { error } : {}),
  }

  // Attach optional stages
  if (vectorResults.length > 0) {
    trace.vectorSearch = {
      latencyMs: 0,
      chunkCount: vectorResults.length,
      results: vectorResults,
    }
  }

  if (bm25Results.length > 0) {
    trace.bm25 = {
      latencyMs: 0,
      chunkCount: bm25Results.length,
      queryTerms: bm25Results.length > 0 ? bm25Results[0].queryTerms : [],
      results: bm25Results,
    }
  }

  if (fusedResults.length > 0) {
    trace.rrf = {
      latencyMs: 0,
      inputVectorChunks: vectorResults.length,
      inputBM25Chunks: bm25Results.length,
      results: fusedResults,
    }
  }

  if (rerankResults.length > 0 || shouldRunReranker(config.strategy, config)) {
    const skipped = rerankResults.length === 0
    trace.reranker = {
      latencyMs: 0,
      model: config.reranker.model,
      inputChunkCount: rerankResults.length > 0 ? rerankResults.length : 0,
      results: rerankResults,
      skipped,
      skipReason: skipped ? "No candidate chunks or reranker unavailable" : undefined,
    }
  }

  if (mmrResults.length > 0 || shouldRunMMR(config.strategy, config)) {
    const selected = mmrResults.filter((r) => r.selected)
    const rejected = mmrResults.filter((r) => !r.selected)
    const skipped = selected.length === 0 && mmrResults.length === 0
    trace.mmr = {
      latencyMs: 0,
      lambda: config.mmr.lambda,
      inputChunkCount: mmrResults.length,
      selectedChunks: selected,
      rejectedChunks: rejected,
      skipped,
      skipReason: skipped ? "No candidate chunks for MMR" : undefined,
    }
  }

  // Try to persist; don't fail the pipeline if saving fails
  try {
    await saveTrace(trace)
  } catch (err) {
    console.error("Failed to save trace:", err)
  }

  return trace
}

// ============================================================
// Non-streaming wrapper: collects all events, returns full trace
// ============================================================

export async function executeRagQuery(
  query: string,
  strategy?: RagStrategy,
  configOverrides?: Partial<RagEngineConfig>,
  knowledgeBaseId?: string
): Promise<FullTrace> {
  let finalTrace: FullTrace | null = null
  let lastError: string | null = null

  const gen = executeRag(query, strategy, configOverrides, knowledgeBaseId)

  for await (const event of gen) {
    if (event.type === "error") {
      lastError = (event as ErrorYieldEvent).error
    }

    if (event.type === "trace.completed") {
      const traceId = (event as RagEngineYieldEvent).data.traceId as string | undefined
      if (traceId) {
        const { getTrace } = await import("./trace-service")
        finalTrace = await getTrace(traceId)
      }
    }
  }

  if (finalTrace) {
    return finalTrace
  }

  // If trace wasn't saved or retrieval failed, build a minimal trace
  // from what we know — this handles the error case
  const traceId = createTraceId()
  const runId = createRunId()

  return {
    id: traceId,
    runId,
    sessionId: generateId(),
    requestId: generateId(),
    timestamp: new Date().toISOString(),
    query,
    strategy: strategy || "hybrid-rrf",
    config: await getDefaultRagConfig(strategy || "hybrid-rrf"),
    events: [],
    queryProcessing: {
      originalQuery: query,
      tokenCount: estimateTokens(query),
      processingDurationMs: 0,
    },
    context: {
      chunks: [],
      totalTokens: 0,
      chunkCount: 0,
      documentCount: 0,
    },
    prompt: {
      system: "",
      context: "",
      user: query,
      systemTokens: 0,
      contextTokens: 0,
      userTokens: estimateTokens(query),
      totalTokens: estimateTokens(query),
    },
    llm: {
      provider: "groq",
      model: "",
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString(),
      latencyMs: 0,
      inputTokens: null,
      outputTokens: null,
      totalTokens: null,
      answer: "",
      status: "failed",
      error: lastError || "RAG pipeline did not produce a trace",
    },
    sources: [],
    totalLatencyMs: 0,
    status: "failed",
    error: lastError || "RAG pipeline did not produce a trace",
  }
}

// ============================================================
// Settings fallback helper
// ============================================================

let settings_defaultStrategy: RagStrategy = "hybrid-rrf"

getSettings()
  .then((s) => {
    settings_defaultStrategy = s.defaultStrategy
  })
  .catch(() => {
    // use default
  })

// ============================================================
// Deep merge utility
// ============================================================

function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  const result = { ...target }

  for (const key of Object.keys(source)) {
    const targetVal = result[key]
    const sourceVal = source[key]

    if (
      sourceVal !== null &&
      sourceVal !== undefined &&
      typeof sourceVal === "object" &&
      !Array.isArray(sourceVal) &&
      typeof targetVal === "object" &&
      targetVal !== null &&
      !Array.isArray(targetVal)
    ) {
      result[key] = deepMerge(
        targetVal as Record<string, unknown>,
        sourceVal as Record<string, unknown>
      )
    } else if (sourceVal !== undefined) {
      result[key] = sourceVal
    }
  }

  return result
}
