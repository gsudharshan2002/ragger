"use client"

import { useState } from "react"
import { apiFetch } from "@/lib/api"
import { motion, AnimatePresence } from "framer-motion"
import { X, Search, Loader2, FileText, Hash } from "lucide-react"
import type { ApiResponse } from "@/lib/types"

interface KbSearchModalProps {
  open: boolean
  onClose: () => void
  knowledgeBaseId: string
}

interface SearchResult {
  chunkId: string
  content: string
  documentName: string
  page: number
  score: number
}

export function KbSearchModal({ open, onClose, knowledgeBaseId }: KbSearchModalProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [searched, setSearched] = useState(false)

  const handleSearch = async () => {
    if (!query.trim()) return
    setSearching(true)
    setSearched(true)
    try {
      const res = await apiFetch(`/knowledge-bases/${knowledgeBaseId}/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim(), top_k: 20 }),
      })
      const body: ApiResponse<SearchResult[]> = await res.json()
      if (body.success && body.data) setResults(body.data)
    } catch { /* ignore */ }
    setSearching(false)
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-lg bg-white rounded-2xl overflow-hidden popup-bevel"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-gray-500" />
                <h2 className="text-sm font-semibold text-gray-900">Search Knowledge Base</h2>
              </div>
              <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            <div className="px-6 py-4">
              <div className="flex gap-2">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="Search chunks..."
                  className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-gray-400"
                  autoFocus
                />
                <button
                  onClick={handleSearch}
                  disabled={searching || !query.trim()}
                  className="rounded-lg bg-gray-900 text-white px-4 py-2 text-xs font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
                >
                  {searching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Search"}
                </button>
              </div>
            </div>

            <div className="max-h-[50vh] overflow-y-auto border-t border-gray-100">
              {searched && !searching && results.length === 0 && (
                <div className="py-12 text-center text-sm text-gray-400">No results found</div>
              )}
              {results.map((r) => (
                <div key={r.chunkId} className="px-6 py-3 border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="w-3 h-3 text-gray-400" />
                    <span className="text-[11px] font-medium text-gray-700">{r.documentName}</span>
                    <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                      <Hash className="w-2.5 h-2.5" />p.{r.page}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed line-clamp-3">{r.content}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
