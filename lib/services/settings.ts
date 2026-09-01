import type { AppSettings } from "@/lib/types"
import { readJson, writeJson, getDataPath } from "./storage"

const DEFAULT_SETTINGS: AppSettings = {
  llmProvider: "groq",
  groqModel: "openai/gpt-oss-20b",
  geminiModel: "gemini-2.5-flash",
  groqApiKey: "",
  geminiApiKey: "",
  embeddingProvider: "local",
  embeddingModel: "sentence-transformers/all-MiniLM-L6-v2",
  cohereEmbedModel: "embed-english-v3.0",
  embeddingApiKey: "",
  vectorSimilarity: "cosine",
  chunkSize: 512,
  chunkOverlap: 64,
  defaultTopK: 5,
  defaultStrategy: "hybrid-rrf",
  systemPrompt:
    "You are a helpful assistant. Answer the user's question based on the provided context. If the context does not contain enough information, say so clearly. Cite sources where applicable using [Source N] notation.",
  rerankerProvider: "local",
  rerankerModel: "",
  cohereRerankModel: "rerank-english-v3.0",
  mmrLambda: 0.7,
  costPerToken: 0.0000005,
}

const SETTINGS_PATH = getDataPath("settings.json")

export async function getSettings(): Promise<AppSettings> {
  const stored = await readJson<AppSettings>(SETTINGS_PATH)
  if (!stored) return { ...DEFAULT_SETTINGS }
  return { ...DEFAULT_SETTINGS, ...stored }
}

export async function updateSettings(
  updates: Partial<AppSettings>
): Promise<AppSettings> {
  const current = await getSettings()
  const merged = { ...current, ...updates }
  await writeJson(SETTINGS_PATH, merged)
  return merged
}

export async function resetSettings(): Promise<AppSettings> {
  await writeJson(SETTINGS_PATH, DEFAULT_SETTINGS)
  return { ...DEFAULT_SETTINGS }
}
