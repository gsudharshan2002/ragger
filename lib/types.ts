import { z } from "zod"

export type RagStrategy =
  | "vector"
  | "bm25"
  | "hybrid"
  | "hybrid-rrf"
  | "hybrid-rerank"
  | "hybrid-rerank-mmr"

export type StageStatus = "idle" | "running" | "completed" | "error" | "skipped"

export type DocumentStatus = "uploading" | "processing" | "chunking" | "embedding" | "ready" | "error"

export const RAG_STRATEGIES: { value: RagStrategy; label: string; stages: string[] }[] = [
  { value: "vector", label: "Vector Search", stages: ["query", "vector", "context", "prompt", "llm"] },
  { value: "bm25", label: "BM25", stages: ["query", "bm25", "context", "prompt", "llm"] },
  { value: "hybrid", label: "Hybrid", stages: ["query", "vector", "bm25", "context", "prompt", "llm"] },
  { value: "hybrid-rrf", label: "Hybrid + RRF", stages: ["query", "vector", "bm25", "rrf", "context", "prompt", "llm"] },
  { value: "hybrid-rerank", label: "Hybrid + Rerank", stages: ["query", "vector", "bm25", "reranker", "context", "prompt", "llm"] },
  { value: "hybrid-rerank-mmr", label: "Hybrid + Rerank + MMR", stages: ["query", "vector", "bm25", "rrf", "reranker", "mmr", "context", "prompt", "llm"] },
]

export interface Chunk {
  id: string
  rank: number
  score: number
  document: string
  page: number
  section: string
  tokens: number
  content: string
  method: "vector" | "bm25" | "rrf" | "reranker" | "mmr" | "final"
  vectorRank?: number
  bm25Rank?: number
  rrfScore?: number
  rerankScore?: number
  selected?: boolean
}

export interface VectorSearchInfo {
  embeddingModel: string
  dimensions: number
  topK: number
  similarity: string
  latencyMs: number
  chunks: Chunk[]
}

export interface BM25Info {
  topK: number
  queryTerms: string[]
  latencyMs: number
  chunks: Chunk[]
}

export interface RRFInfo {
  vectorChunks: Chunk[]
  bm25Chunks: Chunk[]
  mergedChunks: Chunk[]
  latencyMs: number
}

export interface RerankerInfo {
  model: string
  candidates: number
  topN: number
  latencyMs: number
  beforeChunks: Chunk[]
  afterChunks: Chunk[]
}

export interface MMRInfo {
  lambda: number
  candidateCount: number
  finalCount: number
  latencyMs: number
  selectedChunks: Chunk[]
  rejectedChunks: Chunk[]
}

export interface ContextInfo {
  chunkCount: number
  documentCount: number
  totalTokens: number
  chunks: Chunk[]
}

export interface PromptInfo {
  system: string
  context: string
  user: string
  systemTokens: number
  contextTokens: number
  userTokens: number
  totalTokens: number
}

export interface LLMInfo {
  model: string
  inputTokens: number
  outputTokens: number
  temperature: number
  maxTokens: number
  latencyMs: number
  answer: string
}

export interface StageInfo {
  status: StageStatus
  latencyMs: number
}

export interface TraceOverview {
  traceId: string
  runId: string
  sessionId: string
  requestId: string
  parentRunId?: string
  timestamp: string
  status: StageStatus
  totalDurationMs: number
  strategy: RagStrategy
  model: string
  embeddingModel: string
  rerankerModel?: string
  environment: string
  version: string
  stages: Record<string, StageInfo>
}

export interface RagTrace {
  overview: TraceOverview
  query: string
  vectorSearch?: VectorSearchInfo
  bm25?: BM25Info
  rrf?: RRFInfo
  reranker?: RerankerInfo
  mmr?: MMRInfo
  context: ContextInfo
  prompt: PromptInfo
  llm: LLMInfo
  tokenBreakdown: {
    system: number
    context: number
    user: number
    input: number
    output: number
    total: number
  }
}

export interface UploadedDocument {
  id: string
  name: string
  type: string
  size: number
  status: DocumentStatus
  chunks?: number
  tokens?: number
  progress?: number
}

export interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: string
  trace?: RagTrace
  strategy?: RagStrategy
  sources?: { document: string; page: number; section?: string; documentId?: string }[]
}

export interface Session {
  id: string
  title: string
  createdAt: string
  messages: ChatMessage[]
  documents: UploadedDocument[]
}

export interface LatencyStage {
  name: string
  durationMs: number
  color: string
}

export const RagStrategySchema = z.enum([
  "vector",
  "bm25",
  "hybrid",
  "hybrid-rrf",
  "hybrid-rerank",
  "hybrid-rerank-mmr",
])

export const ChatMessageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  timestamp: z.string(),
  strategy: RagStrategySchema.optional(),
})

export const UploadedDocumentSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  size: z.number(),
  status: z.enum(["uploading", "processing", "chunking", "embedding", "ready", "error"]),
  chunks: z.number().optional(),
  tokens: z.number().optional(),
  progress: z.number().optional(),
})

// ============================================================
// BENCHMARK TYPES
// ============================================================

export type Difficulty = "easy" | "medium" | "hard" | "expert"
export type TestCaseStatus = "not_run" | "running" | "passed" | "partial" | "failed"
export type FailureCategory =
  | "retrieval_failure"
  | "missing_source"
  | "wrong_source"
  | "poor_ranking"
  | "poor_context"
  | "poor_answer"
  | "citation_failure"
  | "latency_failure"
  | "token_limit_failure"

export interface ExpectedSource {
  id: string
  document: string
  section: string
  page: number
  chunkId?: string
  url?: string
  description?: string
}

export interface GoldenCase {
  id: string
  query: string
  expectedAnswer: string
  expectedSources: ExpectedSource[]
  expectedSection?: string
  expectedPages: number[]
  whyDifficult: string
  difficulty: Difficulty
  tags: string[]
  status: TestCaseStatus
  advanced?: {
    expectedKeywords?: string[]
    expectedEntities?: string[]
    expectedCitation?: boolean
    expectedAnswerType?: string
    expectedLanguage?: string
    expectedSourceCount?: number
    minHitRate?: number
    minRecall?: number
    minPrecision?: number
    minMRR?: number
    maxLatencyMs?: number
    maxTokens?: number
  }
  lastMetrics?: EvaluationMetrics
  traceId?: string
}

export interface GoldenDataset {
  id: string
  name: string
  description: string
  tags: string[]
  versions: DatasetVersion[]
  currentVersion: string
  createdAt: string
  updatedAt: string
}

export interface DatasetVersion {
  id: string
  version: string
  cases: GoldenCase[]
  createdAt: string
  changeNote?: string
}

export interface VectorConfig {
  embeddingModel: string
  topK: number
  similarity: string
  similarityThreshold?: number
}

export interface BM25Config {
  topK: number
  language: string
  tokenizer: string
  fieldWeights?: Record<string, number>
}

export interface RRFConfig {
  k: number
  vectorWeight: number
  bm25Weight: number
}

export interface RerankerConfig {
  model: string
  candidateCount: number
  topN: number
  scoreThreshold?: number
}

export interface MMRConfig {
  lambda: number
  candidateCount: number
  finalCount: number
}

export interface LLMConfig {
  model: string
  temperature: number
  maxTokens: number
  systemPromptVersion?: string
}

export interface BenchmarkConfig {
  datasetId: string
  datasetVersion: string
  strategy: RagStrategy
  vector?: VectorConfig
  bm25?: BM25Config
  rrf?: RRFConfig
  reranker?: RerankerConfig
  mmr?: MMRConfig
  llm: LLMConfig
  metrics: BenchmarkMetric[]
}

export type BenchmarkMetric =
  | "hit_rate"
  | "recall"
  | "precision"
  | "mrr"
  | "ndcg"
  | "faithfulness"
  | "answer_relevance"
  | "context_precision"
  | "context_recall"
  | "latency"
  | "input_tokens"
  | "output_tokens"
  | "total_tokens"
  | "cost"

export const ALL_METRICS: { value: BenchmarkMetric; label: string; category: string; tooltip: string }[] = [
  { value: "hit_rate", label: "Hit Rate", category: "Retrieval", tooltip: "Measures whether at least one expected relevant source was retrieved." },
  { value: "recall", label: "Recall", category: "Retrieval", tooltip: "Measures how much of the expected relevant information was retrieved." },
  { value: "precision", label: "Precision", category: "Retrieval", tooltip: "Measures how much of the retrieved information was relevant." },
  { value: "mrr", label: "MRR", category: "Retrieval", tooltip: "Measures how highly the first relevant result appears." },
  { value: "ndcg", label: "NDCG", category: "Retrieval", tooltip: "Measures ranking quality while considering the position of relevant results." },
  { value: "faithfulness", label: "Faithfulness", category: "RAG Quality", tooltip: "Measures whether the answer is grounded in the provided context." },
  { value: "answer_relevance", label: "Answer Relevance", category: "RAG Quality", tooltip: "Measures whether the answer addresses the user's question." },
  { value: "context_precision", label: "Context Precision", category: "RAG Quality", tooltip: "Measures how precisely the retrieved context matches the query needs." },
  { value: "context_recall", label: "Context Recall", category: "RAG Quality", tooltip: "Measures how completely the retrieved context covers the needed information." },
  { value: "latency", label: "Latency", category: "System", tooltip: "Average response time across all test cases." },
  { value: "input_tokens", label: "Input Tokens", category: "System", tooltip: "Average input tokens used per query." },
  { value: "output_tokens", label: "Output Tokens", category: "System", tooltip: "Average output tokens generated per query." },
  { value: "total_tokens", label: "Total Tokens", category: "System", tooltip: "Average total tokens used per query." },
  { value: "cost", label: "Cost", category: "System", tooltip: "Estimated cost per query based on token usage." },
]

export interface EvaluationMetrics {
  hitRate: number
  recall: number
  precision: number
  mrr: number
  ndcg: number
  faithfulness: number
  answerRelevance: number
  contextPrecision: number
  contextRecall: number
  latencyMs: number
  inputTokens: number
  outputTokens: number
  totalTokens: number
  cost: number
}

export interface TestCaseResult {
  caseId: string
  status: TestCaseStatus
  metrics: EvaluationMetrics
  actualAnswer: string
  actualSources: { document: string; page: number; section: string; chunkId: string; score: number }[]
  actualSection?: string
  actualPages: number[]
  traceId: string
  runId: string
  failureCategories: FailureCategory[]
  failureExplanation: string
  durationMs: number
  timestamp: string
}

export interface BenchmarkRun {
  id: string
  datasetId: string
  datasetName: string
  datasetVersion: string
  strategy: RagStrategy
  config: BenchmarkConfig
  status: "pending" | "running" | "completed" | "failed" | "cancelled"
  startedAt: string
  completedAt?: string
  totalTests: number
  completedTests: number
  passedTests: number
  partialTests: number
  failedTests: number
  currentTestIndex?: number
  currentQuery?: string
  aggregateMetrics: EvaluationMetrics
  results: TestCaseResult[]
  difficultyBreakdown: Record<Difficulty, Partial<EvaluationMetrics>>
  tagBreakdown: Record<string, Partial<EvaluationMetrics>>
  failureCategories: Record<FailureCategory, number>
}

export interface ComparisonResult {
  metric: string
  runA: { runId: string; value: number }
  runB: { runId: string; value: number }
  absoluteDiff: number
  percentageDiff: number
  improved: boolean
}

export interface DatasetChangeSummary {
  added: number
  removed: number
  modified: number
  unchanged: number
}

// ============================================================
// PART 3: REAL RAG ENGINE TYPES
// ============================================================

// --- Document Types ---
export type DocumentProcessingStatus =
  | "uploaded"
  | "processing"
  | "parsing"
  | "chunking"
  | "embedding"
  | "indexing"
  | "ready"
  | "failed"

export interface DocumentMetadata {
  id: string
  name: string
  path: string
  mimeType: string
  size: number
  createdAt: string
  updatedAt: string
  pageCount: number
  chunkCount: number
  tokenCount: number
  status: DocumentProcessingStatus
  error?: string
}

export interface PageContent {
  documentId: string
  pageNumber: number
  text: string
  section?: string
}

// --- Chunk Types ---
export interface StoredChunk {
  id: string
  documentId: string
  documentName: string
  page: number
  section?: string
  content: string
  tokenCount: number
  embedding?: number[]
  startOffset: number
  endOffset: number
}

// --- Retrieval Types ---
export interface VectorResult {
  chunkId: string
  score: number
  rank: number
  chunk: StoredChunk
}

export interface BM25Result {
  chunkId: string
  score: number
  rank: number
  chunk: StoredChunk
  queryTerms: string[]
  termFreqs: Record<string, number>
}

export interface RRFResult {
  chunkId: string
  rrfScore: number
  vectorRank?: number
  bm25Rank?: number
  vectorScore?: number
  bm25Score?: number
  chunk: StoredChunk
}

export interface RerankResult {
  chunkId: string
  originalScore: number
  rerankScore: number
  rank: number
  chunk: StoredChunk
}

export interface MMRResult {
  chunkId: string
  mmrScore: number
  relevanceScore: number
  maxSimilarity: number
  selected: boolean
  rank: number
  chunk: StoredChunk
}

export interface FinalContextChunk {
  chunkId: string
  documentId: string
  documentName: string
  page: number
  section?: string
  content: string
  score: number
  method: string
  tokenCount: number
  rank: number
}

// --- RAG Config ---
export interface RagEngineConfig {
  strategy: RagStrategy
  vector: {
    embeddingModel: string
    topK: number
    similarity: string
    similarityThreshold?: number
  }
  bm25: {
    topK: number
    language: string
    tokenizer: string
  }
  rrf: {
    k: number
    vectorWeight: number
    bm25Weight: number
  }
  reranker: {
    enabled: boolean
    model?: string
    candidateCount: number
    topN: number
  }
  mmr: {
    enabled: boolean
    lambda: number
    candidateCount: number
    finalCount: number
  }
  llm: {
    model: string
    temperature: number
    maxTokens: number
    systemPrompt?: string
  }
  chunking: {
    chunkSize: number
    chunkOverlap: number
    method: "token" | "character"
  }
}

// --- Trace Types (Part 3) ---
export interface TraceEvent {
  id: string
  traceId: string
  runId: string
  stage: string
  event: string
  timestamp: string
  durationMs?: number
  data: Record<string, unknown>
  error?: string
}

export interface FullTrace {
  id: string
  runId: string
  sessionId: string
  requestId: string
  timestamp: string
  query: string
  strategy: RagStrategy
  config: RagEngineConfig
  events: TraceEvent[]
  queryProcessing: {
    originalQuery: string
    tokenCount: number
    processingDurationMs: number
  }
  vectorSearch?: {
    latencyMs: number
    chunkCount: number
    results: VectorResult[]
  }
  bm25?: {
    latencyMs: number
    chunkCount: number
    queryTerms: string[]
    results: BM25Result[]
  }
  rrf?: {
    latencyMs: number
    inputVectorChunks: number
    inputBM25Chunks: number
    results: RRFResult[]
  }
  reranker?: {
    latencyMs: number
    model?: string
    inputChunkCount: number
    results: RerankResult[]
    skipped?: boolean
    skipReason?: string
  }
  mmr?: {
    latencyMs: number
    lambda: number
    inputChunkCount: number
    selectedChunks: MMRResult[]
    rejectedChunks: MMRResult[]
    skipped?: boolean
    skipReason?: string
  }
  context: {
    chunks: FinalContextChunk[]
    totalTokens: number
    chunkCount: number
    documentCount: number
  }
  prompt: {
    system: string
    context: string
    user: string
    systemTokens: number
    contextTokens: number
    userTokens: number
    totalTokens: number
  }
  llm: {
    provider: string
    model: string
    startTime: string
    endTime: string
    latencyMs: number
    inputTokens: number | null
    outputTokens: number | null
    totalTokens: number | null
    answer: string
    status: "completed" | "failed" | "streaming"
    error?: string
  }
  sources: {
    documentId: string
    documentName: string
    page: number
    section?: string
    chunkId: string
    retrievalMethod: string
    score: number
  }[]
  totalLatencyMs: number
  status: "completed" | "failed" | "partial"
  error?: string
}

// --- Settings ---
export interface AppSettings {
  llmProvider: "groq" | "gemini"
  groqModel: string
  groqApiKey: string
  geminiApiKey: string
  embeddingProvider: "none" | "openai" | "cohere" | "local"
  embeddingModel: string
  embeddingApiKey: string
  vectorSimilarity?: "cosine" | "dot_product" | "l2"
  chunkSize: number
  chunkOverlap: number
  defaultTopK: number
  defaultStrategy: RagStrategy
  systemPrompt: string
  rerankerModel: string
  mmrLambda: number
}

// --- API Response ---
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
  }
}

// --- Benchmark Part 3 ---
export interface BenchmarkExecutionConfig {
  datasetId: string
  datasetVersion: string
  ragConfig: RagEngineConfig
  metrics: BenchmarkMetric[]
}

// ============================================================
// PART 4: KNOWLEDGE BASE & DOCUMENT MANAGEMENT
// ============================================================

export interface KnowledgeBase {
  id: string
  name: string
  description: string
  tags: string[]
  createdAt: string
  updatedAt: string
  settings: KnowledgeBaseSettings
}

export interface KnowledgeBaseSettings {
  defaultChunkSize: number
  defaultChunkOverlap: number
  embeddingProvider: "none" | "openai" | "cohere" | "local"
  embeddingModel: string
}

export interface KnowledgeBaseStats {
  documentCount: number
  readyDocuments: number
  processingDocuments: number
  failedDocuments: number
  chunkCount: number
  totalTokens: number
  indexedChunks: number
}

export interface DocumentFolder {
  id: string
  knowledgeBaseId: string
  name: string
  parentId: string | null
  createdAt: string
  updatedAt: string
}

export interface DocumentVersion {
  id: string
  documentId: string
  versionNumber: number
  filePath: string
  fileSize: number
  createdAt: string
  status: DocumentProcessingStatus
  pageCount: number
  chunkCount: number
  tokenCount: number
  error?: string
  isLatest: boolean
}

export interface ProcessingHistoryEvent {
  id: string
  documentId: string
  knowledgeBaseId?: string
  action: ProcessingAction
  startedAt: string
  completedAt?: string
  durationMs?: number
  status: "running" | "completed" | "failed"
  error?: string
  config?: Record<string, unknown>
  resultSummary?: string
}

export type ProcessingAction =
  | "upload"
  | "parse"
  | "chunk"
  | "embed"
  | "index"
  | "re-chunk"
  | "re-index"
  | "re-process"
  | "replace"
  | "restore"
  | "retry"
  | "delete"

// Extended DocumentMetadata for Part 4
export interface DocumentWithVersion extends DocumentMetadata {
  knowledgeBaseId?: string
  folderId?: string
  versionNumber: number
  description?: string
  tags?: string[]
}

export interface DocumentChunkWithMeta extends StoredChunk {
  embeddingStatus: "not_embedded" | "embedded" | "stale"
  indexStatus: "not_indexed" | "indexed" | "stale"
  createdAt?: string
  updatedAt?: string
}
