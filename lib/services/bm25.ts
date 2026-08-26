import { BM25Result, StoredChunk } from "@/lib/types"

const STOPWORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "could",
  "should", "may", "might", "can", "shall", "to", "of", "in", "for",
  "on", "with", "at", "by", "from", "as", "into", "through", "during",
  "before", "after", "above", "below", "between", "out", "off", "over",
  "under", "again", "further", "then", "once", "here", "there", "when",
  "where", "why", "how", "all", "both", "each", "few", "more", "most",
  "other", "some", "such", "no", "nor", "not", "only", "own", "same",
  "so", "than", "too", "very", "s", "t", "just", "don", "now",
])

const K1 = 1.5
const B = 0.75

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]/)
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t))
}

function computeTermFreqs(tokens: string[]): Record<string, number> {
  const freqs: Record<string, number> = {}
  for (const token of tokens) {
    freqs[token] = (freqs[token] || 0) + 1
  }
  return freqs
}

export function bm25Search(
  query: string,
  chunks: StoredChunk[],
  topK: number
): BM25Result[] {
  const queryTerms = tokenize(query)
  if (queryTerms.length === 0 || chunks.length === 0) return []

  const docTokens: string[][] = chunks.map((c) => tokenize(c.content))
  const docLengths = docTokens.map((t) => t.length)
  const avgdl = docLengths.reduce((a, b) => a + b, 0) / docLengths.length

  const N = chunks.length

  const docFreq: Record<string, number> = {}
  for (const tokens of docTokens) {
    const unique = new Set(tokens)
    for (const term of unique) {
      docFreq[term] = (docFreq[term] || 0) + 1
    }
  }

  const uniqueQueryTerms = [...new Set(queryTerms)]

  const scores: BM25Result[] = []

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]
    const tokens = docTokens[i]
    const termFreqs = computeTermFreqs(tokens)
    const dl = docLengths[i]

    let score = 0
    for (const term of uniqueQueryTerms) {
      const n = docFreq[term] || 0
      const idf = Math.log((N - n + 0.5) / (n + 0.5) + 1)
      const tf = termFreqs[term] || 0
      const numerator = tf * (K1 + 1)
      const denominator = tf + K1 * (1 - B + B * (dl / avgdl))
      score += idf * (numerator / denominator)
    }

    scores.push({
      chunkId: chunk.id,
      score,
      rank: 0,
      chunk,
      queryTerms: uniqueQueryTerms,
      termFreqs,
    })
  }

  scores.sort((a, b) => b.score - a.score)

  return scores.slice(0, topK).map((result, i) => ({
    ...result,
    rank: i + 1,
  }))
}
