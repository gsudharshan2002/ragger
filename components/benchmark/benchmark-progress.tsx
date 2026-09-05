"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Activity,
  Clock,
  Zap,
  CheckCircle2,
  AlertTriangle,
  StopCircle,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useBenchmark } from "@/hooks/use-benchmark"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { cn, formatDuration } from "@/lib/utils"
import type { RagStrategy } from "@/lib/types"

function formatElapsed(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${minutes}:${secs.toString().padStart(2, "0")}`
}

function formatStrategyLabel(strategy: RagStrategy): string {
  const labels: Record<RagStrategy, string> = {
    vector: "Vector",
    bm25: "BM25",
    hybrid: "Hybrid",
    "hybrid-rrf": "Hybrid RRF",
    "hybrid-rerank": "Hybrid Rerank",
    "hybrid-rerank-mmr": "Hybrid Rerank MMR",
  }
  return labels[strategy] || strategy
}

function getStrategyBadgeColor(strategy: RagStrategy) {
  const colors: Record<RagStrategy, string> = {
    vector: "bg-indigo-50 text-indigo-700 border-indigo-200",
    bm25: "bg-amber-50 text-amber-700 border-amber-200",
    hybrid: "bg-gray-50 text-gray-700 border-gray-200",
    "hybrid-rrf": "bg-purple-50 text-purple-700 border-purple-200",
    "hybrid-rerank": "bg-violet-50 text-violet-700 border-violet-200",
    "hybrid-rerank-mmr": "bg-pink-50 text-pink-700 border-pink-200",
  }
  return colors[strategy] || "bg-gray-50 text-gray-700 border-gray-200"
}

export function BenchmarkProgress() {
  const { isRunning, progress, activeRun, cancelBenchmark } = useBenchmark()
  const [elapsedMs, setElapsedMs] = useState(0)
  const [startTime] = useState(() => Date.now())
  const [confirmingCancel, setConfirmingCancel] = useState(false)

  useEffect(() => {
    if (!isRunning) {
      setElapsedMs(0)
      return
    }
    const interval = setInterval(() => {
      setElapsedMs(Date.now() - startTime)
    }, 100)
    return () => clearInterval(interval)
  }, [isRunning, startTime])

  const handleCancel = useCallback(() => {
    setConfirmingCancel(true)
  }, [])

  const confirmCancel = useCallback(() => {
    cancelBenchmark()
    setConfirmingCancel(false)
  }, [cancelBenchmark])

  const declineCancel = useCallback(() => {
    setConfirmingCancel(false)
  }, [])

  if (!isRunning) return null

  const { completed, total, currentQuery } = progress
  const percentage = total > 0 ? (completed / total) * 100 : 0
  const throughput = elapsedMs > 0 ? (completed / (elapsedMs / 60000)).toFixed(4) : "0.0000"
  const estimatedRemaining =
    completed > 0 && completed < total
      ? ((elapsedMs / completed) * (total - completed))
      : 0

  return (
    <AnimatePresence>
        <motion.div
         initial={{ opacity: 0, y: -10 }}
         animate={{ opacity: 1, y: 0 }}
         exit={{ opacity: 0, y: -10 }}
         className="rounded-2xl border border-gray-200 bg-white/80 backdrop-blur p-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)] space-y-5"
       >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Benchmark Running</h3>
          </div>
          <div>
            {confirmingCancel ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Are you sure?</span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={confirmCancel}
                  className="h-8"
                >
                  Confirm
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={declineCancel}
                  className="h-8"
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                className="h-8 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
              >
                <StopCircle className="w-4 h-4 mr-1.5" />
                Cancel
              </Button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"
              initial={{ width: 0 }}
              animate={{ width: `${percentage}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">
              {completed} / {total} tests
            </span>
            <span className="font-medium text-gray-700">
              {Math.round(percentage)}%
            </span>
          </div>
        </div>

        {/* Current Query */}
        {currentQuery && (
          <p className="text-sm italic text-gray-400 truncate" title={currentQuery}>
            &ldquo;{currentQuery}&rdquo;
          </p>
        )}

        <Separator />

        {/* Live Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <Clock className="w-3.5 h-3.5" />
              Elapsed Time
            </div>
            <p className="text-lg font-semibold text-gray-900 tabular-nums">
              {formatElapsed(elapsedMs)}
            </p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Tests Completed
            </div>
            <p className="text-lg font-semibold text-gray-900 tabular-nums">
              {completed}
            </p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <Activity className="w-3.5 h-3.5" />
              Throughput
            </div>
            <p className="text-lg font-semibold text-gray-900 tabular-nums">
              {throughput} <span className="text-xs font-normal text-gray-400">tests/min</span>
            </p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <Zap className="w-3.5 h-3.5" />
              Strategy
            </div>
            <Badge
              variant="outline"
              className={cn(
                "rounded-full text-xs font-medium border",
                activeRun ? getStrategyBadgeColor(activeRun.strategy) : ""
              )}
            >
              {activeRun ? formatStrategyLabel(activeRun.strategy) : "—"}
            </Badge>
          </div>
        </div>

        {/* Estimated Time Remaining */}
        {estimatedRemaining > 0 && completed > 0 && completed < total && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Clock className="w-4 h-4" />
            Estimated time remaining:{" "}
            <span className="font-medium text-gray-700 tabular-nums">
              {formatDuration(estimatedRemaining)}
            </span>
          </div>
        )}

      </motion.div>
    </AnimatePresence>
  )
}
