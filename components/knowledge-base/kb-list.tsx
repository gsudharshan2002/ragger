"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Brain, Plus, Search, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { KbCard } from "@/components/knowledge-base/kb-card"
import { KbCreateModal } from "@/components/knowledge-base/kb-create-modal"
import type { KnowledgeBase, ApiResponse } from "@/lib/types"

export function KbList() {
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [showCreateModal, setShowCreateModal] = useState(false)

  const fetchKnowledgeBases = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch("/api/knowledge-bases")
      const body: ApiResponse<KnowledgeBase[]> = await res.json()

      if (!body.success || !body.data) {
        setError(body.error?.message ?? "Failed to load knowledge bases")
        return
      }

      setKnowledgeBases(body.data)
    } catch {
      setError("Failed to load knowledge bases")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchKnowledgeBases()
  }, [fetchKnowledgeBases])

  const filteredKBs = knowledgeBases.filter((kb) =>
    kb.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    kb.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleCreated = (kb: KnowledgeBase) => {
    setKnowledgeBases((prev) => [kb, ...prev])
    setShowCreateModal(false)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-7 w-48 rounded-lg bg-gray-200/60 animate-pulse" />
            <div className="h-4 w-72 rounded-lg bg-gray-200/40 animate-pulse" />
          </div>
          <div className="h-9 w-36 rounded-full bg-gray-200/60 animate-pulse" />
        </div>
        <div className="h-10 w-full max-w-sm rounded-lg bg-gray-200/40 animate-pulse" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <div className="space-y-3">
                <div className="h-5 w-32 rounded bg-gray-200/60 animate-pulse" />
                <div className="h-4 w-full rounded bg-gray-200/40 animate-pulse" />
                <div className="h-4 w-3/4 rounded bg-gray-200/40 animate-pulse" />
                <div className="flex gap-1.5 mt-2">
                  <div className="h-5 w-14 rounded-full bg-gray-200/50 animate-pulse" />
                  <div className="h-5 w-18 rounded-full bg-gray-200/50 animate-pulse" />
                </div>
                <div className="flex gap-4 mt-3 pt-3 border-t border-gray-100">
                  <div className="h-3 w-16 rounded bg-gray-200/40 animate-pulse" />
                  <div className="h-3 w-16 rounded bg-gray-200/40 animate-pulse" />
                  <div className="h-3 w-16 rounded bg-gray-200/40 animate-pulse" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white/60 py-20">
        <Brain className="mb-4 h-12 w-12 text-gray-300" />
        <p className="text-lg font-medium text-gray-500">Something went wrong</p>
        <p className="mt-1 text-sm text-gray-400">{error}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchKnowledgeBases}
          className="mt-4 rounded-full"
        >
          Try again
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
            Knowledge Bases
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Organize and manage your document collections
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setShowCreateModal(true)}
          className="gap-1.5 rounded-full bg-gray-900 text-white hover:bg-gray-800 h-8 px-3 text-xs font-medium"
        >
          <Plus className="w-3.5 h-3.5" />
          Create Knowledge Base
        </Button>
      </div>

      {knowledgeBases.length > 0 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search knowledge bases..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-gray-400 shadow-sm"
          />
        </div>
      )}

      {knowledgeBases.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white/60 py-20"
        >
          <Brain className="mb-4 h-12 w-12 text-gray-300" />
          <p className="text-lg font-medium text-gray-500">
            No knowledge bases yet
          </p>
          <p className="mt-1 text-sm text-gray-400">
            Create your first knowledge base to organize documents.
          </p>
          <Button
            className="mt-6 rounded-full bg-gray-900 text-white hover:bg-gray-800"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Knowledge Base
          </Button>
        </motion.div>
      ) : filteredKBs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white/60 py-16">
          <Search className="mb-3 h-8 w-8 text-gray-300" />
          <p className="text-sm font-medium text-gray-500">
            No knowledge bases match &ldquo;{searchQuery}&rdquo;
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {filteredKBs.map((kb, idx) => (
              <KbCard key={kb.id} knowledgeBase={kb} index={idx} />
            ))}
          </AnimatePresence>
        </div>
      )}

      <KbCreateModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={handleCreated}
      />
    </div>
  )
}
