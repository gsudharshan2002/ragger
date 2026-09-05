"use client"

import dynamic from "next/dynamic"
import { Header } from "@/components/rag/header"
import { BarChart3, Sparkles, Target } from "lucide-react"

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

function BenchmarkHero() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white/70 backdrop-blur p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/60 via-white to-emerald-50/60 pointer-events-none" />
      <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-md">
            <BarChart3 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">RAG Benchmark</h1>
            <p className="mt-1 text-sm text-gray-600 max-w-xl">Evaluate retrieval, ranking and generation quality across strategies. Compare runs, drill into failures and track improvements over time.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-emerald-700 ring-1 ring-emerald-200">
            <Target className="h-3.5 w-3.5" /> Golden datasets
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-3 py-1 text-indigo-700 ring-1 ring-indigo-200">
            <Sparkles className="h-3.5 w-3.5" /> Multi-strategy
          </span>
        </div>
      </div>
    </div>
  )
}

export default function BenchmarkPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[radial-gradient(1200px_600px_at_80%_-10%,rgba(99,102,241,0.10),transparent),radial-gradient(900px_500px_at_-10%_20%,rgba(16,185,129,0.08),transparent)] bg-gray-50">
      <Header />
      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-[1400px] px-6 py-8 space-y-6">
          <BenchmarkHero />
          <BenchmarkProgress />
          <BenchmarkDashboard />
          <div id="benchmark-results-section" className="scroll-mt-24">
            <BenchmarkResults />
          </div>
        </div>
      </div>
    </div>
  )
}
