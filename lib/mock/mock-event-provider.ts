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
} from "../types"
import type { RagEvent } from "../events"

let chunkCounter = 0

function makeChunkId(): string {
  chunkCounter++
  return `chunk_${String(chunkCounter).padStart(4, "0")}`
}

function randomLatency(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min) + min)
}

const SAMPLE_CONTENTS = [
  "Hybrid retrieval combines dense vector embeddings with sparse lexical matching to improve recall across diverse query types. Vector search captures semantic similarity while BM25 captures exact term matching.",
  "The cross-encoder reranker evaluates query-document pairs jointly, producing more accurate relevance scores than bi-encoder embeddings alone. This second-stage ranking significantly improves precision at small latency cost.",
  "Reciprocal Rank Fusion (RRF) combines multiple ranked lists by assigning each result a score based on its rank position. The formula RRF(d) = Σ 1/(k + rank_i(d)) merges results without requiring score normalization.",
  "Maximum Marginal Relevance (MMR) balances relevance and diversity by penalizing documents similar to already-selected ones. The lambda parameter controls the trade-off between relevance (λ→1) and diversity (λ→0).",
  "Chunk tokenization follows a sliding window approach with overlap to preserve context across boundaries. Typical configurations use 256-512 token windows with 50-128 token overlap.",
  "Embedding dimensions of 1536 (OpenAI text-embedding-3-large) or 768 (smaller models) capture semantic relationships in high-dimensional space. Cosine similarity measures angular distance between query and document vectors.",
  "BM25 computes term frequency and inverse document frequency with length normalization. The k1 parameter controls term frequency saturation, while b controls length normalization strength.",
  "The retrieval pipeline first processes the query through embedding or tokenization, then searches the index, applies fusion and ranking strategies, and finally constructs the context for LLM generation.",
  "Document preprocessing involves text extraction, chunking, metadata enrichment, and embedding generation. Quality preprocessing directly impacts retrieval accuracy and downstream generation quality.",
  "The context window construction selects the most relevant chunks while respecting the LLM's maximum context length. Token counting ensures the combined system prompt, context, and user query fit within limits.",
  "Semantic chunking uses embedding similarity to identify natural boundaries in text, producing more coherent chunks than fixed-size splitting. This approach preserves topical consistency within each chunk.",
  "Vector indices such as HNSW (Hierarchical Navigable Small World) enable efficient approximate nearest neighbor search with logarithmic complexity, making real-time retrieval feasible at scale.",
  "Query expansion techniques like HyDE (Hypothetical Document Embeddings) generate a hypothetical answer and use its embedding for retrieval, bridging the vocabulary gap between queries and documents.",
  "The generation phase receives the constructed prompt with system instructions, retrieved context, and user query. Temperature and top-p parameters control the diversity and determinism of the output.",
  "Metadata filtering allows restricting retrieval to specific documents, pages, sections, or date ranges before the main search, improving precision for targeted queries.",
]

function generateChunks(count: number, method: Chunk["method"], startRank: number = 1): Chunk[] {
  return Array.from({ length: count }, (_, i) => ({
    id: makeChunkId(),
    rank: startRank + i,
    score: Math.round((0.95 - i * 0.03 + Math.random() * 0.02) * 1000) / 1000,
    document: ["RAG_Architecture.pdf", "Retrieval_Guide.pdf", "Search_Architecture.pdf", "Embedding_Models.pdf", "Chunking_Strategies.pdf"][Math.floor(Math.random() * 5)],
    page: Math.floor(Math.random() * 40) + 1,
    section: ["Introduction", "Methodology", "Results", "Architecture", "Implementation", "Evaluation", "Discussion", "Related Work", "Conclusion", "Appendix"][Math.floor(Math.random() * 10)],
    tokens: Math.floor(Math.random() * 200) + 80,
    content: SAMPLE_CONTENTS[Math.floor(Math.random() * SAMPLE_CONTENTS.length)],
    method,
    vectorRank: method === "vector" ? startRank + i : undefined,
    bm25Rank: method === "bm25" ? startRank + i : undefined,
    rrfScore: method === "rrf" ? Math.round((0.04 - i * 0.003 + Math.random() * 0.001) * 10000) / 10000 : undefined,
  }))
}

function generateTraceEvents(
  strategy: RagStrategy,
  query: string,
  emit: (event: RagEvent) => void,
  onComplete: (trace: RagTrace) => void
): void {
  const traceId = `rag_${Date.now().toString(36)}${Math.random().toString(36).substring(2, 8)}`
  const runId = `run_${Date.now().toString(36)}`
  const sessionId = `sess_${Date.now().toString(36).substring(0, 10)}`
  const requestId = `req_${Math.random().toString(36).substring(2, 12)}`

  const stageTimings: Record<string, { start: number; latencyMs: number }> = {}
  const totalStart = Date.now()

  let vectorChunks: Chunk[] = []
  let bm25Chunks: Chunk[] = []
  let rrfChunks: Chunk[] = []
  let rerankerBefore: Chunk[] = []
  let rerankerAfter: Chunk[] = []
  let mmrSelected: Chunk[] = []
  let mmrRejected: Chunk[] = []
  let finalContextChunks: Chunk[] = []
  let promptInfo: PromptInfo | null = null
  let llmInfo: LLMInfo | null = null

  const emitWithDelay = (event: RagEvent, delay: number, cb?: () => void) => {
    setTimeout(() => {
      emit(event)
      cb?.()
    }, delay)
  }

  const stages = (() => {
    const s: string[] = ["query"]
    if (["vector", "hybrid", "hybrid-rrf", "hybrid-rerank", "hybrid-rerank-mmr"].includes(strategy)) s.push("vector")
    if (["bm25", "hybrid", "hybrid-rrf", "hybrid-rerank", "hybrid-rerank-mmr"].includes(strategy)) s.push("bm25")
    if (["hybrid-rrf", "hybrid-rerank-mmr"].includes(strategy)) s.push("rrf")
    if (["hybrid-rerank", "hybrid-rerank-mmr"].includes(strategy)) s.push("reranker")
    if (strategy === "hybrid-rerank-mmr") s.push("mmr")
    s.push("context", "prompt", "llm")
    return s
  })()

  const stagesRecord: Record<string, { status: "idle" | "running" | "completed" | "error" | "skipped"; latencyMs: number }> = {}
  stages.forEach((s) => { stagesRecord[s] = { status: "idle", latencyMs: 0 } })

  let accumulatedDelay = 0

  // Query processing
  const queryLatency = randomLatency(20, 50)
  stagesRecord["query"] = { status: "running", latencyMs: 0 }
  emitWithDelay({ type: "query.started", timestamp: Date.now(), data: { query, strategy } }, accumulatedDelay)
  accumulatedDelay += queryLatency
  stagesRecord["query"] = { status: "completed", latencyMs: queryLatency }
  emitWithDelay({ type: "query.processed", timestamp: Date.now(), data: { query, strategy, latencyMs: queryLatency } }, accumulatedDelay)

  // Vector search
  if (["vector", "hybrid", "hybrid-rrf", "hybrid-rerank", "hybrid-rerank-mmr"].includes(strategy)) {
    const vLatency = randomLatency(120, 220)
    stagesRecord["vector"] = { status: "running", latencyMs: 0 }
    accumulatedDelay += 50
    emitWithDelay({ type: "vector.started", timestamp: Date.now(), data: { embeddingModel: "text-embedding-3-large", dimensions: 1536, topK: 20, similarity: "Cosine" } }, accumulatedDelay)

    vectorChunks = generateChunks(12, "vector")
    vectorChunks.forEach((chunk, i) => {
      accumulatedDelay += 30
      emitWithDelay({ type: "vector.chunk.retrieved", timestamp: Date.now(), data: { chunk, index: i } }, accumulatedDelay)
    })

    accumulatedDelay += 50
    stagesRecord["vector"] = { status: "completed", latencyMs: vLatency }
    emitWithDelay({ type: "vector.completed", timestamp: Date.now(), data: { chunks: vectorChunks, latencyMs: vLatency } }, accumulatedDelay)
  }

  // BM25
  if (["bm25", "hybrid", "hybrid-rrf", "hybrid-rerank", "hybrid-rerank-mmr"].includes(strategy)) {
    const bLatency = randomLatency(50, 100)
    stagesRecord["bm25"] = { status: "running", latencyMs: 0 }
    accumulatedDelay += 30
    emitWithDelay({ type: "bm25.started", timestamp: Date.now(), data: { topK: 20, queryTerms: query.split(" ").slice(0, 5) } }, accumulatedDelay)

    bm25Chunks = generateChunks(10, "bm25")
    bm25Chunks.forEach((chunk, i) => {
      accumulatedDelay += 25
      emitWithDelay({ type: "bm25.chunk.retrieved", timestamp: Date.now(), data: { chunk, index: i } }, accumulatedDelay)
    })

    accumulatedDelay += 40
    stagesRecord["bm25"] = { status: "completed", latencyMs: bLatency }
    emitWithDelay({ type: "bm25.completed", timestamp: Date.now(), data: { chunks: bm25Chunks, latencyMs: bLatency } }, accumulatedDelay)
  }

  // RRF
  if (["hybrid-rrf", "hybrid-rerank-mmr"].includes(strategy)) {
    const rrfLatency = randomLatency(8, 20)
    stagesRecord["rrf"] = { status: "running", latencyMs: 0 }
    accumulatedDelay += 30
    emitWithDelay({ type: "rrf.started", timestamp: Date.now(), data: {} }, accumulatedDelay)

    rrfChunks = [...vectorChunks.slice(0, 8), ...bm25Chunks.slice(0, 6)]
      .map((c, i) => ({ ...c, rank: i + 1, method: "rrf" as const, rrfScore: Math.round((0.04 - i * 0.003) * 10000) / 10000 }))
      .sort((a, b) => (b.rrfScore || 0) - (a.rrfScore || 0))
      .slice(0, 15)

    accumulatedDelay += rrfLatency
    stagesRecord["rrf"] = { status: "completed", latencyMs: rrfLatency }
    emitWithDelay({ type: "rrf.completed", timestamp: Date.now(), data: { chunks: rrfChunks, latencyMs: rrfLatency } }, accumulatedDelay)
  }

  // Reranker
  if (["hybrid-rerank", "hybrid-rerank-mmr"].includes(strategy)) {
    const rrLatency = randomLatency(300, 500)
    stagesRecord["reranker"] = { status: "running", latencyMs: 0 }
    accumulatedDelay += 40
    rerankerBefore = (strategy === "hybrid-rerank" ? [...vectorChunks.slice(0, 10), ...bm25Chunks.slice(0, 10)] : rrfChunks).map((c, i) => ({
      ...c,
      rank: i + 1,
      method: "reranker" as const,
    }))
    emitWithDelay({ type: "reranker.started", timestamp: Date.now(), data: { model: "cross-encoder/ms-marco-MiniLM-L-6-v2", candidates: rerankerBefore.length, topN: 8 } }, accumulatedDelay)

    rerankerAfter = rerankerBefore
      .map((c) => ({ ...c, rerankScore: Math.round((Math.random() * 0.8 + 0.2) * 1000) / 1000 }))
      .sort((a, b) => (b.rerankScore || 0) - (a.rerankScore || 0))
      .slice(0, 8)
      .map((c, i) => ({ ...c, rank: i + 1 }))

    rerankerAfter.forEach((chunk, i) => {
      accumulatedDelay += 60
      emitWithDelay({ type: "rerank.updated", timestamp: Date.now(), data: { chunk, newRank: i + 1 } }, accumulatedDelay)
    })

    accumulatedDelay += 50
    stagesRecord["reranker"] = { status: "completed", latencyMs: rrLatency }
    emitWithDelay({ type: "reranker.completed", timestamp: Date.now(), data: { beforeChunks: rerankerBefore, afterChunks: rerankerAfter, latencyMs: rrLatency } }, accumulatedDelay)
  }

  // MMR
  if (strategy === "hybrid-rerank-mmr") {
    const mmrLatency = randomLatency(20, 45)
    stagesRecord["mmr"] = { status: "running", latencyMs: 0 }
    accumulatedDelay += 30
    const mmrCandidates = rerankerAfter.length > 0 ? rerankerAfter : (rrfChunks.length > 0 ? rrfChunks : vectorChunks)
    emitWithDelay({ type: "mmr.started", timestamp: Date.now(), data: { lambda: 0.7, candidateCount: mmrCandidates.length } }, accumulatedDelay)

    mmrSelected = mmrCandidates.slice(0, 6).map((c, i) => ({ ...c, rank: i + 1, method: "mmr" as const, selected: true }))
    mmrRejected = mmrCandidates.slice(6).map((c) => ({ ...c, selected: false }))

    accumulatedDelay += mmrLatency
    stagesRecord["mmr"] = { status: "completed", latencyMs: mmrLatency }
    emitWithDelay({ type: "mmr.completed", timestamp: Date.now(), data: { selectedChunks: mmrSelected, rejectedChunks: mmrRejected, latencyMs: mmrLatency } }, accumulatedDelay)
  }

  // Determine final context
  if (strategy === "hybrid-rerank-mmr") {
    finalContextChunks = mmrSelected
  } else if (strategy === "hybrid-rerank") {
    finalContextChunks = rerankerAfter
  } else if (strategy === "hybrid-rrf") {
    finalContextChunks = rrfChunks.slice(0, 8)
  } else if (strategy === "hybrid") {
    finalContextChunks = [...vectorChunks.slice(0, 5), ...bm25Chunks.slice(0, 3)]
  } else if (strategy === "vector") {
    finalContextChunks = vectorChunks.slice(0, 8)
  } else {
    finalContextChunks = bm25Chunks.slice(0, 8)
  }

  finalContextChunks = finalContextChunks.map((c, i) => ({ ...c, rank: i + 1, method: "final" as const }))

  // Context
  const contextLatency = randomLatency(10, 30)
  stagesRecord["context"] = { status: "running", latencyMs: 0 }
  accumulatedDelay += 30
  const contextInfo: ContextInfo = {
    chunkCount: finalContextChunks.length,
    documentCount: new Set(finalContextChunks.map((c) => c.document)).size,
    totalTokens: finalContextChunks.reduce((sum, c) => sum + c.tokens, 0),
    chunks: finalContextChunks,
  }
  stagesRecord["context"] = { status: "completed", latencyMs: contextLatency }
  emitWithDelay({ type: "context.built", timestamp: Date.now(), data: { context: contextInfo, latencyMs: contextLatency } }, accumulatedDelay)

  // Prompt
  const promptLatency = randomLatency(10, 25)
  stagesRecord["prompt"] = { status: "running", latencyMs: 0 }
  accumulatedDelay += 30
  promptInfo = {
    system: "You are a helpful AI assistant. Use the provided context to answer the user's question accurately. If the context doesn't contain enough information, say so.",
    context: finalContextChunks.map((c) => `[Document: ${c.document}, Page ${c.page}, Section: ${c.section}]\n${c.content}`).join("\n\n---\n\n"),
    user: query,
    systemTokens: 42,
    contextTokens: contextInfo.totalTokens,
    userTokens: query.split(" ").length,
    totalTokens: 42 + contextInfo.totalTokens + query.split(" ").length,
  }
  stagesRecord["prompt"] = { status: "completed", latencyMs: promptLatency }
  emitWithDelay({ type: "prompt.built", timestamp: Date.now(), data: { prompt: promptInfo, latencyMs: promptLatency } }, accumulatedDelay)

  // LLM
  const llmLatency = randomLatency(800, 1500)
  stagesRecord["llm"] = { status: "running", latencyMs: 0 }
  accumulatedDelay += 40
  const mockAnswer = `Based on the retrieved documents, I can provide a comprehensive answer about "${query}".\n\nThe key findings from the analysis are:\n\n1. **Hybrid retrieval** combines the strengths of both dense vector search and sparse lexical matching (BM25) to improve recall across diverse query types. Vector search captures semantic similarity through embeddings, while BM25 excels at exact term matching.\n\n2. **Reciprocal Rank Fusion (RRF)** provides a robust method for combining multiple ranked result lists without requiring score normalization. The formula assigns scores based on rank positions, making it effective even when individual retrieval methods produce incomparable score distributions.\n\n3. **Cross-encoder reranking** refines the initial retrieval results by jointly evaluating query-document pairs, significantly improving precision at a modest latency cost.\n\n4. **MMR (Maximum Marginal Relevance)** ensures diversity in the final context by penalizing redundant documents, leading to more comprehensive and varied answers.\n\nThe pipeline demonstrates that combining these techniques produces superior results compared to any single retrieval method alone.`
  emitWithDelay({ type: "llm.started", timestamp: Date.now(), data: { model: "gpt-4o", temperature: 0.7, maxTokens: 2048 } }, accumulatedDelay)

  // Simulate streaming tokens
  const words = mockAnswer.split(" ")
  for (let i = 0; i < words.length; i += 3) {
    accumulatedDelay += 30
    emitWithDelay({
      type: "llm.token.generated",
      timestamp: Date.now(),
      data: { token: words.slice(i, i + 3).join(" ") + " " },
    }, accumulatedDelay)
  }

  llmInfo = {
    model: "gpt-4o",
    inputTokens: promptInfo.totalTokens,
    outputTokens: words.length,
    temperature: 0.7,
    maxTokens: 2048,
    latencyMs: llmLatency,
    answer: mockAnswer,
  }
  accumulatedDelay += 50
  stagesRecord["llm"] = { status: "completed", latencyMs: llmLatency }
  emitWithDelay({ type: "llm.completed", timestamp: Date.now(), data: { llm: llmInfo, latencyMs: llmLatency } }, accumulatedDelay)

  // Vector search info
  const vectorInfo: VectorSearchInfo | undefined = ["vector", "hybrid", "hybrid-rrf", "hybrid-rerank", "hybrid-rerank-mmr"].includes(strategy)
    ? { embeddingModel: "text-embedding-3-large", dimensions: 1536, topK: 20, similarity: "Cosine", latencyMs: stagesRecord["vector"]?.latencyMs || 0, chunks: vectorChunks }
    : undefined

  const bm25Info: BM25Info | undefined = ["bm25", "hybrid", "hybrid-rrf", "hybrid-rerank", "hybrid-rerank-mmr"].includes(strategy)
    ? { topK: 20, queryTerms: query.split(" ").slice(0, 5), latencyMs: stagesRecord["bm25"]?.latencyMs || 0, chunks: bm25Chunks }
    : undefined

  const rrfInfo: RRFInfo | undefined = ["hybrid-rrf", "hybrid-rerank-mmr"].includes(strategy)
    ? { vectorChunks: vectorChunks.slice(0, 10), bm25Chunks: bm25Chunks.slice(0, 10), mergedChunks: rrfChunks, latencyMs: stagesRecord["rrf"]?.latencyMs || 0 }
    : undefined

  const rerankerInfo: RerankerInfo | undefined = ["hybrid-rerank", "hybrid-rerank-mmr"].includes(strategy)
    ? { model: "cross-encoder/ms-marco-MiniLM-L-6-v2", candidates: rerankerBefore.length, topN: 8, latencyMs: stagesRecord["reranker"]?.latencyMs || 0, beforeChunks: rerankerBefore, afterChunks: rerankerAfter }
    : undefined

  const mmrInfo: MMRInfo | undefined = strategy === "hybrid-rerank-mmr"
    ? { lambda: 0.7, candidateCount: rerankerAfter.length || rrfChunks.length, finalCount: mmrSelected.length, latencyMs: stagesRecord["mmr"]?.latencyMs || 0, selectedChunks: mmrSelected, rejectedChunks: mmrRejected }
    : undefined

  const totalDurationMs = Date.now() - totalStart + accumulatedDelay

  const overview: TraceOverview = {
    traceId,
    runId,
    sessionId,
    requestId,
    timestamp: new Date().toISOString(),
    status: "completed",
    totalDurationMs,
    strategy,
    model: "gpt-4o",
    embeddingModel: "text-embedding-3-large",
    rerankerModel: ["hybrid-rerank", "hybrid-rerank-mmr"].includes(strategy) ? "cross-encoder/ms-marco-MiniLM-L-6-v2" : undefined,
    environment: "development",
    version: "1.0.0",
    stages: stagesRecord,
  }

  const trace: RagTrace = {
    overview,
    query,
    vectorSearch: vectorInfo,
    bm25: bm25Info,
    rrf: rrfInfo,
    reranker: rerankerInfo,
    mmr: mmrInfo,
    context: contextInfo,
    prompt: promptInfo,
    llm: llmInfo,
    tokenBreakdown: {
      system: promptInfo.systemTokens,
      context: promptInfo.contextTokens,
      user: promptInfo.userTokens,
      input: promptInfo.totalTokens,
      output: llmInfo.outputTokens,
      total: promptInfo.totalTokens + llmInfo.outputTokens,
    },
  }

  accumulatedDelay += 100
  emitWithDelay({ type: "trace.completed", timestamp: Date.now(), data: { traceId } }, accumulatedDelay, () => {
    onComplete(trace)
  })
}

export function startMockTrace(
  strategy: RagStrategy,
  query: string,
  emit: (event: RagEvent) => void,
  onComplete: (trace: RagTrace) => void
): () => void {
  const timeoutIds: ReturnType<typeof setTimeout>[] = []

  const originalSetTimeout = globalThis.setTimeout
  const patchedSetTimeout = (fn: (...args: unknown[]) => void, delay: number, ...args: unknown[]) => {
    const id = originalSetTimeout(fn, delay, ...args)
    timeoutIds.push(id)
    return id
  }

  const prevSetTimeout = globalThis.setTimeout
  globalThis.setTimeout = patchedSetTimeout as typeof globalThis.setTimeout

  generateTraceEvents(strategy, query, emit, (trace) => {
    globalThis.setTimeout = prevSetTimeout
    onComplete(trace)
  })

  return () => {
    timeoutIds.forEach(clearTimeout)
    globalThis.setTimeout = prevSetTimeout
  }
}

export function generateMockDocuments() {
  return [
    { id: "doc_1", name: "RAG_Architecture.pdf", type: "application/pdf", size: 2457600, status: "ready" as const, chunks: 42, tokens: 8420 },
    { id: "doc_2", name: "Retrieval_Guide.pdf", type: "application/pdf", size: 1843200, status: "ready" as const, chunks: 31, tokens: 6240 },
    { id: "doc_3", name: "Search_Architecture.pdf", type: "application/pdf", size: 3072000, status: "ready" as const, chunks: 58, tokens: 11560 },
  ]
}
