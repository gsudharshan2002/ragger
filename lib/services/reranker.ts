import type { RerankResult, StoredChunk } from "@/lib/types"
import { getSettings } from "./settings"

const COHERE_RERANK_URL = "https://api.cohere.ai/v1/rerank"

export function isRerankerConfigured(): boolean {
  return true
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((t) => t.length > 0)
}

function jaccardSimilarity(a: string[], b: string[]): number {
  const setA = new Set(a)
  const setB = new Set(b)
  const intersection = new Set<string>()

  for (const term of setA) {
    if (setB.has(term)) intersection.add(term)
  }

  const unionSize = setA.size + setB.size - intersection.size
  if (unionSize === 0) return 0
  return intersection.size / unionSize
}

function termFrequencyScore(queryTokens: string[], chunkTokens: string[]): number {
  if (queryTokens.length === 0) return 0

  const chunkTokenCounts = new Map<string, number>()
  for (const token of chunkTokens) {
    chunkTokenCounts.set(token, (chunkTokenCounts.get(token) || 0) + 1)
  }

  let score = 0
  for (const queryToken of queryTokens) {
    const freq = chunkTokenCounts.get(queryToken) || 0
    if (freq > 0) {
      score += 1 + Math.log(1 + freq)
    }
  }

  return score / queryTokens.length
}

function heuristicRerankScore(queryTokens: string[], chunkTokens: string[]): number {
  const jaccard = jaccardSimilarity(queryTokens, chunkTokens)
  const tfScore = termFrequencyScore(queryTokens, chunkTokens)
  return 0.5 * jaccard + 0.5 * tfScore
}

async function callCohereRerank(
  query: string,
  chunks: StoredChunk[],
  topN: number,
): Promise<number[]> {
  const settings = await getSettings()
  const apiKey = settings.embeddingApiKey || process.env.EMBEDDING_API_KEY

  if (!apiKey) {
    throw new Error("No API key available for reranking")
  }

  const documents = chunks.map((c) => c.content)

  const response = await fetch(COHERE_RERANK_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "rerank-english-v3.0",
      query,
      documents,
      top_n: topN,
      return_documents: false,
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Cohere rerank failed (${response.status}): ${err}`)
  }

  const data = (await response.json()) as {
    results: { index: number; relevance_score: number }[]
  }

  const scores = new Array(chunks.length).fill(0)
  for (const r of data.results) {
    scores[r.index] = r.relevance_score
  }

  return scores
}

export async function rerankChunks(
  query: string,
  chunks: StoredChunk[],
  candidateCount: number,
  topN: number,
): Promise<RerankResult[]> {
  const candidates = chunks.slice(0, candidateCount)
  let scores: number[]

  try {
    scores = await callCohereRerank(query, candidates, topN)
  } catch {
    console.warn(
      "[reranker] Cohere rerank unavailable, using heuristic fallback.",
    )
    const queryTokens = tokenize(query)
    scores = candidates.map((chunk) => {
      const chunkTokens = tokenize(chunk.content)
      return heuristicRerankScore(queryTokens, chunkTokens)
    })
  }

  const results: RerankResult[] = candidates.map((chunk, i) => ({
    chunkId: chunk.id,
    originalScore: scores[i] ?? 0,
    rerankScore: scores[i] ?? 0,
    rank: 0,
    chunk,
  }))

  results.sort((a, b) => b.rerankScore - a.rerankScore)

  for (let i = 0; i < results.length; i++) {
    results[i].rank = i + 1
  }

  return results.slice(0, topN)
}
