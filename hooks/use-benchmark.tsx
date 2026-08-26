"use client"

import { createContext, useContext, useCallback, useRef, useState, useEffect, type ReactNode } from "react"
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
  setConfig: (c: BenchmarkConfig) => void
  runs: BenchmarkRun[]
  activeRun: BenchmarkRun | null
  isRunning: boolean
  progress: { completed: number; total: number; currentQuery: string }
  selectedCases: Set<string>
  toggleCaseSelection: (id: string) => void
  selectAllCases: (ids: string[]) => void
  clearSelection: () => void
  startBenchmark: () => void
  cancelBenchmark: () => void
  createDataset: (name: string, description: string, tags: string[]) => void
  addGoldenCase: (datasetId: string, goldenCase: GoldenCase) => void
  updateGoldenCase: (datasetId: string, goldenCase: GoldenCase) => void
  deleteGoldenCases: (datasetId: string, caseIds: string[]) => void
  duplicateDataset: (datasetId: string) => void
  deleteDataset: (datasetId: string) => void
  exportDataset: (datasetId: string) => string
  exportRunResults: (runId: string) => string
  comparisonRuns: BenchmarkRun[]
  setComparisonRuns: (runs: BenchmarkRun[]) => void
  selectedFailedCase: TestCaseResult | null
  setSelectedFailedCase: (r: TestCaseResult | null) => void
  tracePanelOpen: boolean
  setTracePanelOpen: (open: boolean) => void
  selectedTrace: unknown | null
  setSelectedTrace: (t: unknown | null) => void
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
  const [tracePanelOpen, setTracePanelOpen] = useState(false)
  const [selectedTrace, setSelectedTrace] = useState<unknown | null>(null)
  const cancelRef = useRef(false)

  useEffect(() => {
    fetch("/api/datasets")
      .then((res) => res.json())
      .then((res: { success: boolean; data?: GoldenDataset[] }) => {
        const list = res.data ?? []
        setDatasets(list)
        if (list.length > 0) {
          setSelectedDataset(list[0])
          setSelectedVersion(list[0].currentVersion || "v1.0")
        }
      })
      .catch((err) => console.error("Failed to fetch datasets:", err))
  }, [])

  const defaultConfig: BenchmarkConfig = {
    datasetId: selectedDataset?.id || "",
    datasetVersion: selectedVersion || "v1.0",
    strategy: "hybrid-rerank-mmr",
    vector: { embeddingModel: "text-embedding-3-large", topK: 20, similarity: "Cosine" },
    bm25: { topK: 20, language: "english", tokenizer: "standard" },
    rrf: { k: 60, vectorWeight: 1, bm25Weight: 1 },
    reranker: { model: "cross-encoder/ms-marco-MiniLM-L-6-v2", candidateCount: 20, topN: 8 },
    mmr: { lambda: 0.7, candidateCount: 15, finalCount: 8 },
    llm: { model: "gpt-4o", temperature: 0.7, maxTokens: 2048 },
    metrics: ["hit_rate", "recall", "precision", "mrr", "ndcg", "faithfulness", "answer_relevance"],
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

  const startBenchmark = useCallback(async () => {
    if (!selectedDataset || isRunning) return
    cancelRef.current = false
    setIsRunning(true)

    const runId = `bench_${generateId()}`
    const placeholderRun: BenchmarkRun = {
      id: runId,
      datasetId: selectedDataset.id,
      datasetName: selectedDataset.name,
      datasetVersion: selectedVersion,
      strategy: config.strategy,
      config: { ...config },
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
      },
    }

    setActiveRun(placeholderRun)
    setProgress({ completed: 0, total: 0, currentQuery: "Starting benchmark..." })

    try {
      const res = await fetch("/api/benchmark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ datasetId: selectedDataset.id, strategy: config.strategy }),
      })

      if (!res.ok) throw new Error(`Benchmark failed: ${res.statusText}`)

      const completedRun: BenchmarkRun = await res.json()
      completedRun.id = runId
      completedRun.startedAt = placeholderRun.startedAt
      completedRun.completedAt = new Date().toISOString()
      completedRun.status = "completed"

      setActiveRun(completedRun)
      setRuns((prev) => [completedRun, ...prev])
      setProgress({
        completed: completedRun.totalTests,
        total: completedRun.totalTests,
        currentQuery: "",
      })
    } catch (err) {
      console.error("Benchmark error:", err)
      setActiveRun((prev) => prev ? { ...prev, status: "failed" } : null)
    } finally {
      setIsRunning(false)
    }
  }, [selectedDataset, selectedVersion, config, isRunning])

  const cancelBenchmark = useCallback(() => {
    cancelRef.current = true
    setIsRunning(false)
    setActiveRun(null)
    setProgress({ completed: 0, total: 0, currentQuery: "" })
  }, [])

  const createDataset = useCallback(async (name: string, description: string, tags: string[]) => {
    try {
      const res = await fetch("/api/datasets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, tags }),
      })
      if (!res.ok) throw new Error(`Failed to create dataset: ${res.statusText}`)
      const newDataset: GoldenDataset = await res.json()
      setDatasets((prev) => [newDataset, ...prev])
      setSelectedDataset(newDataset)
      setSelectedVersion(newDataset.currentVersion || "v1.0")
    } catch (err) {
      console.error("Create dataset error:", err)
    }
  }, [])

  const addGoldenCase = useCallback(async (datasetId: string, goldenCase: GoldenCase) => {
    try {
      const res = await fetch(`/api/datasets/${datasetId}`, { method: "PUT" })
      if (!res.ok) return
      const body = await res.json()
      if (body.success && body.data) {
        setDatasets((prev) => prev.map((d) => d.id === datasetId ? body.data : d))
      }
    } catch { /* ignore */ }
  }, [])

  const updateGoldenCase = useCallback(async (datasetId: string, goldenCase: GoldenCase) => {
    try {
      const res = await fetch(`/api/datasets/${datasetId}`, { method: "PUT" })
      if (!res.ok) return
      const body = await res.json()
      if (body.success && body.data) {
        setDatasets((prev) => prev.map((d) => d.id === datasetId ? body.data : d))
      }
    } catch { /* ignore */ }
  }, [])

  const deleteGoldenCases = useCallback(async (datasetId: string, caseIds: string[]) => {
    try {
      const res = await fetch(`/api/datasets/${datasetId}`, { method: "PUT" })
      if (!res.ok) return
      const body = await res.json()
      if (body.success && body.data) {
        setDatasets((prev) => prev.map((d) => d.id === datasetId ? body.data : d))
      }
    } catch { /* ignore */ }
    setSelectedCases(new Set())
  }, [])

  const duplicateDataset = useCallback(async (datasetId: string) => {
    try {
      const res = await fetch(`/api/datasets/${datasetId}`, { method: "POST" })
      if (!res.ok) throw new Error(`Failed to duplicate dataset: ${res.statusText}`)
      const duplicated: GoldenDataset = await res.json()
      setDatasets((prev) => [duplicated, ...prev])
    } catch (err) {
      console.error("Duplicate dataset error:", err)
    }
  }, [])

  const deleteDataset = useCallback(async (datasetId: string) => {
    try {
      const res = await fetch(`/api/datasets/${datasetId}`, { method: "DELETE" })
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
        runs,
        activeRun,
        isRunning,
        progress,
        selectedCases,
        toggleCaseSelection,
        selectAllCases,
        clearSelection,
        startBenchmark,
        cancelBenchmark,
        createDataset,
        addGoldenCase,
        updateGoldenCase,
        deleteGoldenCases,
        duplicateDataset,
        deleteDataset,
        exportDataset,
        exportRunResults,
        comparisonRuns,
        setComparisonRuns,
        selectedFailedCase,
        setSelectedFailedCase,
        tracePanelOpen,
        setTracePanelOpen,
        selectedTrace,
        setSelectedTrace,
      }}
    >
      {children}
    </BenchmarkContext.Provider>
  )
}
