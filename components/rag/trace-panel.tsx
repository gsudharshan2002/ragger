"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  X,
  Copy,
  Download,
  ChevronDown,
  ChevronRight,
  Check,
  FileText,
  Layers,
  MessageSquare,
  Sparkles,
  Search,
  Blend,
  ArrowUpDown,
  Filter,
  Hash,
  Globe,
  Tag,
  Trash2,
  AlertTriangle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { apiFetch } from "@/lib/api"
import type { RagTrace, Chunk } from "@/lib/types"
import { getStageColor, getStageLabel } from "@/lib/events"
import { cn, formatDuration, formatNumber, copyToClipboard } from "@/lib/utils"

interface TracePanelProps {
  open: boolean
  onClose: () => void
  trace: RagTrace | null
}

export function TracePanel({ open, onClose, trace }: TracePanelProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    overview: true,
    query: true,
    vector: true,
    bm25: true,
    rrf: true,
    reranker: true,
    mmr: true,
    context: true,
    prompt: true,
    llm: true,
    sources: true,
    tokens: true,
    latency: true,
    metadata: true,
    raw: false,
  })

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const handleCopy = (text: string, field: string) => {
    copyToClipboard(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const handleDownloadJson = () => {
    if (!trace) return
    const blob = new Blob([JSON.stringify(trace, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `trace-${trace.overview.traceId}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleDeleteTrace = async () => {
    if (!trace) return
    setDeleting(true)
    try {
      const res = await apiFetch(`/traces/${trace.overview.traceId}`, { method: "DELETE" })
      if (res.ok) {
        setConfirmingDelete(false)
        onClose()
      }
    } catch {
      // ignore - dialog stays open so the user can retry
    } finally {
      setDeleting(false)
    }
  }

  if (!trace) return null

  const { overview } = trace

  return (
    <>
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/10 backdrop-blur-[2px]"
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-2xl bg-white shadow-[-8px_0_30px_-8px_rgba(0,0,0,0.1)] border-l border-black/[0.04]"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-black/[0.04]">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Full Trace</h2>
                <p className="text-[11px] text-gray-400 font-mono mt-0.5">{overview.traceId}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleCopy(overview.traceId, "traceId")}
                        className="w-7 h-7 text-gray-400 hover:text-gray-600"
                      />
                    }
                  >
                    {copiedField === "traceId" ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </TooltipTrigger>
                  <TooltipContent>Copy Trace ID</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setConfirmingDelete(true)}
                        className="w-7 h-7 text-gray-400 hover:text-red-500"
                      />
                    }
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </TooltipTrigger>
                  <TooltipContent>Delete Trace</TooltipContent>
                </Tooltip>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="w-7 h-7 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <ScrollArea className="h-[calc(100vh-65px)]">
              <div className="p-6 space-y-4">
                <TraceSection
                  title="Overview"
                  icon={<Hash className="w-3.5 h-3.5" />}
                  expanded={expandedSections.overview}
                  onToggle={() => toggleSection("overview")}
                >
                  <div className="grid grid-cols-2 gap-2">
                    <TraceField label="Trace ID" value={overview.traceId} onCopy={() => handleCopy(overview.traceId, "traceId")} copied={copiedField === "traceId"} />
                    <TraceField label="Run ID" value={overview.runId} onCopy={() => handleCopy(overview.runId, "runId")} copied={copiedField === "runId"} />
                    <TraceField label="Session ID" value={overview.sessionId} onCopy={() => handleCopy(overview.sessionId, "sessionId")} copied={copiedField === "sessionId"} />
                    <TraceField label="Request ID" value={overview.requestId} onCopy={() => handleCopy(overview.requestId, "requestId")} copied={copiedField === "requestId"} />
                    <TraceField label="Timestamp" value={new Date(overview.timestamp).toLocaleString()} />
                    <TraceField label="Status" value={overview.status} />
                    <TraceField label="Strategy" value={overview.strategy} />
                    <TraceField label="Model" value={overview.model} />
                    <TraceField label="Embedding Model" value={overview.embeddingModel} />
                    {overview.rerankerModel && <TraceField label="Reranker" value={overview.rerankerModel} />}
                    <TraceField label="Environment" value={overview.environment} />
                    <TraceField label="Version" value={overview.version} />
                  </div>

                  <div className="mt-3">
                    <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-2">Stages</div>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(overview.stages).map(([name, stage]) => (
                        <div
                          key={name}
                          className={cn(
                            "flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-medium",
                            stage.status === "completed" && "bg-emerald-50 text-emerald-600",
                            stage.status === "running" && "bg-blue-50 text-blue-600",
                            stage.status === "error" && "bg-red-50 text-red-600",
                            stage.status === "skipped" && "bg-gray-50 text-gray-400"
                          )}
                        >
                          <div
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: getStageColor(name) }}
                          />
                          {getStageLabel(name)}
                          {stage.latencyMs > 0 && (
                            <span className="text-gray-400">{formatDuration(stage.latencyMs)}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </TraceSection>

                <TraceSection
                  title="Query"
                  icon={<Search className="w-3.5 h-3.5" />}
                  expanded={expandedSections.query}
                  onToggle={() => toggleSection("query")}
                >
                  <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-700 leading-relaxed">
                    {trace.query}
                  </div>
                </TraceSection>

                {trace.vectorSearch && (
                  <TraceSection
                    title="Vector Search"
                    icon={<Search className="w-3.5 h-3.5" />}
                    expanded={expandedSections.vector}
                    onToggle={() => toggleSection("vector")}
                    color={getStageColor("vector")}
                  >
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <TraceField label="Embedding Model" value={trace.vectorSearch.embeddingModel} />
                      <TraceField label="Dimensions" value={String(trace.vectorSearch.dimensions)} />
                      <TraceField label="Top K" value={String(trace.vectorSearch.topK)} />
                      <TraceField label="Similarity" value={trace.vectorSearch.similarity} />
                      <TraceField label="Latency" value={formatDuration(trace.vectorSearch.latencyMs)} />
                      <TraceField label="Chunks" value={String(trace.vectorSearch.chunks.length)} />
                    </div>
                    <RetrievalChunksTable chunks={trace.vectorSearch.chunks} />
                  </TraceSection>
                )}

                {trace.bm25 && (
                  <TraceSection
                    title="BM25"
                    icon={<FileText className="w-3.5 h-3.5" />}
                    expanded={expandedSections.bm25}
                    onToggle={() => toggleSection("bm25")}
                    color={getStageColor("bm25")}
                  >
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <TraceField label="Top K" value={String(trace.bm25.topK)} />
                      <TraceField label="Query Terms" value={trace.bm25.queryTerms.join(", ")} />
                      <TraceField label="Latency" value={formatDuration(trace.bm25.latencyMs)} />
                      <TraceField label="Chunks" value={String(trace.bm25.chunks.length)} />
                    </div>
                    <RetrievalChunksTable chunks={trace.bm25.chunks} />
                  </TraceSection>
                )}

                {trace.rrf && (
                  <TraceSection
                    title="RRF"
                    icon={<Blend className="w-3.5 h-3.5" />}
                    expanded={expandedSections.rrf}
                    onToggle={() => toggleSection("rrf")}
                    color={getStageColor("rrf")}
                  >
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <TraceField label="Latency" value={formatDuration(trace.rrf.latencyMs)} />
                      <TraceField label="Merged Chunks" value={String(trace.rrf.mergedChunks.length)} />
                      <TraceField label="Vector Input" value={String(trace.rrf.vectorChunks.length)} />
                      <TraceField label="BM25 Input" value={String(trace.rrf.bm25Chunks.length)} />
                    </div>
                    <RetrievalChunksTable chunks={trace.rrf.mergedChunks} />
                  </TraceSection>
                )}

                {trace.reranker && (
                  <TraceSection
                    title="Reranker"
                    icon={<ArrowUpDown className="w-3.5 h-3.5" />}
                    expanded={expandedSections.reranker}
                    onToggle={() => toggleSection("reranker")}
                    color={getStageColor("reranker")}
                  >
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <TraceField label="Model" value={trace.reranker.model} />
                      <TraceField label="Candidates" value={String(trace.reranker.candidates)} />
                      <TraceField label="Top N" value={String(trace.reranker.topN)} />
                      <TraceField label="Latency" value={formatDuration(trace.reranker.latencyMs)} />
                    </div>
                    <RetrievalChunksTable chunks={trace.reranker.afterChunks} />
                  </TraceSection>
                )}

                {trace.mmr && (
                  <TraceSection
                    title="MMR"
                    icon={<Filter className="w-3.5 h-3.5" />}
                    expanded={expandedSections.mmr}
                    onToggle={() => toggleSection("mmr")}
                    color={getStageColor("mmr")}
                  >
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <TraceField label="Lambda" value={String(trace.mmr.lambda)} />
                      <TraceField label="Candidates" value={String(trace.mmr.candidateCount)} />
                      <TraceField label="Final Count" value={String(trace.mmr.finalCount)} />
                      <TraceField label="Latency" value={formatDuration(trace.mmr.latencyMs)} />
                    </div>
                    <RetrievalChunksTable chunks={trace.mmr.selectedChunks} />
                    {trace.mmr.rejectedChunks.length > 0 && (
                      <div className="mt-2">
                        <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">Rejected</div>
                        <RetrievalChunksTable chunks={trace.mmr.rejectedChunks} muted />
                      </div>
                    )}
                  </TraceSection>
                )}

                <TraceSection
                  title="Context"
                  icon={<Layers className="w-3.5 h-3.5" />}
                  expanded={expandedSections.context}
                  onToggle={() => toggleSection("context")}
                  color={getStageColor("context")}
                >
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <TraceField label="Chunks" value={String(trace.context.chunkCount)} />
                    <TraceField label="Documents" value={String(trace.context.documentCount)} />
                    <TraceField label="Tokens" value={formatNumber(trace.context.totalTokens)} />
                  </div>
                  <RetrievalChunksTable chunks={trace.context.chunks} />
                </TraceSection>

                <TraceSection
                  title="Prompt"
                  icon={<MessageSquare className="w-3.5 h-3.5" />}
                  expanded={expandedSections.prompt}
                  onToggle={() => toggleSection("prompt")}
                  color={getStageColor("prompt")}
                >
                  <PromptDetail prompt={trace.prompt} />
                </TraceSection>

                <TraceSection
                  title="LLM"
                  icon={<Sparkles className="w-3.5 h-3.5" />}
                  expanded={expandedSections.llm}
                  onToggle={() => toggleSection("llm")}
                  color={getStageColor("llm")}
                >
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <TraceField label="Model" value={trace.llm.model} />
                    <TraceField label="Temperature" value={String(trace.llm.temperature)} />
                    <TraceField label="Max Tokens" value={String(trace.llm.maxTokens)} />
                    <TraceField label="Input Tokens" value={formatNumber(trace.llm.inputTokens)} />
                    <TraceField label="Output Tokens" value={formatNumber(trace.llm.outputTokens)} />
                    <TraceField label="Latency" value={formatDuration(trace.llm.latencyMs)} />
                  </div>
                </TraceSection>

                <TraceSection
                  title="Token Breakdown"
                  icon={<Tag className="w-3.5 h-3.5" />}
                  expanded={expandedSections.tokens}
                  onToggle={() => toggleSection("tokens")}
                >
                  <TokenBreakdown breakdown={trace.tokenBreakdown} />
                </TraceSection>

                <TraceSection
                  title="Raw JSON"
                  icon={<Globe className="w-3.5 h-3.5" />}
                  expanded={expandedSections.raw}
                  onToggle={() => toggleSection("raw")}
                >
                  <div className="flex items-center gap-1.5 mb-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(JSON.stringify(trace, null, 2), "rawJson")}
                      className="h-6 px-2 text-[10px] rounded-full"
                    >
                      {copiedField === "rawJson" ? <Check className="w-2.5 h-2.5 mr-1" /> : <Copy className="w-2.5 h-2.5 mr-1" />}
                      Copy JSON
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadJson}
                      className="h-6 px-2 text-[10px] rounded-full"
                    >
                      <Download className="w-2.5 h-2.5 mr-1" />
                      Download
                    </Button>
                  </div>
                  <pre className="bg-gray-50 rounded-lg p-3 text-[10px] text-gray-600 font-mono overflow-x-auto max-h-96 overflow-y-auto leading-relaxed">
                    {JSON.stringify(trace, null, 2)}
                  </pre>
                </TraceSection>
              </div>
            </ScrollArea>
          </motion.div>
        </>
      )}
    </AnimatePresence>

    <Dialog open={confirmingDelete} onOpenChange={(o) => { if (!o) setConfirmingDelete(false) }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-red-50">
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </div>
          <DialogTitle className="text-center">Delete this trace?</DialogTitle>
          <DialogDescription className="text-center">
            This will permanently delete trace <span className="font-mono text-gray-700">{trace?.overview.traceId.slice(0, 8)}</span>. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-center">
          <Button variant="outline" onClick={() => setConfirmingDelete(false)}>Cancel</Button>
          <Button className="bg-red-600 text-white hover:bg-red-700" onClick={handleDeleteTrace} disabled={deleting}>
            <Trash2 className="mr-2 h-4 w-4" />
            {deleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}

function TraceSection({
  title,
  icon,
  expanded,
  onToggle,
  color,
  children,
}: {
  title: string
  icon: React.ReactNode
  expanded: boolean
  onToggle: () => void
  color?: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-black/[0.04] overflow-hidden">
      <button
        onClick={onToggle}
        className="flex items-center gap-2 w-full px-4 py-3 text-left hover:bg-gray-50/50 transition-colors"
      >
        <div className="text-gray-400">{icon}</div>
        {color && <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />}
        <span className="text-xs font-semibold text-gray-800 flex-1">{title}</span>
        <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-3.5 h-3.5 text-gray-300" />
        </motion.div>
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
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

function TraceField({
  label,
  value,
  onCopy,
  copied,
}: {
  label: string
  value: string
  onCopy?: () => void
  copied?: boolean
}) {
  return (
    <div className="px-3 py-2 rounded-lg bg-gray-50/80 group">
      <div className="text-[10px] text-gray-400 mb-0.5">{label}</div>
      <div className="flex items-center gap-1">
        <span className="text-[11px] font-medium text-gray-700 truncate font-mono">{value}</span>
        {onCopy && (
          <button
            onClick={onCopy}
            className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            {copied ? (
              <Check className="w-2.5 h-2.5 text-emerald-500" />
            ) : (
              <Copy className="w-2.5 h-2.5 text-gray-400 hover:text-gray-600" />
            )}
          </button>
        )}
      </div>
    </div>
  )
}

function RetrievalChunksTable({ chunks, muted }: { chunks: Chunk[]; muted?: boolean }) {
  if (chunks.length === 0) return <div className="text-[10px] text-gray-400">No chunks</div>

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[10px]">
        <thead>
          <tr className="text-gray-400 border-b border-black/[0.04]">
            <th className="text-left py-1 px-2 font-medium">#</th>
            <th className="text-left py-1 px-2 font-medium">ID</th>
            <th className="text-left py-1 px-2 font-medium">Score</th>
            <th className="text-left py-1 px-2 font-medium">Document</th>
            <th className="text-left py-1 px-2 font-medium">Page</th>
            <th className="text-left py-1 px-2 font-medium">Section</th>
            <th className="text-left py-1 px-2 font-medium">Tokens</th>
          </tr>
        </thead>
        <tbody>
          {chunks.map((chunk) => (
            <tr
              key={chunk.id}
              className={cn(
                "border-b border-black/[0.02] hover:bg-gray-50/50 transition-colors",
                muted && "opacity-40"
              )}
            >
              <td className="py-1.5 px-2 font-mono text-gray-400">{chunk.rank}</td>
              <td className="py-1.5 px-2 font-mono text-gray-600">{chunk.id}</td>
              <td className="py-1.5 px-2 font-mono text-gray-600">{chunk.score.toFixed(3)}</td>
              <td className="py-1.5 px-2 text-gray-600 truncate max-w-[120px]">{chunk.document}</td>
              <td className="py-1.5 px-2 text-gray-600">{chunk.page}</td>
              <td className="py-1.5 px-2 text-gray-600">{chunk.section}</td>
              <td className="py-1.5 px-2 font-mono text-gray-600">{chunk.tokens}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PromptDetail({ prompt }: { prompt: RagTrace["prompt"] }) {
  const [tab, setTab] = useState<"system" | "context" | "user">("system")

  return (
    <div>
      <div className="flex items-center gap-1 mb-2">
        {(["system", "context", "user"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors",
              tab === t ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            )}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      <pre className="bg-gray-50 rounded-lg p-3 text-[10px] text-gray-600 font-mono overflow-x-auto max-h-48 overflow-y-auto leading-relaxed whitespace-pre-wrap">
        {prompt[tab]}
      </pre>
      <div className="flex items-center gap-3 mt-2">
        <span className="text-[10px] text-gray-400">System: {prompt.systemTokens}t</span>
        <span className="text-[10px] text-gray-400">Context: {prompt.contextTokens}t</span>
        <span className="text-[10px] text-gray-400">User: {prompt.userTokens}t</span>
        <span className="text-[10px] font-medium text-gray-500">Total: {prompt.totalTokens}t</span>
      </div>
    </div>
  )
}

function TokenBreakdown({ breakdown }: { breakdown: RagTrace["tokenBreakdown"] }) {
  const items = [
    { label: "System", value: breakdown.system, color: "#3b82f6" },
    { label: "Context", value: breakdown.context, color: "#10b981" },
    { label: "User", value: breakdown.user, color: "#6366f1" },
    { label: "Input", value: breakdown.input, color: "#f59e0b" },
    { label: "Output", value: breakdown.output, color: "#06b6d4" },
    { label: "Total", value: breakdown.total, color: "#171717" },
  ]

  const maxVal = Math.max(...items.map((i) => i.value))

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-2">
          <span className="text-[10px] text-gray-500 w-14">{item.label}</span>
          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(item.value / maxVal) * 100}%` }}
              transition={{ duration: 0.5 }}
              className="h-full rounded-full"
              style={{ backgroundColor: item.color }}
            />
          </div>
          <span className="text-[10px] font-mono text-gray-500 w-16 text-right">{formatNumber(item.value)}</span>
        </div>
      ))}
    </div>
  )
}


