import type { RRFResult, VectorResult, BM25Result, StoredChunk } from "@/lib/types"

export function rrfFusion(
  vectorResults: VectorResult[],
  bm25Results: BM25Result[],
  k: number = 60,
  vectorWeight: number = 1.0,
  bm25Weight: number = 1.0,
): RRFResult[] {
  const combinedScores = new Map<
    string,
    {
      score: number
      vectorRank?: number
      bm25Rank?: number
      vectorScore?: number
      bm25Score?: number
      chunk?: StoredChunk
    }
  >()

  for (const result of vectorResults) {
    const existing = combinedScores.get(result.chunkId)
    const rrfContribution = vectorWeight * (1 / (k + result.rank))

    if (existing) {
      existing.score += rrfContribution
      existing.vectorRank = result.rank
      existing.vectorScore = result.score
      existing.chunk = result.chunk
    } else {
      combinedScores.set(result.chunkId, {
        score: rrfContribution,
        vectorRank: result.rank,
        vectorScore: result.score,
        chunk: result.chunk,
      })
    }
  }

  for (const result of bm25Results) {
    const existing = combinedScores.get(result.chunkId)
    const rrfContribution = bm25Weight * (1 / (k + result.rank))

    if (existing) {
      existing.score += rrfContribution
      existing.bm25Rank = result.rank
      existing.bm25Score = result.score
      if (!existing.chunk) existing.chunk = result.chunk
    } else {
      combinedScores.set(result.chunkId, {
        score: rrfContribution,
        bm25Rank: result.rank,
        bm25Score: result.score,
        chunk: result.chunk,
      })
    }
  }

  const results: RRFResult[] = []

  for (const [chunkId, data] of combinedScores) {
    if (!data.chunk) continue

    results.push({
      chunkId,
      rrfScore: data.score,
      vectorRank: data.vectorRank,
      bm25Rank: data.bm25Rank,
      vectorScore: data.vectorScore,
      bm25Score: data.bm25Score,
      chunk: data.chunk,
    })
  }

  results.sort((a, b) => b.rrfScore - a.rrfScore)

  return results
}
