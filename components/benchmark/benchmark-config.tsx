"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Settings2,
  ChevronDown,
  Play,
  Loader2,
  Database,
  BarChart3,
  Cpu,
  Brain,
  Blend,
  Filter,
  ArrowUpDown,
  Search,
  FileText,
  Info,
  Check,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useBenchmark } from "@/hooks/use-benchmark"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SelectField } from "@/components/ui/select-field"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import {
  RAG_STRATEGIES,
  type RagStrategy,
  type BenchmarkConfig,
  type BenchmarkMetric,
  ALL_METRICS,
  type Difficulty,
} from "@/lib/types"

const STRATEGY_COLORS: Record<RagStrategy, { bg: string; text: string; border: string; active: string; icon: string }> = {
  vector: { bg: "bg-indigo-50", text: "text-indigo-600", border: "border-indigo-200", active: "bg-indigo-100 border-indigo-300", icon: "#6366f1" },
  bm25: { bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-200", active: "bg-amber-100 border-amber-300", icon: "#f59e0b" },
  hybrid: { bg: "bg-gray-50", text: "text-gray-600", border: "border-gray-200", active: "bg-gray-100 border-gray-300", icon: "#6b7280" },
  "hybrid-rrf": { bg: "bg-purple-50", text: "text-purple-600", border: "border-purple-200", active: "bg-purple-100 border-purple-300", icon: "#a855f7" },
  "hybrid-rerank": { bg: "bg-violet-50", text: "text-violet-600", border: "border-violet-200", active: "bg-violet-100 border-violet-300", icon: "#8b5cf6" },
  "hybrid-rerank-mmr": { bg: "bg-pink-50", text: "text-pink-600", border: "border-pink-200", active: "bg-pink-100 border-pink-300", icon: "#ec4899" },
}

function getStrategyIcon(strategy: RagStrategy) {
  const c = STRATEGY_COLORS[strategy].icon
  switch (strategy) {
    case "vector":
      return <Search className="w-3 h-3" style={{ color: c }} />
    case "bm25":
      return <FileText className="w-3 h-3" style={{ color: c }} />
    case "hybrid":
      return <Blend className="w-3 h-3" style={{ color: c }} />
    case "hybrid-rrf":
      return <Blend className="w-3 h-3" style={{ color: c }} />
    case "hybrid-rerank":
      return <ArrowUpDown className="w-3 h-3" style={{ color: c }} />
    case "hybrid-rerank-mmr":
      return <Filter className="w-3 h-3" style={{ color: c }} />
  }
}

function AccordionSection({
  title,
  icon,
  children,
  defaultOpen = true,
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="border border-black/[0.06] rounded-lg overflow-hidden bg-white">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2.5 w-full px-4 py-3 text-left hover:bg-gray-50/50 transition-colors"
      >
        <div className="w-6 h-6 rounded-md bg-gray-100 flex items-center justify-center shrink-0">
          {icon}
        </div>
        <span className="text-xs font-semibold text-gray-800 flex-1">{title}</span>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
        </motion.div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 border-t border-black/[0.04]">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function NumberInput({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  tooltip,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
  tooltip?: string
}) {
  const field = (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        min={min}
        max={max}
        step={step}
        className="rounded-lg border border-black/[0.06] bg-white text-xs px-3 py-2 text-gray-700 outline-none focus:ring-2 focus:ring-black/5 transition-shadow w-full"
      />
    </div>
  )

  if (!tooltip) return field

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">{label}</label>
        <Tooltip>
          <TooltipTrigger>
            <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
          </TooltipTrigger>
          <TooltipContent side="top">
            {tooltip}
          </TooltipContent>
        </Tooltip>
      </div>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        min={min}
        max={max}
        step={step}
        className="rounded-lg border border-black/[0.06] bg-white text-xs px-3 py-2 text-gray-700 outline-none focus:ring-2 focus:ring-black/5 transition-shadow w-full"
      />
    </div>
  )
}

function TextInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="rounded-lg border border-black/[0.06] bg-white text-xs px-3 py-2 text-gray-700 outline-none focus:ring-2 focus:ring-black/5 transition-shadow w-full"
      />
    </div>
  )
}

function SelectInput({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">{label}</label>
      <SelectField value={value} onChange={onChange} options={options} />
    </div>
  )
}

export function BenchmarkConfig() {
  const router = useRouter()
  const {
    config,
    setConfig,
    syncConfigFromChatSettings,
    datasets,
    selectedDataset,
    setSelectedDataset,
    selectedVersion,
    setSelectedVersion,
    startBenchmark,
    isRunning,
  } = useBenchmark()

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    vector: true,
    bm25: true,
    rrf: true,
    reranker: true,
    mmr: true,
    llm: true,
  })

  // Every time this screen is opened, reset the RAG pipeline settings back
  // to whatever Chat/Settings is currently running with - any unsaved
  // tweaks from a previous visit here are intentionally discarded, since
  // this form never represents a persisted "benchmark config", only a
  // scratch copy of the real settings the user can tweak for one run.
  useEffect(() => {
    syncConfigFromChatSettings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const updateConfig = useCallback(
    (partial: Partial<BenchmarkConfig>) => {
      setConfig((prev) => ({ ...prev, ...partial }))
    },
    [setConfig]
  )

  const toggleMetric = useCallback(
    (metric: BenchmarkMetric) => {
      const current = config.metrics
      const next = current.includes(metric)
        ? current.filter((m) => m !== metric)
        : [...current, metric]
      updateConfig({ metrics: next })
    },
    [config.metrics, updateConfig]
  )

  const needsVector = ["vector", "hybrid", "hybrid-rrf", "hybrid-rerank", "hybrid-rerank-mmr"].includes(config.strategy)
  const needsBM25 = ["bm25", "hybrid", "hybrid-rrf", "hybrid-rerank", "hybrid-rerank-mmr"].includes(config.strategy)
  const needsRRF = ["hybrid-rrf", "hybrid-rerank-mmr"].includes(config.strategy)
  const needsReranker = ["hybrid-rerank", "hybrid-rerank-mmr"].includes(config.strategy)
  const needsMMR = config.strategy === "hybrid-rerank-mmr"

  const metricsByCategory = ALL_METRICS.reduce<Record<string, typeof ALL_METRICS>>((acc, metric) => {
    if (!acc[metric.category]) acc[metric.category] = []
    acc[metric.category].push(metric)
    return acc
  }, {})

  const categoryIcons: Record<string, React.ReactNode> = {
    Retrieval: <Search className="w-3 h-3 text-indigo-500" />,
    System: <Cpu className="w-3 h-3 text-emerald-500" />,
  }

  const selectedVersionObj = selectedDataset?.versions.find((v) => v.version === selectedVersion)

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-gray-500" />
            <h2 className="text-sm font-semibold text-gray-800">Benchmark Configuration</h2>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed">
            Configure your RAG strategy, evaluation metrics, and dataset to run a benchmark.
          </p>
        </div>

        <div className="space-y-3">
          <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">RAG Strategy</label>
          <div className="flex flex-wrap gap-2.5">
            {RAG_STRATEGIES.map((s) => {
              const colors = STRATEGY_COLORS[s.value]
              const isActive = config.strategy === s.value
              return (
                <button
                  key={s.value}
                  onClick={() => updateConfig({ strategy: s.value })}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium border transition-all",
                    isActive
                      ? cn(colors.active, colors.text)
                      : cn("border-black/[0.06] bg-white text-gray-500 hover:bg-gray-50")
                  )}
                >
                  {getStrategyIcon(s.value)}
                  {s.label}
                  {isActive && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className={cn("w-1.5 h-1.5 rounded-full ml-0.5")}
                      style={{ backgroundColor: STRATEGY_COLORS[s.value].icon }}
                    />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Settings</label>
          <div className="space-y-2">
            {needsVector && (
              <AccordionSection title="Vector Search Settings" icon={<Search className="w-3 h-3 text-indigo-500" />}>
                <div className="grid grid-cols-2 gap-3">
                  <TextInput
                    label="Embedding Model"
                    value={config.vector?.embeddingModel ?? "text-embedding-3-large"}
                    onChange={(v) => updateConfig({ vector: { ...config.vector, embeddingModel: v, topK: config.vector?.topK ?? 20, similarity: config.vector?.similarity ?? "Cosine" } })}
                  />
                  <NumberInput
                    label="Top K"
                    value={config.vector?.topK ?? 20}
                    onChange={(v) => updateConfig({ vector: { ...config.vector, embeddingModel: config.vector?.embeddingModel ?? "text-embedding-3-large", topK: v, similarity: config.vector?.similarity ?? "Cosine" } })}
                    min={1}
                    max={100}
                  />
                  <SelectInput
                    label="Similarity"
                    value={config.vector?.similarity ?? "Cosine"}
                    onChange={(v) => updateConfig({ vector: { ...config.vector, embeddingModel: config.vector?.embeddingModel ?? "text-embedding-3-large", topK: config.vector?.topK ?? 20, similarity: v } })}
                    options={[
                      { value: "Cosine", label: "Cosine" },
                      { value: "Dot Product", label: "Dot Product" },
                      { value: "L2", label: "L2 (Euclidean)" },
                    ]}
                  />
                  <NumberInput
                    label="Similarity Threshold"
                    value={config.vector?.similarityThreshold ?? 0}
                    onChange={(v) => updateConfig({ vector: { ...config.vector, embeddingModel: config.vector?.embeddingModel ?? "text-embedding-3-large", topK: config.vector?.topK ?? 20, similarity: config.vector?.similarity ?? "Cosine", similarityThreshold: v } })}
                    min={0}
                    max={1}
                    step={0.05}
                  />
                </div>
              </AccordionSection>
            )}

            {needsBM25 && (
              <AccordionSection title="BM25 Settings" icon={<FileText className="w-3 h-3 text-amber-500" />}>
                <div className="grid grid-cols-3 gap-3">
                  <NumberInput
                    label="Top K"
                    value={config.bm25?.topK ?? 20}
                    onChange={(v) => updateConfig({ bm25: { ...config.bm25, topK: v, language: config.bm25?.language ?? "english", tokenizer: config.bm25?.tokenizer ?? "standard" } })}
                    min={1}
                    max={100}
                  />
                  <SelectInput
                    label="Language"
                    value={config.bm25?.language ?? "english"}
                    onChange={(v) => updateConfig({ bm25: { ...config.bm25, topK: config.bm25?.topK ?? 20, language: v, tokenizer: config.bm25?.tokenizer ?? "standard" } })}
                    options={[
                      { value: "english", label: "English" },
                      { value: "spanish", label: "Spanish" },
                      { value: "french", label: "French" },
                      { value: "german", label: "German" },
                    ]}
                  />
                  <SelectInput
                    label="Tokenizer"
                    value={config.bm25?.tokenizer ?? "standard"}
                    onChange={(v) => updateConfig({ bm25: { ...config.bm25, topK: config.bm25?.topK ?? 20, language: config.bm25?.language ?? "english", tokenizer: v } })}
                    options={[
                      { value: "standard", label: "Standard" },
                      { value: "whitespace", label: "Whitespace" },
                      { value: "porter", label: "Porter Stemmer" },
                    ]}
                  />
                </div>
              </AccordionSection>
            )}

            {needsRRF && (
              <AccordionSection title="RRF Settings" icon={<Blend className="w-3 h-3 text-purple-500" />}>
                <div className="grid grid-cols-3 gap-3">
                  <NumberInput
                    label="RRF K"
                    value={config.rrf?.k ?? 60}
                    onChange={(v) => updateConfig({ rrf: { ...config.rrf, k: v, vectorWeight: config.rrf?.vectorWeight ?? 1, bm25Weight: config.rrf?.bm25Weight ?? 1 } })}
                    min={1}
                    max={1000}
                    tooltip="Controls the rank fusion constant. Higher values reduce the impact of top-ranked documents."
                  />
                  <NumberInput
                    label="Vector Weight"
                    value={config.rrf?.vectorWeight ?? 1}
                    onChange={(v) => updateConfig({ rrf: { ...config.rrf, k: config.rrf?.k ?? 60, vectorWeight: v, bm25Weight: config.rrf?.bm25Weight ?? 1 } })}
                    min={0}
                    max={10}
                    step={0.1}
                    tooltip="Weight multiplier for vector search results in the fusion."
                  />
                  <NumberInput
                    label="BM25 Weight"
                    value={config.rrf?.bm25Weight ?? 1}
                    onChange={(v) => updateConfig({ rrf: { ...config.rrf, k: config.rrf?.k ?? 60, vectorWeight: config.rrf?.vectorWeight ?? 1, bm25Weight: v } })}
                    min={0}
                    max={10}
                    step={0.1}
                    tooltip="Weight multiplier for BM25 results in the fusion."
                  />
                </div>
              </AccordionSection>
            )}

            {needsReranker && (
              <AccordionSection title="Reranker Settings" icon={<ArrowUpDown className="w-3 h-3 text-violet-500" />}>
                <div className="grid grid-cols-2 gap-3">
                  <TextInput
                    label="Model"
                    value={config.reranker?.model ?? ""}
                    onChange={(v) => updateConfig({ reranker: { ...config.reranker, model: v, candidateCount: config.reranker?.candidateCount ?? 20, topN: config.reranker?.topN ?? 8 } })}
                    placeholder="cross-encoder/ms-marco-MiniLM-L-6-v2"
                  />
                  <NumberInput
                    label="Candidate Count"
                    value={config.reranker?.candidateCount ?? 20}
                    onChange={(v) => updateConfig({ reranker: { ...config.reranker, model: config.reranker?.model ?? "", candidateCount: v, topN: config.reranker?.topN ?? 8 } })}
                    min={1}
                    max={100}
                    tooltip="Number of candidate chunks to pass to the reranker."
                  />
                  <NumberInput
                    label="Top N"
                    value={config.reranker?.topN ?? 8}
                    onChange={(v) => updateConfig({ reranker: { ...config.reranker, model: config.reranker?.model ?? "", candidateCount: config.reranker?.candidateCount ?? 20, topN: v } })}
                    min={1}
                    max={50}
                    tooltip="Number of top results to keep after reranking."
                  />
                  <NumberInput
                    label="Score Threshold (optional)"
                    value={config.reranker?.scoreThreshold ?? 0}
                    onChange={(v) => updateConfig({ reranker: { ...config.reranker, model: config.reranker?.model ?? "", candidateCount: config.reranker?.candidateCount ?? 20, topN: config.reranker?.topN ?? 8, scoreThreshold: v || undefined } })}
                    min={0}
                    max={1}
                    step={0.05}
                  />
                </div>
              </AccordionSection>
            )}

            {needsMMR && (
              <AccordionSection title="MMR Settings" icon={<Filter className="w-3 h-3 text-pink-500" />}>
                <div className="space-y-4">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Lambda</label>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            Higher values prioritize relevance over diversity when selecting chunks. This is a retrieval setting, unrelated to the LLM's Temperature below.
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <span className="text-xs font-mono text-gray-600">{(config.mmr?.lambda ?? 0.7).toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={config.mmr?.lambda ?? 0.7}
                      onChange={(e) => updateConfig({ mmr: { ...config.mmr, lambda: parseFloat(e.target.value), candidateCount: config.mmr?.candidateCount ?? 15, finalCount: config.mmr?.finalCount ?? 8 } })}
                      className="w-full h-1.5 rounded-full appearance-none bg-gray-200 accent-pink-500 cursor-pointer"
                    />
                    <div className="flex justify-between text-[9px] text-gray-400">
                      <span>0 (Diverse)</span>
                      <span>1 (Relevant)</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <NumberInput
                      label="Candidate Count"
                      value={config.mmr?.candidateCount ?? 15}
                      onChange={(v) => updateConfig({ mmr: { ...config.mmr, lambda: config.mmr?.lambda ?? 0.7, candidateCount: v, finalCount: config.mmr?.finalCount ?? 8 } })}
                      min={1}
                      max={50}
                    />
                    <NumberInput
                      label="Final Selection Count"
                      value={config.mmr?.finalCount ?? 8}
                      onChange={(v) => updateConfig({ mmr: { ...config.mmr, lambda: config.mmr?.lambda ?? 0.7, candidateCount: config.mmr?.candidateCount ?? 15, finalCount: v } })}
                      min={1}
                      max={30}
                    />
                  </div>
                </div>
              </AccordionSection>
            )}

            <AccordionSection title="LLM Settings" icon={<Brain className="w-3 h-3 text-emerald-500" />}>
              <div className="grid grid-cols-2 gap-3">
                <TextInput
                  label="Model"
                  value={config.llm.model}
                  onChange={(v) => updateConfig({ llm: { ...config.llm, model: v } })}
                />
                <NumberInput
                  label="Temperature"
                  value={config.llm.temperature}
                  onChange={(v) => updateConfig({ llm: { ...config.llm, temperature: v } })}
                  min={0}
                  max={2}
                  step={0.1}
                  tooltip="Controls how random/creative the LLM's answer text is. Unrelated to MMR Lambda below, which controls retrieval diversity, not text generation."
                />
                <NumberInput
                  label="Top P"
                  value={config.llm.topP}
                  onChange={(v) => updateConfig({ llm: { ...config.llm, topP: v } })}
                  min={0}
                  max={1}
                  step={0.05}
                  tooltip="Nucleus sampling: only consider tokens within the top P probability mass. Leave at 1 to disable and rely on Temperature alone."
                />
                <NumberInput
                  label="Max Tokens"
                  value={config.llm.maxTokens}
                  onChange={(v) => updateConfig({ llm: { ...config.llm, maxTokens: v } })}
                  min={1}
                  max={16384}
                />
                <TextInput
                  label="System Prompt Version (optional)"
                  value={config.llm.systemPromptVersion ?? ""}
                  onChange={(v) => updateConfig({ llm: { ...config.llm, systemPromptVersion: v || undefined } })}
                  placeholder="v1.0"
                />
              </div>
            </AccordionSection>
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-3.5 h-3.5 text-gray-500" />
            <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Evaluation Metrics</label>
          </div>
          <div className="space-y-4">
            {Object.entries(metricsByCategory).map(([category, metrics]) => (
              <div key={category} className="space-y-2.5">
                <div className="flex items-center gap-1.5">
                  {categoryIcons[category]}
                  <span className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider">{category}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {metrics.map((metric) => {
                    const isActive = config.metrics.includes(metric.value)
                    return (
                      <Tooltip key={metric.value}>
                        <TooltipTrigger
                          render={
                            <button
                              onClick={() => toggleMetric(metric.value)}
                              className={cn(
                                "flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-medium border transition-all",
                                isActive
                                  ? "bg-gray-900 text-white border-gray-900"
                                  : "bg-white text-gray-500 border-black/[0.06] hover:bg-gray-50"
                              )}
                            />
                          }
                        >
                          {isActive && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                            >
                              <Check className="w-2.5 h-2.5" />
                            </motion.div>
                          )}
                          {metric.label}
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          {metric.tooltip}
                        </TooltipContent>
                      </Tooltip>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="secondary" className="text-[10px]">
              {config.metrics.length} selected
            </Badge>
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Database className="w-3.5 h-3.5 text-gray-500" />
            <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Dataset & Version</label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Dataset</label>
              <SelectField
                value={selectedDataset?.id ?? ""}
                onChange={(v) => {
                  const ds = datasets.find((d) => d.id === v)
                  if (ds) {
                    setSelectedDataset(ds)
                    updateConfig({ datasetId: ds.id, datasetVersion: ds.currentVersion })
                    setSelectedVersion(ds.currentVersion)
                  }
                }}
                options={datasets.map((ds) => ({ value: ds.id, label: ds.name }))}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Version</label>
              <SelectField
                value={selectedVersion}
                onChange={(v) => {
                  setSelectedVersion(v)
                  updateConfig({ datasetVersion: v })
                }}
                options={(selectedDataset?.versions ?? []).map((v) => ({ value: v.version, label: `${v.version} (${v.cases.length} cases)` }))}
              />
            </div>
          </div>
          {selectedVersionObj && (
            <div className="flex items-center gap-3 px-1">
              <span className="text-[10px] text-gray-400">{selectedVersionObj.cases.length} test cases</span>
              {selectedVersionObj.changeNote && (
                <>
                  <span className="text-[10px] text-gray-300">·</span>
                  <span className="text-[10px] text-gray-400">{selectedVersionObj.changeNote}</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-black/[0.06] bg-white px-5 py-4">
        <Button
          onClick={() => {
            startBenchmark()
            router.push("/benchmark")
          }}
          disabled={isRunning || !selectedDataset || config.metrics.length === 0}
          className={cn(
            "w-full h-10 rounded-lg text-sm font-semibold transition-all",
            isRunning
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-emerald-600 text-white shadow-sm shadow-emerald-600/30 hover:bg-emerald-500 hover:shadow-md hover:shadow-emerald-500/40 active:bg-emerald-700"
          )}
        >
          {isRunning ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Running Benchmark...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Play className="w-4 h-4" />
              Run Benchmark
            </div>
          )}
        </Button>
        {config.metrics.length === 0 && (
          <p className="text-[10px] text-amber-600 text-center mt-2">
            Select at least one evaluation metric to run.
          </p>
        )}
      </div>
    </div>
  )
}
