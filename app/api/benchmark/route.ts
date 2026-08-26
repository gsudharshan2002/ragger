import { NextRequest } from "next/server"
import { readJson, writeJson, getDataPath } from "@/lib/services/storage"
import { executeRag } from "@/lib/services/rag-engine"
import type { GoldenDataset, RagStrategy, RagEngineConfig } from "@/lib/types"
import { generateId } from "@/lib/utils"

export const dynamic = "force-dynamic"

const DATASETS_PATH = getDataPath("golden-datasets.json")
const RESULTS_PATH = getDataPath("benchmark-results.json")

interface BenchmarkResultEntry {
  id: string
  datasetId: string
  strategy: RagStrategy
  startedAt: string
  completedAt: string
  totalTests: number
  results: {
    caseId: string
    query: string
    actualAnswer: string
    latencyMs: number
    tokenCount: number
    error?: string
  }[]
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { datasetId, strategy, ragConfig } = body as {
      datasetId: string
      strategy: RagStrategy
      ragConfig?: Partial<RagEngineConfig>
    }

    if (!datasetId || !strategy) {
      return Response.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "datasetId and strategy are required" } },
        { status: 400 }
      )
    }

    const datasets = await readJson<GoldenDataset[]>(DATASETS_PATH)
    const dataset = (datasets || []).find((d) => d.id === datasetId)

    if (!dataset) {
      return Response.json(
        { success: false, error: { code: "NOT_FOUND", message: "Dataset not found" } },
        { status: 404 }
      )
    }

    const currentVersion = dataset.versions.find((v) => v.version === dataset.currentVersion)
    if (!currentVersion) {
      return Response.json(
        { success: false, error: { code: "NOT_FOUND", message: "Dataset version not found" } },
        { status: 404 }
      )
    }

    const startedAt = new Date().toISOString()
    const caseResults: BenchmarkResultEntry["results"] = []

    for (const testCase of currentVersion.cases) {
      const caseStarted = Date.now()
      try {
        let answer = ""
        for await (const event of executeRag(testCase.query, strategy, ragConfig)) {
          if (event.type === "llm.token.generated") {
            answer += event.data.token as string
          }
        }

        caseResults.push({
          caseId: testCase.id,
          query: testCase.query,
          actualAnswer: answer,
          latencyMs: Date.now() - caseStarted,
          tokenCount: 0,
        })
      } catch (error) {
        caseResults.push({
          caseId: testCase.id,
          query: testCase.query,
          actualAnswer: "",
          latencyMs: Date.now() - caseStarted,
          tokenCount: 0,
          error: error instanceof Error ? error.message : "Execution failed",
        })
      }
    }

    const result: BenchmarkResultEntry = {
      id: generateId(),
      datasetId,
      strategy,
      startedAt,
      completedAt: new Date().toISOString(),
      totalTests: currentVersion.cases.length,
      results: caseResults,
    }

    const existing = await readJson<BenchmarkResultEntry[]>(RESULTS_PATH)
    const allResults = existing || []
    allResults.push(result)
    await writeJson(RESULTS_PATH, allResults)

    return Response.json({ success: true, data: result })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to run benchmark"
    return Response.json(
      { success: false, error: { code: "BENCHMARK_ERROR", message } },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const results = await readJson<BenchmarkResultEntry[]>(RESULTS_PATH)
    return Response.json({ success: true, data: results || [] })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch benchmark results"
    return Response.json(
      { success: false, error: { code: "FETCH_ERROR", message } },
      { status: 500 }
    )
  }
}
