import type { FinalContextChunk, RagEngineConfig } from "@/lib/types"

const DEFAULT_SYSTEM_PROMPT =
  "You are a helpful assistant. Answer the user's question based on the provided context. If the context doesn't contain enough information, say so clearly. Always cite your sources when possible."

const MAX_CONTEXT_TOKENS = 4000
const MAX_CONTEXT_CHUNKS = 5

function estimateTokens(text: string): number {
  if (!text) return 0
  return Math.ceil(text.split(/\s+/).filter(Boolean).length / 0.75)
}

function truncateToTokens(text: string, maxTokens: number): string {
  if (estimateTokens(text) <= maxTokens) return text
  const words = text.split(/\s+/)
  const truncated: string[] = []
  let count = 0
  for (const word of words) {
    count += 1
    if (count / 0.75 > maxTokens) break
    truncated.push(word)
  }
  return truncated.join(" ") + "\n\n[Context truncated due to token limit]"
}

export function buildPrompt(
  query: string,
  contextChunks: FinalContextChunk[],
  config: RagEngineConfig
): {
  system: string
  context: string
  user: string
  systemTokens: number
  contextTokens: number
  userTokens: number
  totalTokens: number
} {
  const system = config.llm.systemPrompt || DEFAULT_SYSTEM_PROMPT
  const systemTokens = estimateTokens(system)
  const userTokens = estimateTokens(query)
  const availableForContext = Math.max(500, MAX_CONTEXT_TOKENS - systemTokens - userTokens)

  const limitedChunks = contextChunks.slice(0, MAX_CONTEXT_CHUNKS)

  const contextParts = limitedChunks.map((chunk, index) => {
    const header = `[Source ${index + 1}] Document: ${chunk.documentName}, Page: ${chunk.page}${chunk.section ? `, Section: ${chunk.section}` : ""}`
    return `${header}\n${chunk.content}`
  })

  let context = contextParts.join("\n\n")
  context = truncateToTokens(context, availableForContext)

  const contextTokens = estimateTokens(context)

  return {
    system,
    context,
    user: query,
    systemTokens,
    contextTokens,
    userTokens,
    totalTokens: systemTokens + contextTokens + userTokens,
  }
}
