"use client"

import dynamic from "next/dynamic"
import { Header } from "@/components/rag/header"
import { TracePanel } from "@/components/rag/trace-panel"
import { useRagContext } from "@/hooks/use-rag"

const BenchmarkDashboard = dynamic(
  () => import("@/components/benchmark/benchmark-dashboard").then(m => ({ default: m.BenchmarkDashboard })),
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

export default function BenchmarkPage() {
  const { tracePanelOpen, setTracePanelOpen, selectedTrace, setSelectedTrace } = useRagContext()

  return (
    <div className="flex flex-col h-full bg-gray-50/50">
      <Header />
      <div className="flex-1 overflow-auto">
        <div className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">
          <BenchmarkProgress />
          <BenchmarkDashboard />
          <div id="benchmark-results-section">
            <BenchmarkResults />
          </div>
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
