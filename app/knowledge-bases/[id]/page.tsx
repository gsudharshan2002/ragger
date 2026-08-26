"use client"

import { use } from "react"
import { Header } from "@/components/rag/header"
import { KbDetail } from "@/components/knowledge-base/kb-detail"

export default function KnowledgeBaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)

  return (
    <div className="flex flex-col h-screen bg-transparent">
      <div className="bg-animated-gradient">
        <div className="bg-orb bg-orb-1" />
        <div className="bg-orb bg-orb-2" />
        <div className="bg-orb bg-orb-3" />
        <div className="bg-orb bg-orb-4" />
      </div>

      <Header />

      <main className="flex-1 flex flex-col min-h-0 relative z-10 overflow-y-auto">
        <div className="max-w-[1400px] mx-auto w-full px-6 py-6">
          <KbDetail knowledgeBaseId={id} />
        </div>
      </main>
    </div>
  )
}
