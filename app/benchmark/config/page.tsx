"use client"

import dynamic from "next/dynamic"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Header } from "@/components/rag/header"

const BenchmarkConfig = dynamic(
  () => import("@/components/benchmark/benchmark-config").then(m => ({ default: m.BenchmarkConfig })),
  { ssr: false }
)

export default function BenchmarkConfigPage() {
  return (
    <div className="flex flex-col h-full bg-gray-50/50">
      <Header />
      <div className="flex-1 overflow-auto">
        <div className="max-w-[900px] mx-auto px-6 py-6 space-y-4">
          <Link
            href="/benchmark"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 transition-colors hover:text-gray-900"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Benchmark
          </Link>
          <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
            <BenchmarkConfig />
          </div>
        </div>
      </div>
    </div>
  )
}
