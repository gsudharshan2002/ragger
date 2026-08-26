import type { MMRResult, StoredChunk } from "@/lib/types"

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((t) => t.length > 0)
}

function cosineSimilarityVec(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0

  let dot = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB)
  if (denom === 0) return 0
  return dot / denom
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

function chunkSimilarity(a: StoredChunk, b: StoredChunk): number {
  if (a.embedding && b.embedding) {
    return cosineSimilarityVec(a.embedding, b.embedding)
  }

  const tokensA = tokenize(a.content)
  const tokensB = tokenize(b.content)
  return jaccardSimilarity(tokensA, tokensB)
}

export function mmrSelection(
  chunks: StoredChunk[],
  scores: number[],
  lambda: number,
  candidateCount: number,
  finalCount: number,
): MMRResult[] {
  const candidateChunks = chunks.slice(0, candidateCount)
  const candidateScores = scores.slice(0, candidateCount)
  const n = candidateChunks.length

  const results: MMRResult[] = candidateChunks.map((chunk, i) => ({
    chunkId: chunk.id,
    mmrScore: 0,
    relevanceScore: candidateScores[i] ?? 0,
    maxSimilarity: 0,
    selected: false,
    rank: 0,
    chunk,
  }))

  if (n === 0) return results

  const selectedIndices: number[] = []
  const remainingIndices = new Set(Array.from({ length: n }, (_, i) => i))

  const maxRelevance = Math.max(...candidateScores)
  const normalizeFactor = maxRelevance > 0 ? maxRelevance : 1

  const firstIdx = candidateScores.indexOf(maxRelevance)
  results[firstIdx].mmrScore = 1
  results[firstIdx].maxSimilarity = 0
  results[firstIdx].selected = true
  results[firstIdx].rank = 1
  selectedIndices.push(firstIdx)
  remainingIndices.delete(firstIdx)

  let rank = 2

  while (selectedIndices.length < finalCount && remainingIndices.size > 0) {
    let bestIdx = -1
    let bestMmr = -Infinity

    for (const candidateIdx of remainingIndices) {
      let maxSimWithSelected = 0

      for (const selectedIdx of selectedIndices) {
        const sim = chunkSimilarity(
          candidateChunks[candidateIdx],
          candidateChunks[selectedIdx],
        )
        if (sim > maxSimWithSelected) {
          maxSimWithSelected = sim
        }
      }

      const normalizedRelevance =
        (candidateScores[candidateIdx] ?? 0) / normalizeFactor
      const mmr =
        lambda * normalizedRelevance - (1 - lambda) * maxSimWithSelected

      if (mmr > bestMmr) {
        bestMmr = mmr
        bestIdx = candidateIdx
      }
    }

    if (bestIdx === -1) break

    let bestMaxSim = 0
    for (const selectedIdx of selectedIndices) {
      const sim = chunkSimilarity(candidateChunks[bestIdx], candidateChunks[selectedIdx])
      if (sim > bestMaxSim) bestMaxSim = sim
    }

    results[bestIdx].mmrScore = bestMmr
    results[bestIdx].maxSimilarity = bestMaxSim
    results[bestIdx].selected = true
    results[bestIdx].rank = rank

    selectedIndices.push(bestIdx)
    remainingIndices.delete(bestIdx)
    rank++
  }

  for (const idx of remainingIndices) {
    const candidateIdx = idx
    let maxSimWithSelected = 0

    for (const selectedIdx of selectedIndices) {
      const sim = chunkSimilarity(
        candidateChunks[candidateIdx],
        candidateChunks[selectedIdx],
      )
      if (sim > maxSimWithSelected) {
        maxSimWithSelected = sim
      }
    }

    const normalizedRelevance =
      (candidateScores[candidateIdx] ?? 0) / normalizeFactor
    const mmr =
      lambda * normalizedRelevance - (1 - lambda) * maxSimWithSelected

    results[candidateIdx].mmrScore = mmr
    results[candidateIdx].maxSimilarity = maxSimWithSelected
    results[candidateIdx].selected = false
    results[candidateIdx].rank = 0
  }

  return results
}
