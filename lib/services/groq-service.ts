import type { RagEngineConfig } from "@/lib/types"
import { getSettings } from "./settings"

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"

const DEFAULT_SYSTEM_PROMPT =
  "You are a helpful assistant. Answer the user's question based on the provided context. If the context doesn't contain enough information, say so clearly. Always cite your sources when possible."

function getApiKey(provider: string, settingsApiKey: string): string | undefined {
  if (settingsApiKey) return settingsApiKey
  if (provider === "gemini") return process.env.GEMINI_API_KEY
  return process.env.GROQ_API_KEY
}

function getApiUrl(provider: string): string {
  if (provider === "gemini") return GEMINI_API_URL
  return GROQ_API_URL
}

export async function isGroqConfigured(): Promise<boolean> {
  const settings = await getSettings()
  const apiKey = getApiKey(settings.llmProvider, settings.llmProvider === "gemini" ? settings.geminiApiKey : settings.groqApiKey)
  return !!apiKey
}

export async function generateCompletion(
  systemPrompt: string,
  userPrompt: string,
  config: RagEngineConfig["llm"]
): Promise<{
  answer: string
  inputTokens: number | null
  outputTokens: number | null
  totalTokens: number | null
  latencyMs: number
  model: string
  status: string
  error?: string
}> {
  const settings = await getSettings()
  const provider = settings.llmProvider
  const apiKey = getApiKey(provider, provider === "gemini" ? settings.geminiApiKey : settings.groqApiKey)
  if (!apiKey) {
    const envVar = provider === "gemini" ? "GEMINI_API_KEY" : "GROQ_API_KEY"
    return {
      answer: "",
      inputTokens: null,
      outputTokens: null,
      totalTokens: null,
      latencyMs: 0,
      model: config.model,
      status: "error",
      error: `${envVar} is not set. Please add it in Settings or set it in your .env file.`,
    }
  }

  const model = config.model || "openai/gpt-oss-20b"
  const messages = [
    { role: "system", content: systemPrompt || DEFAULT_SYSTEM_PROMPT },
    { role: "user", content: userPrompt },
  ]

  const startTime = performance.now()

  try {
    const response = await fetch(getApiUrl(provider), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: config.temperature,
        max_tokens: config.maxTokens,
      }),
    })

    const endTime = performance.now()
    const latencyMs = Math.round(endTime - startTime)

    if (!response.ok) {
      const errorBody = await response.text()
      return {
        answer: "",
        inputTokens: null,
        outputTokens: null,
        totalTokens: null,
        latencyMs,
        model,
        status: "error",
        error: `${provider} API error (${response.status}): ${errorBody}`,
      }
    }

    const data = (await response.json()) as {
      choices: { message: { content: string } }[]
      usage?: {
        prompt_tokens: number
        completion_tokens: number
        total_tokens: number
      }
    }

    const answer = data.choices?.[0]?.message?.content || ""
    const inputTokens = data.usage?.prompt_tokens ?? null
    const outputTokens = data.usage?.completion_tokens ?? null
    const totalTokens = data.usage?.total_tokens ?? null

    return {
      answer,
      inputTokens,
      outputTokens,
      totalTokens,
      latencyMs,
      model,
      status: "completed",
    }
  } catch (err) {
    const endTime = performance.now()
    const latencyMs = Math.round(endTime - startTime)
    return {
      answer: "",
      inputTokens: null,
      outputTokens: null,
      totalTokens: null,
      latencyMs,
      model,
      status: "error",
      error: `${provider} request failed: ${err instanceof Error ? err.message : String(err)}`,
    }
  }
}

export async function* generateCompletionStream(
  systemPrompt: string,
  userPrompt: string,
  config: RagEngineConfig["llm"]
): AsyncGenerator<{
  type: "token" | "done" | "error"
  content?: string
  tokens?: { input: number | null; output: number | null; total: number | null }
  error?: string
}> {
  const settings = await getSettings()
  const provider = settings.llmProvider
  const apiKey = getApiKey(provider, provider === "gemini" ? settings.geminiApiKey : settings.groqApiKey)
  if (!apiKey) {
    const envVar = provider === "gemini" ? "GEMINI_API_KEY" : "GROQ_API_KEY"
    yield {
      type: "error",
      error: `${envVar} is not set. Please add it in Settings or set it in your .env file.`,
    }
    return
  }

  const model = config.model || "openai/gpt-oss-20b"
  const messages = [
    { role: "system", content: systemPrompt || DEFAULT_SYSTEM_PROMPT },
    { role: "user", content: userPrompt },
  ]

  try {
    const response = await fetch(getApiUrl(provider), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: config.temperature,
        max_tokens: config.maxTokens,
        stream: true,
      }),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      yield {
        type: "error",
        error: `${provider} API error (${response.status}): ${errorBody}`,
      }
      return
    }

    const reader = response.body?.getReader()
    if (!reader) {
      yield { type: "error", error: "Response body is not readable" }
      return
    }

    const decoder = new TextDecoder()
    let buffer = ""
    let inputTokens: number | null = null
    let outputTokens: number | null = null
    let totalTokens: number | null = null
    let outputTokenCount = 0

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || !trimmed.startsWith("data: ")) continue

          const payload = trimmed.slice(6)
          if (payload === "[DONE]") {
            yield {
              type: "done",
              tokens: {
                input: inputTokens,
                output: outputTokens ?? outputTokenCount,
                total:
                  totalTokens ??
                  (inputTokens !== null ? inputTokens + outputTokenCount : null),
              },
            }
            return
          }

          try {
            const parsed = JSON.parse(payload) as {
              choices?: {
                delta?: { content?: string }
                finish_reason?: string | null
              }[]
              usage?: {
                prompt_tokens: number
                completion_tokens: number
                total_tokens: number
              }
            }

            if (parsed.usage) {
              inputTokens = parsed.usage.prompt_tokens
              outputTokens = parsed.usage.completion_tokens
              totalTokens = parsed.usage.total_tokens
            }

            const content = parsed.choices?.[0]?.delta?.content
            if (content) {
              outputTokenCount++
              yield { type: "token", content }
            }
          } catch {
            // Skip malformed JSON lines
          }
        }
      }

      yield {
        type: "done",
        tokens: {
          input: inputTokens,
          output: outputTokens ?? outputTokenCount,
          total:
            totalTokens ??
            (inputTokens !== null ? inputTokens + outputTokenCount : null),
        },
      }
    } finally {
      reader.releaseLock()
    }
  } catch (err) {
    yield {
      type: "error",
      error: `${provider} streaming request failed: ${err instanceof Error ? err.message : String(err)}`,
    }
  }
}
