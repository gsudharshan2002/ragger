"use client"

import { Header } from "@/components/rag/header"
import { KbList } from "@/components/knowledge-base/kb-list"

export default function KnowledgeBasesPage() {
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
          <KbList />
        </div>
      </main>
    </div>
  )
}
