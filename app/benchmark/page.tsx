"use client"

import dynamic from "next/dynamic"
import { TracePanel } from "@/components/rag/trace-panel"
import { useRagContext } from "@/hooks/use-rag"

const BenchmarkDashboard = dynamic(
  () => import("@/components/benchmark/benchmark-dashboard").then(m => ({ default: m.BenchmarkDashboard })),
  { ssr: false }
)

const BenchmarkConfig = dynamic(
  () => import("@/components/benchmark/benchmark-config").then(m => ({ default: m.BenchmarkConfig })),
  { ssr: false }
)

const BenchmarkProgress = dynamic(
  () => import("@/components/benchmark/benchmark-progress").then(m => ({ default: m.BenchmarkProgress })),
  { ssr: false }
)

const BenchmarkResults = dynamic(
  () => import("@/components/benchmark/benchmark-results").then(m => ({ default: m.BenchmarkResults })),
  { ssr: false }
)

const StrategyComparison = dynamic(
  () => import("@/components/benchmark/strategy-comparison").then(m => ({ default: m.StrategyComparison })),
  { ssr: false }
)

export default function BenchmarkPage() {
  const { tracePanelOpen, setTracePanelOpen, selectedTrace, setSelectedTrace } = useRagContext()

  return (
    <div className="flex flex-col h-full bg-gray-50/50">
      <div className="flex-1 overflow-auto">
        <div className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">
          <BenchmarkDashboard />
          <BenchmarkConfig />
          <BenchmarkProgress />
          <BenchmarkResults />
          <StrategyComparison />
        </div>
      </div>
      <TracePanel
        open={tracePanelOpen}
        onClose={() => {
          setTracePanelOpen(false)
          setSelectedTrace(null)
        }}
        trace={selectedTrace}
      />
    </div>
  )
}
