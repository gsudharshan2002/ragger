import type { EvaluationMetrics } from "@/lib/types"

export function calculateHitRate(
  retrievedChunkIds: string[],
  expectedChunkIds: string[],
): number {
  const expected = new Set(expectedChunkIds)
  return retrievedChunkIds.some((id) => expected.has(id)) ? 1 : 0
}

export function calculateRecall(
  retrievedChunkIds: string[],
  expectedChunkIds: string[],
): number {
  if (expectedChunkIds.length === 0) return 0
  const retrieved = new Set(retrievedChunkIds)
  return expectedChunkIds.filter((id) => retrieved.has(id)).length / expectedChunkIds.length
}

export function calculatePrecision(
  retrievedChunkIds: string[],
  expectedChunkIds: string[],
  topK: number,
): number {
  if (topK === 0) return 0
  const expected = new Set(expectedChunkIds)
  return retrievedChunkIds.filter((id) => expected.has(id)).length / topK
}

export function calculateMRR(
  retrievedLists: string[][],
  expectedIds: string[],
): number {
  if (retrievedLists.length === 0) return 0
  const expected = new Set(expectedIds)
  let sum = 0
  for (const list of retrievedLists) {
    for (let i = 0; i < list.length; i++) {
      if (expected.has(list[i])) {
        sum += 1 / (i + 1)
        break
      }
    }
  }
  return sum / retrievedLists.length
}

export function calculateNDCG(
  retrievedLists: string[][],
  expectedIds: string[],
  k: number = 10,
): number {
  if (retrievedLists.length === 0 || expectedIds.length === 0) return 0
  const expected = new Set(expectedIds)

  function dcg(list: string[], limit: number): number {
    let score = 0
    for (let i = 0; i < Math.min(list.length, limit); i++) {
      const rel = expected.has(list[i]) ? 1 : 0
      score += (Math.pow(2, rel) - 1) / Math.log2(i + 2)
    }
    return score
  }

  const idealCount = Math.min(expectedIds.length, k)
  const idealList = Array.from({ length: idealCount }, (_, i) => `rel_${i}`)
  const idcg = dcg(idealList, k)
  if (idcg === 0) return 0

  let totalNdcg = 0
  for (const list of retrievedLists) {
    totalNdcg += dcg(list, k) / idcg
  }
  return totalNdcg / retrievedLists.length
}

export interface EvaluationResult {
  hitRate: number
  recall: number
  precision: number
  mrr: number
  ndcg: number
  availableMetrics: string[]
  unavailableMetrics: string[]
}

export function evaluateRagResults(
  retrievedChunks: { chunkId: string; documentId: string }[],
  groundTruth: { expectedChunkIds: string[]; query: string }[],
  topK: number,
): EvaluationResult {
  const allExpected = new Set<string>()
  for (const gt of groundTruth) {
    for (const id of gt.expectedChunkIds) {
      allExpected.add(id)
    }
  }

  const allRetrievedIds = retrievedChunks.map((c) => c.chunkId)
  const expectedIds = Array.from(allExpected)

  const availableMetrics: string[] = []
  const unavailableMetrics: string[] = []

  if (expectedIds.length === 0) {
    unavailableMetrics.push("hit_rate", "recall", "precision", "mrr", "ndcg")
    return {
      hitRate: 0,
      recall: 0,
      precision: 0,
      mrr: 0,
      ndcg: 0,
      availableMetrics: [],
      unavailableMetrics,
    }
  }

  const hitRate = calculateHitRate(allRetrievedIds, expectedIds)
  const recall = calculateRecall(allRetrievedIds, expectedIds)
  const precision = calculatePrecision(allRetrievedIds, expectedIds, topK)
  const mrr = calculateMRR([allRetrievedIds], expectedIds)
  const ndcg = calculateNDCG([allRetrievedIds], expectedIds)

  availableMetrics.push("hit_rate", "recall", "precision", "mrr", "ndcg")

  return {
    hitRate,
    recall,
    precision,
    mrr,
    ndcg,
    availableMetrics,
    unavailableMetrics,
  }
}
