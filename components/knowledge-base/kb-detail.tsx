"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  ArrowLeft,
  Brain,
  FileText,
  Puzzle,
  Hash,
  Upload,
  Search,
  Settings,
  FolderOpen,
  Loader2,
  AlertCircle,
  RefreshCw,
  ChevronRight,
  Folder,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { KbDocumentBrowser } from "@/components/knowledge-base/kb-document-browser"
import type {
  KnowledgeBase,
  KnowledgeBaseStats,
  DocumentFolder,
  ApiResponse,
} from "@/lib/types"
import { formatNumber } from "@/lib/utils"
import { UploadModal } from "@/components/rag/upload-modal"
import { KbSearchModal } from "./kb-search-modal"
import { KbSettingsModal } from "./kb-settings-modal"

interface KbDetailProps {
  knowledgeBaseId: string
}

export function KbDetail({ knowledgeBaseId }: KbDetailProps) {
  const [kb, setKb] = useState<KnowledgeBase | null>(null)
  const [stats, setStats] = useState<KnowledgeBaseStats | null>(null)
  const [folders, setFolders] = useState<DocumentFolder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const res = await fetch(`/api/knowledge-bases/${knowledgeBaseId}`)
      const body: ApiResponse<
        KnowledgeBase & { stats: KnowledgeBaseStats; folders?: DocumentFolder[] }
      > = await res.json()

      if (!body.success || !body.data) {
        setError(body.error?.message ?? "Knowledge base not found")
        return
      }

      setKb(body.data)
      setStats(body.data.stats)
      setFolders(body.data.folders ?? [])
    } catch {
      setError("Failed to load knowledge base")
    } finally {
      setLoading(false)
    }
  }, [knowledgeBaseId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleRefresh = () => {
    fetchData()
    setRefreshKey((k) => k + 1)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-gray-200/60 animate-pulse" />
          <div className="h-4 w-px bg-gray-200" />
          <div className="h-5 w-48 rounded bg-gray-200/60 animate-pulse" />
        </div>
        <div className="grid gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className="h-4 w-20 rounded bg-gray-200/60 animate-pulse mb-2" />
              <div className="h-7 w-16 rounded bg-gray-200/60 animate-pulse" />
            </div>
          ))}
        </div>
        <div className="flex gap-6">
          <div className="w-56 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-8 rounded-lg bg-gray-200/40 animate-pulse"
              />
            ))}
          </div>
          <div className="flex-1 h-96 rounded-xl border border-gray-200 bg-white shadow-sm" />
        </div>
      </div>
    )
  }

  if (error || !kb) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white/60 py-20">
        <AlertCircle className="mb-4 h-12 w-12 text-gray-300" />
        <p className="text-lg font-medium text-gray-500">
          {error ?? "Knowledge base not found"}
        </p>
        <div className="flex gap-2 mt-4">
          <Link href="/knowledge-bases">
            <Button variant="outline" size="sm" className="rounded-full">
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              Back to list
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            className="rounded-full"
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Retry
          </Button>
        </div>
      </div>
    )
  }

  const rootFolders = folders.filter((f) => f.parentId === null)
  const getSubfolders = (parentId: string) =>
    folders.filter((f) => f.parentId === parentId)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/knowledge-bases">
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-gray-400 hover:text-gray-700"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="h-4 w-px bg-gray-200" />
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 shadow-sm">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 tracking-tight">
              {kb.name}
            </h1>
            {kb.description && (
              <p className="text-xs text-gray-500 mt-0.5 max-w-xl truncate">
                {kb.description}
              </p>
            )}
          </div>
        </div>
        {kb.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 ml-2">
            {kb.tags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="bg-gray-100 text-gray-600 text-xs"
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-4">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
              <FileText className="w-3.5 h-3.5" />
              Documents
            </div>
            <div className="text-2xl font-bold text-gray-900 tabular-nums">
              {stats.documentCount}
            </div>
            <div className="text-[11px] text-gray-400 mt-0.5">
              {stats.readyDocuments} ready · {stats.processingDocuments}{" "}
              processing
              {stats.failedDocuments > 0 &&
                ` · ${stats.failedDocuments} failed`}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
              <Puzzle className="w-3.5 h-3.5" />
              Chunks
            </div>
            <div className="text-2xl font-bold text-gray-900 tabular-nums">
              {formatNumber(stats.chunkCount)}
            </div>
            <div className="text-[11px] text-gray-400 mt-0.5">
              {formatNumber(stats.indexedChunks)} indexed
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
              <Hash className="w-3.5 h-3.5" />
              Tokens
            </div>
            <div className="text-2xl font-bold text-gray-900 tabular-nums">
              {formatNumber(stats.totalTokens)}
            </div>
            <div className="text-[11px] text-gray-400 mt-0.5">
              Total across all documents
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
              <Settings className="w-3.5 h-3.5" />
              Settings
            </div>
            <div className="text-sm font-medium text-gray-900 truncate">
              {kb.settings.embeddingModel === "none"
                ? "No embeddings"
                : kb.settings.embeddingModel}
            </div>
            <div className="text-[11px] text-gray-400 mt-0.5">
              Chunk: {kb.settings.defaultChunkSize} · Overlap:{" "}
              {kb.settings.defaultChunkOverlap}
            </div>
          </motion.div>
        </div>
      )}

      {/* Actions Bar */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={() => setUploadOpen(true)}
          className="gap-1.5 rounded-full bg-gray-900 text-white hover:bg-gray-800 h-8 px-3 text-xs font-medium"
        >
          <Upload className="w-3.5 h-3.5" />
          Upload
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSearchOpen(true)}
          className="gap-1.5 rounded-full border-gray-200 h-8 px-3 text-xs font-medium"
        >
          <Search className="w-3.5 h-3.5" />
          Search
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSettingsOpen(true)}
          className="gap-1.5 rounded-full border-gray-200 h-8 px-3 text-xs font-medium"
        >
          <Settings className="w-3.5 h-3.5" />
          Settings
        </Button>
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          className="gap-1.5 rounded-full text-gray-500 hover:text-gray-700 h-8 px-3 text-xs font-medium"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </Button>
      </div>

      {/* Main Content: Folder Panel + Document Browser */}
      <div className="flex gap-6 min-h-[500px]">
        {/* Folder Navigation Panel */}
        <div className="w-56 shrink-0">
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Folders
              </h3>
            </div>
            <div className="p-2">
              <button
                onClick={() => setSelectedFolderId(null)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedFolderId === null
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <FolderOpen className="w-4 h-4" />
                All Documents
              </button>

              {rootFolders.map((folder) => (
                <FolderItem
                  key={folder.id}
                  folder={folder}
                  selectedFolderId={selectedFolderId}
                  onSelect={setSelectedFolderId}
                  getSubfolders={getSubfolders}
                  depth={0}
                />
              ))}

              {folders.length === 0 && (
                <p className="px-3 py-4 text-xs text-gray-400 text-center">
                  No folders yet
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Document Browser */}
        <div className="flex-1 min-w-0">
          <KbDocumentBrowser
            knowledgeBaseId={knowledgeBaseId}
            folderId={selectedFolderId}
            refreshKey={refreshKey}
          />
        </div>
      </div>

      <UploadModal open={uploadOpen} onClose={() => { setUploadOpen(false); handleRefresh() }} />
      <KbSearchModal open={searchOpen} onClose={() => setSearchOpen(false)} knowledgeBaseId={knowledgeBaseId} />
      <KbSettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} knowledgeBaseId={knowledgeBaseId} onUpdate={handleRefresh} />
    </div>
  )
}

function FolderItem({
  folder,
  selectedFolderId,
  onSelect,
  getSubfolders,
  depth,
}: {
  folder: DocumentFolder
  selectedFolderId: string | null
  onSelect: (id: string | null) => void
  getSubfolders: (parentId: string) => DocumentFolder[]
  depth: number
}) {
  const [expanded, setExpanded] = useState(false)
  const subfolders = getSubfolders(folder.id)

  return (
    <div>
      <button
        onClick={() => {
          onSelect(folder.id)
          if (subfolders.length > 0) setExpanded(!expanded)
        }}
        className={`w-full flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors ${
          selectedFolderId === folder.id
            ? "bg-gray-100 text-gray-900 font-medium"
            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
        }`}
        style={{ paddingLeft: `${12 + depth * 16}px` }}
      >
        {subfolders.length > 0 && (
          <ChevronRight
            className={`w-3 h-3 shrink-0 transition-transform ${
              expanded ? "rotate-90" : ""
            }`}
          />
        )}
        {subfolders.length === 0 && <span className="w-3" />}
        <Folder className="w-4 h-4 shrink-0 text-gray-400" />
        <span className="truncate">{folder.name}</span>
      </button>

      {expanded &&
        subfolders.map((sub) => (
          <FolderItem
            key={sub.id}
            folder={sub}
            selectedFolderId={selectedFolderId}
            onSelect={onSelect}
            getSubfolders={getSubfolders}
            depth={depth + 1}
          />
        ))}
    </div>
  )
}
