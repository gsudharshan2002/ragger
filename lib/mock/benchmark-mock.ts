import type {
  GoldenDataset,
  GoldenCase,
  DatasetVersion,
  BenchmarkRun,
  BenchmarkConfig,
  TestCaseResult,
  EvaluationMetrics,
  RagStrategy,
  Difficulty,
  FailureCategory,
  Chunk,
} from "../types"

const SAMPLE_DOCUMENTS = [
  "RAG_Architecture.pdf",
  "Retrieval_Guide.pdf",
  "Search_Architecture.pdf",
  "Embedding_Models.pdf",
  "Chunking_Strategies.pdf",
  "Vector_Indexing.pdf",
  "Reranking_Methods.pdf",
]

const SAMPLE_SECTIONS = [
  "Introduction",
  "Methodology",
  "Hybrid Retrieval",
  "Vector Search",
  "BM25 Ranking",
  "Cross-Encoder Reranking",
  "MMR Selection",
  "Context Building",
  "Evaluation",
  "Results",
  "Discussion",
  "Architecture",
  "Implementation",
  "Conclusion",
]

const SAMPLE_TAGS = [
  "multi-hop",
  "technical",
  "retrieval",
  "ranking",
  "citation",
  "long-context",
  "ambiguous",
  "numerical",
  "domain-specific",
  "cross-document",
  "aggregation",
  "temporal",
]

function generateId(): string {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36).slice(-4)
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, n)
}

function randomBetween(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 1000) / 1000
}

function generateMetrics(): EvaluationMetrics {
  return {
    hitRate: randomBetween(0.5, 1.0),
    recall: randomBetween(0.4, 1.0),
    precision: randomBetween(0.3, 1.0),
    mrr: randomBetween(0.3, 1.0),
    ndcg: randomBetween(0.3, 1.0),
    faithfulness: randomBetween(0.5, 1.0),
    answerRelevance: randomBetween(0.4, 1.0),
    contextPrecision: randomBetween(0.3, 1.0),
    contextRecall: randomBetween(0.4, 1.0),
    latencyMs: Math.floor(Math.random() * 2000) + 500,
    inputTokens: Math.floor(Math.random() * 2000) + 200,
    outputTokens: Math.floor(Math.random() * 500) + 50,
    totalTokens: 0,
    cost: 0,
  }
}

function generateGoldenCases(count: number): GoldenCase[] {
  const queries = [
    "How does RRF combine vector and BM25 retrieval results?",
    "What is the difference between bi-encoder and cross-encoder reranking?",
    "How does MMR balance relevance and diversity in retrieval?",
    "What are the key parameters for tuning BM25 retrieval?",
    "How does chunk size affect retrieval quality?",
    "What is the role of the embedding model in vector search?",
    "How does hybrid retrieval improve over single-method retrieval?",
    "What is the impact of Top K on retrieval recall?",
    "How does the reranker handle ambiguous queries?",
    "What happens when no relevant documents are retrieved?",
    "How are document embeddings generated and stored?",
    "What is the difference between cosine similarity and dot product?",
    "How does the context window size affect LLM generation?",
    "What techniques improve retrieval for multi-hop questions?",
    "How does metadata filtering improve retrieval precision?",
    "What is the effect of overlap in chunk tokenization?",
    "How does HyDE improve query-document matching?",
    "What are the trade-offs between different fusion strategies?",
    "How does the system handle queries across multiple documents?",
    "What role does the system prompt play in RAG quality?",
    "How does temperature affect the faithfulness of generated answers?",
    "What is the latency breakdown of a typical RAG query?",
    "How does the token limit affect context selection?",
    "What metrics best measure RAG pipeline quality?",
    "How does BM25 handle synonyms and paraphrases?",
  ]

  const answers = [
    "RRF combines ranked lists by assigning scores based on rank positions using the formula RRF(d) = Σ 1/(k + rank_i(d)), which merges results without requiring score normalization between different retrieval methods.",
    "Bi-encoders encode query and document independently for fast retrieval, while cross-encoders evaluate query-document pairs jointly for more accurate reranking but at higher computational cost.",
    "MMR balances relevance and diversity by penalizing documents similar to already-selected ones. The lambda parameter controls the trade-off: higher lambda prioritizes relevance, lower lambda prioritizes diversity.",
    "Key BM25 parameters include k1 (term frequency saturation), b (length normalization), and top_k (number of results). Language and tokenizer settings also affect retrieval quality.",
    "Larger chunks provide more context but may dilute relevance. Smaller chunks are more precise but may lack sufficient context. Typical optimal sizes range from 256-512 tokens with 50-128 token overlap.",
    "The embedding model converts text into dense vector representations that capture semantic meaning. Model choice affects retrieval quality, latency, and dimensionality of the vector index.",
    "Hybrid retrieval combines vector search (semantic matching) with BM25 (lexical matching) to leverage the strengths of both approaches, improving recall across diverse query types.",
    "Higher Top K increases recall but may introduce noise. Lower Top K improves precision but risks missing relevant documents. The optimal value depends on the use case and context window size.",
    "Modern rerankers use learned attention mechanisms to handle ambiguity by attending to different parts of the query-document pair, though very ambiguous queries may still produce uncertain rankings.",
    "When no relevant documents are retrieved, the system should indicate this clearly rather than generating an answer based on irrelevant context. This is a key failure mode to monitor.",
  ]

  const difficulties: Difficulty[] = ["easy", "medium", "hard", "expert"]

  return Array.from({ length: count }, (_, i) => {
    const difficulty = difficulties[Math.floor(Math.random() * difficulties.length)]
    const expectedDoc = pick(SAMPLE_DOCUMENTS)
    const expectedSection = pick(SAMPLE_SECTIONS)
    const expectedPage = Math.floor(Math.random() * 40) + 1
    const expectedChunkId = `chunk_${String(Math.floor(Math.random() * 500) + 1).padStart(4, "0")}`

    return {
      id: `case_${generateId()}`,
      query: queries[i % queries.length],
      expectedAnswer: answers[i % answers.length],
      expectedSources: [
        {
          id: generateId(),
          document: expectedDoc,
          section: expectedSection,
          page: expectedPage,
          chunkId: expectedChunkId,
        },
      ],
      expectedSection,
      expectedPages: [expectedPage, expectedPage + 1],
      whyDifficult: `This query ${difficulty === "expert" ? "requires multi-hop reasoning across multiple documents and sections" : difficulty === "hard" ? "requires understanding relationships between concepts across sections" : difficulty === "medium" ? "requires careful analysis of technical content" : "tests basic understanding of core concepts"}.`,
      difficulty,
      tags: pickN(SAMPLE_TAGS, Math.floor(Math.random() * 3) + 1),
      status: "not_run",
    }
  })
}

function generateTestCaseResult(goldenCase: GoldenCase, strategy: RagStrategy): TestCaseResult {
  const metrics = generateMetrics()
  metrics.totalTokens = metrics.inputTokens + metrics.outputTokens
  metrics.cost = metrics.inputTokens * 0.000003 + metrics.outputTokens * 0.000015

  const retrievedDoc = pick(SAMPLE_DOCUMENTS)
  const actualSources = [
    {
      document: retrievedDoc,
      page: Math.floor(Math.random() * 40) + 1,
      section: pick(SAMPLE_SECTIONS),
      chunkId: `chunk_${String(Math.floor(Math.random() * 500) + 1).padStart(4, "0")}`,
      score: randomBetween(0.6, 0.98),
    },
  ]

  const expectedDoc = goldenCase.expectedSources[0]?.document
  const failureCategories: FailureCategory[] = []

  if (metrics.hitRate < 0.5) failureCategories.push("retrieval_failure")
  if (expectedDoc && !actualSources.some((s) => s.document === expectedDoc)) {
    failureCategories.push("missing_source")
  }
  if (metrics.precision < 0.4) failureCategories.push("poor_ranking")
  if (metrics.recall < 0.5) failureCategories.push("poor_context")
  if (metrics.faithfulness < 0.5) failureCategories.push("poor_answer")
  if (metrics.contextRecall < 0.4) failureCategories.push("citation_failure")
  if (metrics.latencyMs > 3000) failureCategories.push("latency_failure")

  let status: TestCaseResult["status"] = "passed"
  if (failureCategories.length === 0) {
    status = metrics.hitRate > 0.8 ? "passed" : "partial"
  } else if (failureCategories.length >= 2) {
    status = "failed"
  } else {
    status = "partial"
  }

  const failureExplanations: Record<FailureCategory, string> = {
    retrieval_failure: "The expected document was not found in the top retrieved results.",
    missing_source: `The expected document "${expectedDoc}" was not retrieved by the system.`,
    wrong_source: "A different document was retrieved instead of the expected one.",
    poor_ranking: "The expected source was retrieved but ranked too low in the results.",
    poor_context: "The retrieved context did not contain sufficient relevant information.",
    poor_answer: "The generated answer did not adequately address the query.",
    citation_failure: "The answer lacked proper citation of the source documents.",
    latency_failure: "The query exceeded the maximum acceptable latency threshold.",
    token_limit_failure: "The query exceeded the token limit for the context window.",
  }

  return {
    caseId: goldenCase.id,
    status,
    metrics,
    actualAnswer: `Generated answer for: ${goldenCase.query}. The system retrieved relevant information and produced a response based on the available context.`,
    actualSources,
    actualSection: pick(SAMPLE_SECTIONS),
    actualPages: [Math.floor(Math.random() * 40) + 1],
    traceId: `trace_${generateId()}`,
    runId: `run_${generateId()}`,
    failureCategories,
    failureExplanation: failureCategories.length > 0
      ? failureCategories.map((fc) => failureExplanations[fc]).join(" ")
      : "Test passed successfully.",
    durationMs: metrics.latencyMs,
    timestamp: new Date().toISOString(),
  }
}

export function generateMockDataset(): GoldenDataset {
  const cases = generateGoldenCases(24)
  return {
    id: "ds_prod_001",
    name: "Production Knowledge Base",
    description: "Core test cases for production RAG pipeline evaluation",
    tags: ["production", "core"],
    versions: [
      {
        id: "v1",
        version: "v1.0",
        cases,
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        changeNote: "Initial dataset",
      },
      {
        id: "v2",
        version: "v1.1",
        cases: [...cases.slice(0, 20), ...generateGoldenCases(4)],
        createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        changeNote: "Added 4 new test cases for edge cases",
      },
      {
        id: "v3",
        version: "v1.2",
        cases: [...cases.slice(0, 22), ...generateGoldenCases(6)],
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        changeNote: "Added multi-hop test cases",
      },
    ],
    currentVersion: "v1.2",
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  }
}

export function generateMockDatasets(): GoldenDataset[] {
  return [
    generateMockDataset(),
    {
      id: "ds_tech_002",
      name: "Technical Documentation",
      description: "Test cases focused on technical RAG documentation queries",
      tags: ["technical", "documentation"],
      versions: [
        {
          id: "v1",
          version: "v1.0",
          cases: generateGoldenCases(18),
          createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ],
      currentVersion: "v1.0",
      createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "ds_edge_003",
      name: "Edge Cases & Failures",
      description: "Hard and expert-level queries designed to stress-test the pipeline",
      tags: ["edge-cases", "stress-test"],
      versions: [
        {
          id: "v1",
          version: "v1.0",
          cases: generateGoldenCases(12),
          createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ],
      currentVersion: "v1.0",
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ]
}

export function generateMockBenchmarkRun(
  dataset: GoldenDataset,
  config: BenchmarkConfig
): BenchmarkRun {
  const version = dataset.versions.find((v) => v.version === config.datasetVersion) || dataset.versions[dataset.versions.length - 1]
  const cases = version.cases
  const results = cases.map((c) => generateTestCaseResult(c, config.strategy))

  const passedTests = results.filter((r) => r.status === "passed").length
  const partialTests = results.filter((r) => r.status === "partial").length
  const failedTests = results.filter((r) => r.status === "failed").length

  const avgMetrics: EvaluationMetrics = {
    hitRate: results.reduce((s, r) => s + r.metrics.hitRate, 0) / results.length,
    recall: results.reduce((s, r) => s + r.metrics.recall, 0) / results.length,
    precision: results.reduce((s, r) => s + r.metrics.precision, 0) / results.length,
    mrr: results.reduce((s, r) => s + r.metrics.mrr, 0) / results.length,
    ndcg: results.reduce((s, r) => s + r.metrics.ndcg, 0) / results.length,
    faithfulness: results.reduce((s, r) => s + r.metrics.faithfulness, 0) / results.length,
    answerRelevance: results.reduce((s, r) => s + r.metrics.answerRelevance, 0) / results.length,
    contextPrecision: results.reduce((s, r) => s + r.metrics.contextPrecision, 0) / results.length,
    contextRecall: results.reduce((s, r) => s + r.metrics.contextRecall, 0) / results.length,
    latencyMs: results.reduce((s, r) => s + r.metrics.latencyMs, 0) / results.length,
    inputTokens: results.reduce((s, r) => s + r.metrics.inputTokens, 0) / results.length,
    outputTokens: results.reduce((s, r) => s + r.metrics.outputTokens, 0) / results.length,
    totalTokens: results.reduce((s, r) => s + r.metrics.totalTokens, 0) / results.length,
    cost: results.reduce((s, r) => s + r.metrics.cost, 0) / results.length,
  }

  const difficultyBreakdown: Record<Difficulty, Partial<EvaluationMetrics>> = {} as Record<Difficulty, Partial<EvaluationMetrics>>
  for (const d of ["easy", "medium", "hard", "expert"] as Difficulty[]) {
    const dResults = results.filter((r) => {
      const gc = cases.find((c) => c.id === r.caseId)
      return gc?.difficulty === d
    })
    if (dResults.length > 0) {
      difficultyBreakdown[d] = {
        hitRate: dResults.reduce((s, r) => s + r.metrics.hitRate, 0) / dResults.length,
        recall: dResults.reduce((s, r) => s + r.metrics.recall, 0) / dResults.length,
        precision: dResults.reduce((s, r) => s + r.metrics.precision, 0) / dResults.length,
        mrr: dResults.reduce((s, r) => s + r.metrics.mrr, 0) / dResults.length,
        answerRelevance: dResults.reduce((s, r) => s + r.metrics.answerRelevance, 0) / dResults.length,
        faithfulness: dResults.reduce((s, r) => s + r.metrics.faithfulness, 0) / dResults.length,
      }
    }
  }

  const tagBreakdown: Record<string, Partial<EvaluationMetrics>> = {}
  const allTags = new Set(cases.flatMap((c) => c.tags))
  for (const tag of allTags) {
    const tResults = results.filter((r) => {
      const gc = cases.find((c) => c.id === r.caseId)
      return gc?.tags.includes(tag)
    })
    if (tResults.length > 0) {
      tagBreakdown[tag] = {
        hitRate: tResults.reduce((s, r) => s + r.metrics.hitRate, 0) / tResults.length,
        recall: tResults.reduce((s, r) => s + r.metrics.recall, 0) / tResults.length,
        precision: tResults.reduce((s, r) => s + r.metrics.precision, 0) / tResults.length,
        mrr: tResults.reduce((s, r) => s + r.metrics.mrr, 0) / tResults.length,
      }
    }
  }

  const failureCategories: Record<FailureCategory, number> = {
    retrieval_failure: 0,
    missing_source: 0,
    wrong_source: 0,
    poor_ranking: 0,
    poor_context: 0,
    poor_answer: 0,
    citation_failure: 0,
    latency_failure: 0,
    token_limit_failure: 0,
  }
  for (const r of results) {
    for (const fc of r.failureCategories) {
      failureCategories[fc]++
    }
  }

  return {
    id: `bench_${generateId()}`,
    datasetId: dataset.id,
    datasetName: dataset.name,
    datasetVersion: config.datasetVersion,
    strategy: config.strategy,
    config,
    status: "completed",
    startedAt: new Date(Date.now() - results.length * 200).toISOString(),
    completedAt: new Date().toISOString(),
    totalTests: cases.length,
    completedTests: cases.length,
    passedTests,
    partialTests,
    failedTests,
    aggregateMetrics: avgMetrics,
    results,
    difficultyBreakdown,
    tagBreakdown,
    failureCategories,
  }
}

export function generateMockBenchmarkRuns(dataset: GoldenDataset): BenchmarkRun[] {
  const strategies: RagStrategy[] = ["vector", "bm25", "hybrid", "hybrid-rrf", "hybrid-rerank", "hybrid-rerank-mmr"]
  return strategies.map((strategy, i) => {
    const config: BenchmarkConfig = {
      datasetId: dataset.id,
      datasetVersion: dataset.currentVersion,
      strategy,
      vector: { embeddingModel: "text-embedding-3-large", topK: 20, similarity: "Cosine" },
      bm25: { topK: 20, language: "english", tokenizer: "standard" },
      rrf: { k: 60, vectorWeight: 1, bm25Weight: 1 },
      reranker: { model: "cross-encoder/ms-marco-MiniLM-L-6-v2", candidateCount: 20, topN: 8 },
      mmr: { lambda: 0.7, candidateCount: 15, finalCount: 8 },
      llm: { model: "gpt-4o", temperature: 0.7, maxTokens: 2048 },
      metrics: ["hit_rate", "recall", "precision", "mrr", "ndcg", "faithfulness", "answer_relevance"],
    }
    const run = generateMockBenchmarkRun(dataset, config)
    run.startedAt = new Date(Date.now() - (strategies.length - i) * 3600000).toISOString()
    run.completedAt = new Date(Date.now() - (strategies.length - i - 1) * 3600000).toISOString()
    return run
  })
}

export function generateMockTraceForCase() {
  const traceId = `trace_${generateId()}`
  const runId = `run_${generateId()}`
  const stages: Record<string, { status: "completed"; latencyMs: number }> = {
    query: { status: "completed", latencyMs: Math.floor(Math.random() * 40) + 15 },
    vector: { status: "completed", latencyMs: Math.floor(Math.random() * 150) + 100 },
    bm25: { status: "completed", latencyMs: Math.floor(Math.random() * 80) + 40 },
    rrf: { status: "completed", latencyMs: Math.floor(Math.random() * 15) + 5 },
    reranker: { status: "completed", latencyMs: Math.floor(Math.random() * 300) + 200 },
    mmr: { status: "completed", latencyMs: Math.floor(Math.random() * 30) + 10 },
    context: { status: "completed", latencyMs: Math.floor(Math.random() * 20) + 8 },
    prompt: { status: "completed", latencyMs: Math.floor(Math.random() * 15) + 5 },
    llm: { status: "completed", latencyMs: Math.floor(Math.random() * 1000) + 600 },
  }

  const totalDurationMs = Object.values(stages).reduce((s, st) => s + st.latencyMs, 0)

  return {
    overview: {
      traceId,
      runId,
      sessionId: `sess_${generateId()}`,
      requestId: `req_${generateId()}`,
      timestamp: new Date().toISOString() as string,
      status: "completed" as const,
      totalDurationMs,
      strategy: "hybrid-rerank-mmr" as RagStrategy,
      model: "gpt-4o",
      embeddingModel: "text-embedding-3-large",
      rerankerModel: "cross-encoder/ms-marco-MiniLM-L-6-v2",
      environment: "development",
      version: "1.0.0",
      stages,
    },
  }
}

export function importGoldenCases(jsonStr: string): { cases: GoldenCase[]; errors: string[] } {
  const errors: string[] = []
  try {
    const data = JSON.parse(jsonStr)
    const items = Array.isArray(data) ? data : data.cases || data.testCases || []
    const cases: GoldenCase[] = []

    items.forEach((item: Record<string, unknown>, i: number) => {
      if (!item.query) {
        errors.push(`Test case ${i + 1} is missing Query.`)
        return
      }
      cases.push({
        id: item.id as string || generateId(),
        query: item.query as string,
        expectedAnswer: (item.expectedAnswer as string) || "",
        expectedSources: Array.isArray(item.expectedSources) ? item.expectedSources as ExpectedSource[] : [],
        expectedSection: item.expectedSection as string | undefined,
        expectedPages: Array.isArray(item.expectedPages) ? item.expectedPages as number[] : [],
        whyDifficult: (item.whyDifficult as string) || "",
        difficulty: (item.difficulty as Difficulty) || "medium",
        tags: Array.isArray(item.tags) ? item.tags as string[] : [],
        status: "not_run",
      })
    })

    return { cases, errors }
  } catch {
    return { cases: [], errors: ["Invalid JSON format. Please provide a valid JSON file."] }
  }
}

import type { ExpectedSource } from "../types"
