import { VectorResult, StoredChunk } from "@/lib/types"
import { readJson, writeJson, getDataPath } from "./storage"

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0) return 0
  if (a.length !== b.length) return 0

  let dot = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  normA = Math.sqrt(normA)
  normB = Math.sqrt(normB)

  if (normA === 0 || normB === 0) return 0

  return dot / (normA * normB)
}

export function vectorSearch(
  queryEmbedding: number[],
  chunks: StoredChunk[],
  topK: number,
  threshold?: number
): VectorResult[] {
  if (queryEmbedding.length === 0 || chunks.length === 0) return []

  const scored: VectorResult[] = []

  for (const chunk of chunks) {
    if (!chunk.embedding || chunk.embedding.length === 0) continue
    if (chunk.embedding.length !== queryEmbedding.length) continue

    const score = cosineSimilarity(queryEmbedding, chunk.embedding)

    if (threshold !== undefined && score < threshold) continue

    scored.push({
      chunkId: chunk.id,
      score,
      rank: 0,
      chunk,
    })
  }

  scored.sort((a, b) => b.score - a.score)

  return scored.slice(0, topK).map((result, i) => ({
    ...result,
    rank: i + 1,
  }))
}
