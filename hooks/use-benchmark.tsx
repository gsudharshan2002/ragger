"use client"

import { createContext, useContext, useCallback, useRef, useState, useEffect, type Dispatch, type SetStateAction, type ReactNode } from "react"
import { apiFetch, previewUrl as previewUrlHelper } from "@/lib/api"
import type {
  GoldenDataset,
  GoldenCase,
  BenchmarkConfig,
  BenchmarkRun,
  TestCaseResult,
} from "../lib/types"
import { generateId } from "../lib/utils"

interface BenchmarkContextValue {
  datasets: GoldenDataset[]
  selectedDataset: GoldenDataset | null
  setSelectedDataset: (d: GoldenDataset | null) => void
  selectedVersion: string
  setSelectedVersion: (v: string) => void
  config: BenchmarkConfig
  setConfig: Dispatch<SetStateAction<BenchmarkConfig>>
  syncConfigFromChatSettings: () => Promise<void>
  runs: BenchmarkRun[]
  activeRun: BenchmarkRun | null
  viewRun: (run: BenchmarkRun) => void
  isRunning: boolean
  progress: { completed: number; total: number; currentQuery: string }
  selectedCases: Set<string>
  toggleCaseSelection: (id: string) => void
  selectAllCases: (ids: string[]) => void
  clearSelection: () => void
  startBenchmark: (overrideDataset?: GoldenDataset, overrideVersion?: string) => void
  runComparison: (ds: GoldenDataset, version: string, configA: BenchmarkConfig, configB: BenchmarkConfig) => Promise<{ runA: BenchmarkRun | null; runB: BenchmarkRun | null }>
  comparisonLeg: "a" | "b" | null
  cancelBenchmark: () => void
  createDataset: (name: string, description: string, tags: string[]) => void
  importDataset: (name: string, description: string, tags: string[], cases: GoldenCase[]) => Promise<GoldenDataset | null>
  addGoldenCase: (datasetId: string, goldenCase: GoldenCase) => void
  updateGoldenCase: (datasetId: string, goldenCase: GoldenCase) => void
  deleteGoldenCases: (datasetId: string, caseIds: string[]) => void
  duplicateDataset: (datasetId: string) => void
  deleteDataset: (datasetId: string) => void
  exportDataset: (datasetId: string) => string
  exportRunResults: (runId: string) => string
  deleteRun: (runId: string) => void
  comparisonRuns: BenchmarkRun[]
  setComparisonRuns: (runs: BenchmarkRun[]) => void
  selectedFailedCase: TestCaseResult | null
  setSelectedFailedCase: (r: TestCaseResult | null) => void
}

const BenchmarkContext = createContext<BenchmarkContextValue | null>(null)

export function useBenchmark() {
  const ctx = useContext(BenchmarkContext)
  if (!ctx) throw new Error("useBenchmark must be used within BenchmarkProvider")
  return ctx
}

export function BenchmarkProvider({ children }: { children: ReactNode }) {
  const [datasets, setDatasets] = useState<GoldenDataset[]>([])
  const [selectedDataset, setSelectedDataset] = useState<GoldenDataset | null>(null)
  const [selectedVersion, setSelectedVersion] = useState("")
  const [runs, setRuns] = useState<BenchmarkRun[]>([])
  const [activeRun, setActiveRun] = useState<BenchmarkRun | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [progress, setProgress] = useState({ completed: 0, total: 0, currentQuery: "" })
  const [selectedCases, setSelectedCases] = useState<Set<string>>(new Set())
  const [comparisonRuns, setComparisonRuns] = useState<BenchmarkRun[]>([])
  const [selectedFailedCase, setSelectedFailedCase] = useState<TestCaseResult | null>(null)
  const [comparisonLeg, setComparisonLeg] = useState<"a" | "b" | null>(null)
  const cancelRef = useRef(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Benchmark's RAG pipeline settings (strategy, embedding, reranker, MMR,
  // LLM model) always mirror whatever Chat/Settings is actively running -
  // never a separately-remembered benchmark config. Editing the Benchmark
  // Configuration form only touches local state (never PUTs to /rag/config),
  // so it can never leak back into Chat's settings; conversely, every time
  // the benchmark config screen is (re)opened this is called again to reset
  // any prior ad-hoc edits back to the current Chat defaults - nothing
  // benchmark-specific is ever persisted as a "saved" config.
  const syncConfigFromChatSettings = useCallback(async () => {
    try {
      const res = await apiFetch("/rag/config")
      const body: { success: boolean; data?: { settings?: Record<string, any> } } = await res.json()
      const s = body.data?.settings
      if (!s) return

      const llmModel = s.llmProvider === "gemini" ? s.geminiModel : s.groqModel
      const embeddingModel = s.embeddingProvider === "cohere" ? s.cohereEmbedModel : s.embeddingModel
      const rerankerModel = s.rerankerProvider === "cohere" ? s.cohereRerankModel : s.rerankerModel
      const topK = typeof s.defaultTopK === "number" ? s.defaultTopK : undefined

      setConfig((prev) => ({
        ...prev,
        strategy: s.defaultStrategy ?? prev.strategy,
        vector: prev.vector && {
          ...prev.vector,
          embeddingModel: embeddingModel ?? prev.vector.embeddingModel,
          topK: topK ?? prev.vector.topK,
          similarity: s.vectorSimilarity ?? prev.vector.similarity,
        },
        bm25: prev.bm25 && { ...prev.bm25, topK: topK ?? prev.bm25.topK },
        reranker: prev.reranker && {
          ...prev.reranker,
          model: rerankerModel ?? prev.reranker.model,
          candidateCount: topK ?? prev.reranker.candidateCount,
        },
        mmr: prev.mmr && { ...prev.mmr, lambda: typeof s.mmrLambda === "number" ? s.mmrLambda : prev.mmr.lambda },
        llm: { ...prev.llm, model: llmModel ?? prev.llm.model },
      }))
    } catch (err) {
      console.error("Failed to sync active RAG config:", err)
    }
  }, [])

  useEffect(() => {
    apiFetch("/datasets")
      .then((res) => res.json())
      .then((res: { success: boolean; data?: GoldenDataset[] }) => {
        const list = res.data ?? []
        setDatasets(list)
        if (list.length > 0) {
          setSelectedDataset(list[0])
          setSelectedVersion(list[0].currentVersion || "v1")
        }
      })
      .catch((err) => console.error("Failed to fetch datasets:", err))

    apiFetch("/benchmark/runs")
      .then((res) => res.json())
      .then((res: { success: boolean; data?: BenchmarkRun[] }) => {
        setRuns(res.data ?? [])
      })
      .catch((err) => console.error("Failed to fetch benchmark run history:", err))

    syncConfigFromChatSettings()
  }, [])

  const defaultConfig: BenchmarkConfig = {
    datasetId: selectedDataset?.id || "",
    datasetVersion: selectedVersion || "v1",
    strategy: "hybrid-rerank-mmr",
    vector: { embeddingModel: "sentence-transformers/all-MiniLM-L6-v2", topK: 20, similarity: "cosine" },
    bm25: { topK: 20, language: "english", tokenizer: "standard" },
    rrf: { k: 60, vectorWeight: 1, bm25Weight: 1 },
    reranker: { model: "cross-encoder/ms-marco-MiniLM-L-6-v2", candidateCount: 20, topN: 10 },
    mmr: { lambda: 0.7, candidateCount: 15, finalCount: 8 },
    llm: { model: "openai/gpt-oss-20b", temperature: 0.7, topP: 1, maxTokens: 1024 },
    metrics: ["hit_rate", "recall", "precision", "mrr", "ndcg"],
  }

  const [config, setConfig] = useState<BenchmarkConfig>(defaultConfig)

  const toggleCaseSelection = useCallback((id: string) => {
    setSelectedCases((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const selectAllCases = useCallback((ids: string[]) => {
    setSelectedCases(new Set(ids))
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedCases(new Set())
  }, [])

  const runSingleBenchmark = useCallback(async (
    ds: GoldenDataset,
    version: string,
    cfg: BenchmarkConfig,
  ): Promise<BenchmarkRun | null> => {
    const runId = `bench_${generateId()}`
    const placeholderRun: BenchmarkRun = {
      id: runId,
      datasetId: ds.id,
      datasetName: ds.name,
      datasetVersion: version,
      strategy: cfg.strategy,
      config: { ...cfg },
      status: "running",
      startedAt: new Date().toISOString(),
      totalTests: 0,
      completedTests: 0,
      passedTests: 0,
      partialTests: 0,
      failedTests: 0,
      aggregateMetrics: {
        hitRate: 0, recall: 0, precision: 0, mrr: 0, ndcg: 0,
        faithfulness: 0, answerRelevance: 0, contextPrecision: 0, contextRecall: 0,
        latencyMs: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0, cost: 0,
      },
      results: [],
      difficultyBreakdown: {} as Record<string, any>,
      tagBreakdown: {},
      failureCategories: {
        retrieval_failure: 0, missing_source: 0, wrong_source: 0,
        poor_ranking: 0, poor_context: 0, poor_answer: 0,
        citation_failure: 0, latency_failure: 0, token_limit_failure: 0,
        llm_failure: 0, prompt_issue: 0,
      },
    }

    setActiveRun(placeholderRun)
    setProgress({ completed: 0, total: 0, currentQuery: "Starting benchmark..." })

    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      const res = await apiFetch("/benchmark/run-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          datasetId: ds.id,
          strategy: cfg.strategy,
          ragConfig: cfg,
        }),
        signal: controller.signal,
      })

      if (!res.ok || !res.body) throw new Error(`Benchmark failed: ${res.statusText}`)

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""
      let finalRun: BenchmarkRun | null = null

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue
          const raw = line.slice(6).trim()
          if (raw === "[DONE]") continue

          let event: any
          try {
            event = JSON.parse(raw)
          } catch {
            continue
          }

          if (event.type === "benchmark.started") {
            setProgress({ completed: 0, total: event.total, currentQuery: "Starting benchmark..." })
            setActiveRun((prev) => (prev ? { ...prev, totalTests: event.total } : prev))
          } else if (event.type === "case.started") {
            setProgress({ completed: event.index - 1, total: event.total, currentQuery: event.query })
          } else if (event.type === "case.completed") {
            const caseResult: TestCaseResult = event.result
            setProgress({ completed: event.index, total: event.total, currentQuery: "" })
            setActiveRun((prev) => {
              if (!prev) return prev
              const results = [...prev.results, caseResult]
              return {
                ...prev,
                completedTests: results.length,
                passedTests: results.filter((r) => r.status === "passed").length,
                partialTests: results.filter((r) => r.status === "partial").length,
                failedTests: results.filter((r) => r.status === "failed").length,
                results,
              }
            })
          } else if (event.type === "benchmark.completed") {
            finalRun = {
              ...event.data,
              config: event.data.config ?? cfg,
              datasetName: event.data.datasetName ?? ds.name,
              datasetVersion: event.data.datasetVersion ?? version,
            }
          } else if (event.type === "error") {
            throw new Error(event.error || "Benchmark failed")
          }
        }
      }

      if (finalRun) {
        finalRun.id = runId
        finalRun.startedAt = placeholderRun.startedAt
        finalRun.completedAt = new Date().toISOString()
        finalRun.status = "completed"

        setActiveRun(finalRun)
        setRuns((prev) => [finalRun as BenchmarkRun, ...prev])
        return finalRun
      }
      return null
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return null
      }
      console.error("Benchmark error:", err)
      setActiveRun((prev) => prev ? { ...prev, status: "failed" } : null)
      return null
    } finally {
      abortControllerRef.current = null
    }
  }, [])

  const startBenchmark = useCallback(async (overrideDataset?: GoldenDataset, overrideVersion?: string) => {
    const ds = overrideDataset ?? selectedDataset
    if (!ds || isRunning) return
    const version = overrideVersion ?? selectedVersion
    if (overrideDataset) {
      setSelectedDataset(overrideDataset)
      setSelectedVersion(version)
    }
    cancelRef.current = false
    setIsRunning(true)
    try {
      await runSingleBenchmark(ds, version, config)
    } finally {
      setIsRunning(false)
    }
  }, [selectedDataset, selectedVersion, config, isRunning, setSelectedDataset, setSelectedVersion, runSingleBenchmark])

  const runComparison = useCallback(async (
    ds: GoldenDataset,
    version: string,
    configA: BenchmarkConfig,
    configB: BenchmarkConfig,
  ): Promise<{ runA: BenchmarkRun | null; runB: BenchmarkRun | null }> => {
    if (isRunning) return { runA: null, runB: null }
    cancelRef.current = false
    setIsRunning(true)
    setComparisonLeg("a")
    try {
      const runA = await runSingleBenchmark(ds, version, configA)
      if (cancelRef.current) return { runA, runB: null }
      setComparisonLeg("b")
      const runB = await runSingleBenchmark(ds, version, configB)
      return { runA, runB }
    } finally {
      setComparisonLeg(null)
      setIsRunning(false)
    }
  }, [isRunning, runSingleBenchmark])

  const cancelBenchmark = useCallback(() => {
    cancelRef.current = true
    abortControllerRef.current?.abort()
    abortControllerRef.current = null
    setIsRunning(false)
    setComparisonLeg(null)
    setActiveRun(null)
    setProgress({ completed: 0, total: 0, currentQuery: "" })
  }, [])

  const viewRun = useCallback((run: BenchmarkRun) => {
    if (isRunning) return
    setActiveRun(run)
  }, [isRunning])

  const createDataset = useCallback(async (name: string, description: string, tags: string[]) => {
    try {
      const res = await apiFetch("/datasets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, tags }),
      })
      if (!res.ok) throw new Error(`Failed to create dataset: ${res.statusText}`)
      const response = await res.json()
      const newDataset: GoldenDataset = response.data
      setDatasets((prev) => [newDataset, ...prev])
      setSelectedDataset(newDataset)
      setSelectedVersion(newDataset.currentVersion || "v1")
    } catch (err) {
      console.error("Create dataset error:", err)
    }
  }, [])

  const importDataset = useCallback(async (name: string, description: string, tags: string[], cases: GoldenCase[]) => {
    try {
      const res = await apiFetch("/datasets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, tags }),
      })
      if (!res.ok) throw new Error(`Failed to create dataset: ${res.statusText}`)
      const created: GoldenDataset = (await res.json()).data

      if (cases.length === 0) {
        setDatasets((prev) => [created, ...prev])
        setSelectedDataset(created)
        setSelectedVersion(created.currentVersion || "v1")
        return created
      }

      const version = created.versions.find((v) => v.version === created.currentVersion) ?? created.versions[0]
      const updatedVersion = { ...version, cases, casesCount: cases.length }
      const putRes = await apiFetch(`/datasets/${created.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versions: created.versions.map((v) => (v.version === version.version ? updatedVersion : v)) }),
      })
      const finalDataset: GoldenDataset = putRes.ok ? (await putRes.json()).data ?? created : created

      setDatasets((prev) => [finalDataset, ...prev])
      setSelectedDataset(finalDataset)
      setSelectedVersion(finalDataset.currentVersion || "v1")
      return finalDataset
    } catch (err) {
      console.error("Import dataset error:", err)
      return null
    }
  }, [])

  const addGoldenCase = useCallback(async (datasetId: string, goldenCase: GoldenCase) => {
    try {
      const dataset = datasets.find((item) => item.id === datasetId)
      if (!dataset) return
      const version = dataset.versions.find((item) => item.version === dataset.currentVersion)
      if (!version) return
      const updatedVersion = { ...version, cases: [...version.cases, goldenCase], casesCount: version.cases.length + 1 }
      const res = await apiFetch(`/datasets/${datasetId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ versions: dataset.versions.map((item) => item.version === version.version ? updatedVersion : item) }) })
      if (!res.ok) return
      const body = await res.json()
      if (body.success && body.data) {
        setDatasets((prev) => prev.map((d) => d.id === datasetId ? body.data : d))
      }
    } catch { /* ignore */ }
  }, [datasets])

  const updateGoldenCase = useCallback(async (datasetId: string, goldenCase: GoldenCase) => {
    try {
      const dataset = datasets.find((item) => item.id === datasetId)
      if (!dataset) return
      const res = await apiFetch(`/datasets/${datasetId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ versions: dataset.versions.map((version) => version.version === dataset.currentVersion ? { ...version, cases: version.cases.map((item) => item.id === goldenCase.id ? goldenCase : item), casesCount: version.cases.length } : version) }) })
      if (!res.ok) return
      const body = await res.json()
      if (body.success && body.data) {
        setDatasets((prev) => prev.map((d) => d.id === datasetId ? body.data : d))
      }
    } catch { /* ignore */ }
  }, [datasets])

  const deleteGoldenCases = useCallback(async (datasetId: string, caseIds: string[]) => {
    try {
      const dataset = datasets.find((item) => item.id === datasetId)
      if (!dataset) return
      const res = await apiFetch(`/datasets/${datasetId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ versions: dataset.versions.map((version) => version.version === dataset.currentVersion ? { ...version, cases: version.cases.filter((item) => !caseIds.includes(item.id)), casesCount: version.cases.filter((item) => !caseIds.includes(item.id)).length } : version) }) })
      if (!res.ok) return
      const body = await res.json()
      if (body.success && body.data) {
        setDatasets((prev) => prev.map((d) => d.id === datasetId ? body.data : d))
      }
    } catch { /* ignore */ }
    setSelectedCases(new Set())
  }, [datasets])

  const duplicateDataset = useCallback(async (datasetId: string) => {
    try {
      const res = await apiFetch(`/datasets/${datasetId}`, { method: "POST" })
      if (!res.ok) throw new Error(`Failed to duplicate dataset: ${res.statusText}`)
      const duplicated: GoldenDataset = await res.json()
      setDatasets((prev) => [duplicated, ...prev])
    } catch (err) {
      console.error("Duplicate dataset error:", err)
    }
  }, [])

  const deleteDataset = useCallback(async (datasetId: string) => {
    try {
      const res = await apiFetch(`/datasets/${datasetId}`, { method: "DELETE" })
      if (!res.ok) throw new Error(`Failed to delete dataset: ${res.statusText}`)
      setDatasets((prev) => prev.filter((d) => d.id !== datasetId))
      if (selectedDataset?.id === datasetId) {
        setSelectedDataset(null)
        setSelectedVersion("")
      }
    } catch (err) {
      console.error("Delete dataset error:", err)
    }
  }, [selectedDataset])

  const exportDataset = useCallback((datasetId: string) => {
    const dataset = datasets.find((d) => d.id === datasetId)
    if (!dataset) return "{}"
    const version = dataset.versions.find((v) => v.version === selectedVersion) || dataset.versions[dataset.versions.length - 1]
    return JSON.stringify({ dataset: dataset.name, version: version.version, cases: version.cases }, null, 2)
  }, [datasets, selectedVersion])

  const exportRunResults = useCallback((runId: string) => {
    const run = runs.find((r) => r.id === runId)
    if (!run) return "{}"
    return JSON.stringify(run, null, 2)
  }, [runs])

  const deleteRun = useCallback(async (runId: string) => {
    try {
      const res = await apiFetch(`/benchmark/runs/${runId}`, { method: "DELETE" })
      if (!res.ok) throw new Error(`Failed to delete run: ${res.statusText}`)
      setRuns((prev) => prev.filter((r) => r.id !== runId))
      setComparisonRuns((prev) => prev.filter((r) => r.id !== runId))
      setActiveRun((prev) => (prev?.id === runId ? null : prev))
    } catch (err) {
      console.error("Delete run error:", err)
    }
  }, [])

  return (
    <BenchmarkContext.Provider
      value={{
        datasets,
        selectedDataset,
        setSelectedDataset,
        selectedVersion,
        setSelectedVersion,
        config,
        setConfig,
        syncConfigFromChatSettings,
        runs,
        activeRun,
        viewRun,
        isRunning,
        progress,
        selectedCases,
        toggleCaseSelection,
        selectAllCases,
        clearSelection,
        startBenchmark,
        runComparison,
        comparisonLeg,
        cancelBenchmark,
        createDataset,
        importDataset,
        addGoldenCase,
        updateGoldenCase,
        deleteGoldenCases,
        duplicateDataset,
        deleteDataset,
        exportDataset,
        exportRunResults,
        deleteRun,
        comparisonRuns,
        setComparisonRuns,
        selectedFailedCase,
        setSelectedFailedCase,
      }}
    >
      {children}
    </BenchmarkContext.Provider>
  )
}
