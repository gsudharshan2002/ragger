"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { User, Bot, ChevronDown, ChevronRight, ExternalLink, Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import type { ChatMessage as ChatMessageType } from "@/lib/types"
import { copyToClipboard, cn } from "@/lib/utils"
import Link from "next/link"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

interface ChatMessageProps {
  message: ChatMessageType
  onViewTrace: (trace: NonNullable<ChatMessageType["trace"]>) => void
}

export function ChatMessage({ message, onViewTrace }: ChatMessageProps) {
  const [showSources, setShowSources] = useState(false)
  const [copied, setCopied] = useState(false)
  const isUser = message.role === "user"

  const uniqueSources = message.sources
    ? [...new Map(message.sources.map((s) => [`${s.document}-${s.page}`, s])).values()]
    : []

  const handleCopy = () => {
    copyToClipboard(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={cn("flex gap-3 px-4 py-3", isUser ? "justify-end" : "justify-start")}
    >
      {!isUser && (
        <div className="shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center mt-0.5">
          <Bot className="w-3.5 h-3.5 text-white" />
        </div>
      )}

      <div className={cn("max-w-[75%] min-w-0", isUser ? "order-1" : "")}>
        {isUser ? (
          <div className="inline-block bg-gray-900 text-white rounded-2xl rounded-tr-md px-4 py-2.5 text-sm leading-relaxed">
            {message.content}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="markdown-body bg-white rounded-2xl rounded-tl-md px-4 py-3 shadow-sm border border-black/[0.04] text-sm text-gray-800 leading-relaxed break-words overflow-hidden min-w-0">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
            </div>

            {uniqueSources.length > 0 && (
              <div className="space-y-1.5">
                <button
                  onClick={() => setShowSources(!showSources)}
                  className="flex items-center gap-1 text-[11px] font-medium text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showSources ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  Sources ({uniqueSources.length})
                </button>
                {showSources && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="flex flex-wrap gap-1.5"
                  >
                    {uniqueSources.map((source, i) => {
                      const docId = source.documentId

                      return (
                        <Link
                          key={i}
                          href={
                            docId
                              ? `/documents/${docId}?page=${source.page}`
                              : "#"
                          }
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-50 border border-black/[0.04] text-[11px] text-gray-500 hover:bg-gray-100 hover:border-gray-200 transition-colors cursor-pointer"
                        >
                          <span className="font-medium text-gray-700">
                            {source.document}
                          </span>
                          <span className="text-gray-300">—</span>
                          <span>Page {source.page}</span>
                          {source.section && (
                            <>
                              <span className="text-gray-300">·</span>
                              <span>{source.section}</span>
                            </>
                          )}
                          <ExternalLink className="w-3.5 h-3.5 text-gray-300" />
                        </Link>
                      )
                    })}
                  </motion.div>
                )}
              </div>
            )}

            {message.trace?.overview && (
              <div className="flex items-center gap-3 pt-1">
                <div className="flex items-center gap-2 text-[11px] text-gray-400">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    RAG completed
                  </div>
                  <span className="text-gray-200">·</span>
                  <span>{message.trace.overview.stages ? Object.keys(message.trace.overview.stages).length : 0} stages</span>
                  <span className="text-gray-200">·</span>
                  <span>{(message.trace.overview.totalDurationMs / 1000).toFixed(2)}s</span>
                  <span className="text-gray-200">·</span>
                  <span>{message.trace.tokenBreakdown.total.toLocaleString()} tokens</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className="text-[10px] font-mono text-gray-400 border-gray-200 px-1.5 py-0">
                    {message.trace.overview.traceId.slice(0, 18)}...
                  </Badge>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copyToClipboard(message.trace!.overview.traceId)}
                          className="w-5 h-5 text-gray-300 hover:text-gray-500 hidden sm:inline-flex"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </Button>
                      }
                    />
                    <TooltipContent>Copy trace ID</TooltipContent>
                  </Tooltip>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onViewTrace(message.trace!)}
                    className="h-5 px-2 text-[10px] font-medium text-gray-500 border-gray-200 rounded-full hover:bg-gray-50"
                  >
                    View Full Trace
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {isUser && (
        <div className="shrink-0 w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center mt-0.5">
          <User className="w-3.5 h-3.5 text-gray-500" />
        </div>
      )}
    </motion.div>
  )
}
