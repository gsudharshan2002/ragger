"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Brain, FileText, Puzzle, Hash, Clock } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { KnowledgeBase, KnowledgeBaseStats, ApiResponse } from "@/lib/types"
import { formatNumber } from "@/lib/utils"

interface KbCardProps {
  knowledgeBase: KnowledgeBase
  index: number
}

function relativeTime(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diffMs / 86400000)
  if (days < 1) return "today"
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return `${Math.floor(days / 30)}mo ago`
}

export function KbCard({ knowledgeBase, index }: KbCardProps) {
  const [stats, setStats] = useState<KnowledgeBaseStats | null>(null)

  useEffect(() => {
    let cancelled = false

    async function fetchStats() {
      try {
        const res = await fetch(`/api/knowledge-bases/${knowledgeBase.id}`)
        const body: ApiResponse<KnowledgeBase & { stats: KnowledgeBaseStats }> =
          await res.json()
        if (!cancelled && body.success && body.data?.stats) {
          setStats(body.data.stats)
        }
      } catch {
        // Stats are optional display — silently ignore failures
      }
    }

    fetchStats()
    return () => {
      cancelled = true
    }
  }, [knowledgeBase.id])

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ delay: index * 0.04 }}
    >
      <Link href={`/knowledge-bases/${knowledgeBase.id}`}>
        <div className="group relative rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:border-gray-300 cursor-pointer">
          <div className="flex items-start gap-3 mb-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 shadow-sm shrink-0">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-gray-900 truncate group-hover:text-indigo-600 transition-colors">
                {knowledgeBase.name}
              </h3>
              {knowledgeBase.description && (
                <p className="mt-0.5 text-xs text-gray-500 line-clamp-2 leading-relaxed">
                  {knowledgeBase.description}
                </p>
              )}
            </div>
          </div>

          {knowledgeBase.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {knowledgeBase.tags.slice(0, 3).map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="bg-gray-100 text-gray-600 text-xs"
                >
                  {tag}
                </Badge>
              ))}
              {knowledgeBase.tags.length > 3 && (
                <Badge
                  variant="secondary"
                  className="bg-gray-100 text-gray-400 text-xs"
                >
                  +{knowledgeBase.tags.length - 3}
                </Badge>
              )}
            </div>
          )}

          <div className="flex items-center gap-4 text-[11px] text-gray-400 pt-3 border-t border-gray-100">
            <span className="flex items-center gap-1">
              <FileText className="w-3 h-3" />
              {stats ? stats.documentCount : "—"} docs
            </span>
            <span className="flex items-center gap-1">
              <Puzzle className="w-3 h-3" />
              {stats ? formatNumber(stats.chunkCount) : "—"} chunks
            </span>
            <span className="flex items-center gap-1">
              <Hash className="w-3 h-3" />
              {stats ? formatNumber(stats.totalTokens) : "—"} tokens
            </span>
            <span className="flex items-center gap-1 ml-auto">
              <Clock className="w-3 h-3" />
              {relativeTime(knowledgeBase.createdAt)}
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
