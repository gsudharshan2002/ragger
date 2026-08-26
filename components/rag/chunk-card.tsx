"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { ChevronDown, Copy, ExternalLink, FileText } from "lucide-react"
import type { Chunk } from "@/lib/types"
import { cn, copyToClipboard } from "@/lib/utils"

interface ChunkCardProps {
  chunk: Chunk
  stage: string
  color: string
}

export function ChunkCard({ chunk, stage, color }: ChunkCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    copyToClipboard(chunk.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "rounded-lg border border-black/[0.04] bg-white hover:bg-gray-50/50 transition-colors overflow-hidden",
        expanded && "shadow-sm"
      )}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full px-3 py-2 text-left"
      >
        <div
          className="shrink-0 w-1 h-6 rounded-full"
          style={{ backgroundColor: `${color}40` }}
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono text-gray-400">#{chunk.rank}</span>
            <span className="text-[10px] font-medium text-gray-600">{chunk.id}</span>
            <span className="text-[10px] text-gray-300">·</span>
            <span className="text-[10px] font-mono" style={{ color }}>
              {chunk.score.toFixed(3)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <FileText className="w-2.5 h-2.5 text-gray-300" />
            <span className="text-[10px] text-gray-400 truncate max-w-[200px]">{chunk.document}</span>
            <span className="text-[10px] text-gray-300">p.{chunk.page}</span>
            <span className="text-[10px] text-gray-400">{chunk.section}</span>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[9px] font-mono text-gray-400">{chunk.tokens}t</span>
          <ChevronDown className={cn("w-3 h-3 text-gray-300 transition-transform", expanded && "rotate-180")} />
        </div>
      </button>

      {expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="px-3 pb-3"
        >
          <div className="flex items-center gap-1.5 mb-2">
            {chunk.method && (
              <span
                className="px-1.5 py-0.5 rounded text-[9px] font-medium"
                style={{ backgroundColor: `${color}15`, color }}
              >
                {chunk.method}
              </span>
            )}
            {chunk.vectorRank && (
              <span className="text-[9px] text-indigo-400">Vec rank: {chunk.vectorRank}</span>
            )}
            {chunk.bm25Rank && (
              <span className="text-[9px] text-amber-400">BM25 rank: {chunk.bm25Rank}</span>
            )}
            {chunk.rrfScore && (
              <span className="text-[9px] text-purple-400">RRF: {chunk.rrfScore.toFixed(4)}</span>
            )}
            {chunk.rerankScore && (
              <span className="text-[9px] text-purple-400">Rerank: {chunk.rerankScore.toFixed(3)}</span>
            )}
          </div>

          <div className="bg-gray-50 rounded-lg p-2.5 text-[11px] text-gray-600 leading-relaxed max-h-24 overflow-y-auto">
            {chunk.content}
          </div>

          <div className="flex items-center gap-1.5 mt-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-2 py-1 rounded text-[10px] text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              {copied ? (
                <>
                  <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-2.5 h-2.5" />
                  Copy
                </>
              )}
            </button>
            <button className="flex items-center gap-1 px-2 py-1 rounded text-[10px] text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
              <ExternalLink className="w-2.5 h-2.5" />
              Open source
            </button>
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}
