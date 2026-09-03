"use client"

import dynamic from "next/dynamic"
import { Header } from "@/components/rag/header"
import { TracePanel } from "@/components/rag/trace-panel"
import { useRagContext } from "@/hooks/use-rag"

const DeveloperDocsEvaluation = dynamic(
  () => import("@/components/benchmark/developer-docs-evaluation").then(m => ({ default: m.DeveloperDocsEvaluation })),
  { ssr: false }
)

export default function Week6Page() {
  const { tracePanelOpen, setTracePanelOpen, selectedTrace, setSelectedTrace } = useRagContext()

  return (
    <div className="flex flex-col h-full bg-gray-50/50">
      <Header />
      <div className="flex-1 overflow-auto">
        <div className="max-w-[1600px] mx-auto px-6 py-6">
          <DeveloperDocsEvaluation />
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
