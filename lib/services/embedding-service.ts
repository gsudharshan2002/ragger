import type { StoredChunk } from "@/lib/types"
import { getSettings } from "./settings"

const EMBEDDING_BATCH_SIZE = 20

export async function isEmbeddingConfigured(): Promise<boolean> {
  const settings = await getSettings()

  if (!settings.embeddingProvider || settings.embeddingProvider === "none") {
    return false
  }

  const apiKey = settings.embeddingApiKey || process.env.EMBEDDING_API_KEY

  if (!apiKey) {
    return false
  }

  return true
}

async function callOpenAIEmbedding(
  texts: string[],
  model: string,
  apiKey: string
): Promise<number[][]> {
  const baseUrl =
    process.env.EMBEDDING_BASE_URL || "https://api.openai.com"

  const url = `${baseUrl}/v1/embeddings`

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: texts,
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(
      `OpenAI embedding request failed (${response.status}): ${errorBody}`
    )
  }

  const data = (await response.json()) as {
    data: { embedding: number[]; index: number }[]
  }

  const sorted = data.data.sort((a, b) => a.index - b.index)
  return sorted.map((item) => item.embedding)
}

async function callCohereEmbedding(
  texts: string[],
  model: string,
  apiKey: string
): Promise<number[][]> {

  const url = "https://api.cohere.ai/v1/embed"

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      texts,
      input_type: "search_document",
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(
      `Cohere embedding request failed (${response.status}): ${errorBody}`
    )
  }

  const data = (await response.json()) as {
    embeddings: number[][]
  }

  return data.embeddings
}

async function getEmbeddingsForTexts(
  texts: string[]
): Promise<number[][] | null> {
  const settings = await getSettings()

  if (!settings.embeddingProvider || settings.embeddingProvider === "none") {
    return null
  }

  const apiKey = settings.embeddingApiKey || process.env.EMBEDDING_API_KEY

  if (!apiKey) {
    console.warn(
      "Embedding API key not set, skipping embedding generation"
    )
    return null
  }

  const model = settings.embeddingModel || (settings.embeddingProvider === "cohere" ? "embed-english-v3.0" : "text-embedding-3-small")

  const allEmbeddings: number[][] = []

  for (let i = 0; i < texts.length; i += EMBEDDING_BATCH_SIZE) {
    const batch = texts.slice(i, i + EMBEDDING_BATCH_SIZE)

    try {
      let embeddings: number[][]

      if (settings.embeddingProvider === "openai") {
        embeddings = await callOpenAIEmbedding(batch, model, apiKey)
      } else if (settings.embeddingProvider === "cohere") {
        embeddings = await callCohereEmbedding(batch, model, apiKey)
      } else {
        console.warn(
          `Unknown embedding provider: ${settings.embeddingProvider}`
        )
        return null
      }

      allEmbeddings.push(...embeddings)
    } catch (error) {
      console.error(
        `Embedding generation failed for batch starting at index ${i}:`,
        error
      )
      return null
    }
  }

  return allEmbeddings
}

export async function generateEmbeddings(
  chunks: StoredChunk[]
): Promise<StoredChunk[]> {
  if (chunks.length === 0) {
    return chunks
  }

  const texts = chunks.map((chunk) => chunk.content)
  const embeddings = await getEmbeddingsForTexts(texts)

  if (!embeddings) {
    return chunks
  }

  return chunks.map((chunk, index) => ({
    ...chunk,
    embedding: embeddings[index],
  }))
}

export async function generateQueryEmbedding(
  query: string
): Promise<number[] | null> {
  const embeddings = await getEmbeddingsForTexts([query])

  if (!embeddings || embeddings.length === 0) {
    return null
  }

  return embeddings[0]
}
