"use client"

import React, { useState, useRef, useMemo, useCallback } from "react"
import { apiFetch, previewUrl as previewUrlHelper } from "@/lib/api"
import { useBenchmark } from "@/hooks/use-benchmark"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SelectField } from "@/components/ui/select-field"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Database, Plus, Copy, Trash2, Download, Upload, Play, ChevronDown, ChevronRight, Search, Edit, Tag, Clock, Hash, Check, X, FileText, MoreHorizontal } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn, formatDuration, formatNumber, generateId } from "@/lib/utils"
import type { GoldenDataset, GoldenCase, Difficulty, ExpectedSource } from "@/lib/types"

const ITEMS_PER_PAGE = 15

const DIFFICULTY_CONFIG: Record<Difficulty, { label: string; color: string; bg: string; border: string }> = {
  easy: { label: "Easy", color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" },
  medium: { label: "Medium", color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" },
  hard: { label: "Hard", color: "text-red-700", bg: "bg-red-50", border: "border-red-200" },
  expert: { label: "Expert", color: "text-purple-700", bg: "bg-purple-50", border: "border-purple-200" },
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  passed: { label: "Passed", color: "text-emerald-700", bg: "bg-emerald-50" },
  partial: { label: "Partial", color: "text-amber-700", bg: "bg-amber-50" },
  failed: { label: "Failed", color: "text-red-700", bg: "bg-red-50" },
  not_run: { label: "Not Run", color: "text-gray-500", bg: "bg-gray-50" },
}

function relativeTime(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diffMs / 86400000)
  if (days < 1) return "today"
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return `${Math.floor(days / 30)}mo ago`
}

function formatPercent(value: number | undefined): string {
  if (value === undefined || value === null) return "—"
  return `${(value * 100).toFixed(1)}%`
}

export function DatasetManagement() {
  const { datasets, selectedDataset, setSelectedDataset, selectedVersion, setSelectedVersion, createDataset, addGoldenCase, updateGoldenCase, deleteGoldenCases, exportDataset, startBenchmark, isRunning } = useBenchmark()

  const [view, setView] = useState<"list" | "detail">("list")
  const [searchQuery, setSearchQuery] = useState("")
  const [filterDifficulty, setFilterDifficulty] = useState<Difficulty | "all">("all")
  const [filterStatus, setFilterStatus] = useState("all")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showCaseEditor, setShowCaseEditor] = useState(false)
  const [editingCase, setEditingCase] = useState<GoldenCase | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedCaseIds, setSelectedCaseIds] = useState<Set<string>>(new Set())
  const [showVersionDropdown, setShowVersionDropdown] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const currentVersion = useMemo(() => {
    if (!selectedDataset) return null
    return selectedDataset.versions.find((v) => v.version === selectedVersion) ?? selectedDataset.versions[selectedDataset.versions.length - 1] ?? null
  }, [selectedDataset, selectedVersion])

  const allCases: GoldenCase[] = useMemo(() => currentVersion?.cases ?? [], [currentVersion])

  const filteredCases = useMemo(() => {
    let result = allCases
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter((c) => c.query.toLowerCase().includes(q) || c.expectedAnswer?.toLowerCase().includes(q))
    }
    if (filterDifficulty !== "all") result = result.filter((c) => c.difficulty === filterDifficulty)
    if (filterStatus !== "all") result = result.filter((c) => c.status === filterStatus)
    return result
  }, [allCases, searchQuery, filterDifficulty, filterStatus])

  const totalPages = Math.max(1, Math.ceil(filteredCases.length / ITEMS_PER_PAGE))
  const paginatedCases = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredCases.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredCases, currentPage])

  const allSelected = paginatedCases.length > 0 && paginatedCases.every((c) => selectedCaseIds.has(c.id))

  const handleSelectAll = useCallback(() => {
    if (allSelected) { const next = new Set(selectedCaseIds); paginatedCases.forEach((c) => next.delete(c.id)); setSelectedCaseIds(next) }
    else { const next = new Set(selectedCaseIds); paginatedCases.forEach((c) => next.add(c.id)); setSelectedCaseIds(next) }
  }, [allSelected, paginatedCases, selectedCaseIds])

  const handleViewDataset = useCallback((id: string) => {
    const ds = datasets.find((d) => d.id === id)
    if (ds) { setSelectedDataset(ds); setSelectedVersion(ds.currentVersion) }
    setView("detail"); setCurrentPage(1); setSelectedCaseIds(new Set()); setSearchQuery(""); setFilterDifficulty("all"); setFilterStatus("all")
  }, [datasets, setSelectedDataset, setSelectedVersion])

  const handleBackToList = useCallback(() => { setView("list"); setSelectedDataset(null); setSelectedCaseIds(new Set()) }, [setSelectedDataset])

  const handleBulkDelete = useCallback(() => {
    if (selectedCaseIds.size === 0 || !selectedDataset) return
    deleteGoldenCases(selectedDataset.id, Array.from(selectedCaseIds))
    setSelectedCaseIds(new Set())
  }, [selectedCaseIds, selectedDataset, deleteGoldenCases])

  const handleExport = useCallback((datasetId?: string) => {
    const id = datasetId ?? selectedDataset?.id
    if (!id) return
    const json = exportDataset(id)
    const blob = new Blob([json], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a"); a.href = url; a.download = `dataset-${id}.json`; a.click()
    URL.revokeObjectURL(url)
  }, [exportDataset, selectedDataset])

  if (view === "list") {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Golden Datasets</h2>
            <p className="mt-1 text-sm text-gray-500">Manage benchmark datasets for evaluation</p>
          </div>
          <div className="flex items-center gap-3">
            <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) { const reader = new FileReader(); reader.onload = (ev) => { try { const data = JSON.parse(ev.target?.result as string); if (data.name) createDataset(data.name, data.description || "", data.tags || []) } catch { console.error("Invalid JSON") } }; reader.readAsText(file) }; e.target.value = "" }} />
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="rounded-full border-gray-200"><Upload className="mr-1.5 h-3.5 w-3.5" />Import</Button>
            <Button size="sm" onClick={() => setShowCreateModal(true)} className="rounded-full bg-gray-900 text-white hover:bg-gray-800"><Plus className="mr-1.5 h-3.5 w-3.5" />New Dataset</Button>
          </div>
        </div>

        {datasets.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50/50 py-20">
            <Database className="mb-4 h-12 w-12 text-gray-300" />
            <p className="text-lg font-medium text-gray-500">No datasets yet</p>
            <p className="mt-1 text-sm text-gray-400">Create your first golden dataset to start benchmarking.</p>
            <Button className="mt-6 bg-gray-900 text-white hover:bg-gray-800" onClick={() => setShowCreateModal(true)}><Plus className="mr-2 h-4 w-4" />New Dataset</Button>
          </motion.div>
        ) : (
          <div className="grid gap-4">
            <AnimatePresence mode="popLayout">
              {datasets.map((dataset, idx) => {
                const caseCount = dataset.versions.reduce((acc, v) => acc + v.cases.length, 0)
                return (
                  <motion.div key={dataset.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ delay: idx * 0.03 }} className="group relative rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <h3 className="text-base font-semibold text-gray-900 truncate">{dataset.name}</h3>
                          <Badge variant="outline" className="border-gray-200 text-gray-500 shrink-0">v{dataset.currentVersion}</Badge>
                        </div>
                        {dataset.description && <p className="mt-1 text-sm text-gray-500 line-clamp-2">{dataset.description}</p>}
                        <div className="mt-3 flex items-center gap-4 text-xs text-gray-400">
                          <span className="flex items-center gap-1"><FileText className="h-3.5 w-3.5" />{caseCount} test case{caseCount !== 1 ? "s" : ""}</span>
                          <span className="flex items-center gap-1"><Tag className="h-3.5 w-3.5" />{dataset.versions.length} version{dataset.versions.length !== 1 ? "s" : ""}</span>
                          <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{relativeTime(dataset.updatedAt)}</span>
                        </div>
                        {dataset.tags.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">{dataset.tags.map((tag) => (<Badge key={tag} variant="secondary" className="bg-gray-100 text-gray-600 text-xs">{tag}</Badge>))}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900" onClick={() => handleExport(dataset.id)}><Download className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900" onClick={() => createDataset(`${dataset.name} (Copy)`, dataset.description, [...dataset.tags])}><Copy className="h-4 w-4" /></Button>
                        <Button size="sm" className="rounded-full bg-gray-900 text-white hover:bg-gray-800" onClick={() => handleViewDataset(dataset.id)}><Play className="mr-1.5 h-3.5 w-3.5" />Run Benchmark</Button>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}

        {showCreateModal && (
          <CreateDatasetModal open={showCreateModal} onClose={() => setShowCreateModal(false)} onCreate={(name, desc, tags) => { createDataset(name, desc, tags); setShowCreateModal(false) }} />
        )}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={handleBackToList} className="text-gray-500 hover:text-gray-900">← Back</Button>
        <Separator orientation="vertical" className="h-6" />
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-gray-900">{selectedDataset?.name ?? "Dataset"}</h2>
            {selectedDataset && selectedDataset.versions.length > 0 && (
              <div className="relative">
                <button className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50" onClick={() => setShowVersionDropdown(!showVersionDropdown)}>
                  v{currentVersion?.version ?? "?"}<ChevronDown className="h-3.5 w-3.5" />
                </button>
                {showVersionDropdown && (
                  <div className="absolute left-0 top-full z-30 mt-1 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                    {selectedDataset.versions.map((v) => (
                      <button key={v.version} className={cn("flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-gray-50", v.version === selectedVersion && "bg-gray-100 font-medium")} onClick={() => { setSelectedVersion(v.version); setShowVersionDropdown(false) }}>
                        <span>v{v.version}</span><span className="text-xs text-gray-400">{v.cases.length} cases</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <Badge variant="outline" className="border-gray-200 text-gray-500"><Hash className="mr-1 h-3 w-3" />{allCases.length} test cases</Badge>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => { setEditingCase(null); setShowCaseEditor(true) }} className="bg-gray-900 text-white hover:bg-gray-800"><Plus className="mr-2 h-4 w-4" />Add Test Case</Button>
          <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={(e) => {
            const file = e.target.files?.[0]
            if (!file || !selectedDataset) return
            const reader = new FileReader()
            reader.onload = async (ev) => {
              try {
                const imported = JSON.parse(ev.target?.result as string)
                const cases: GoldenCase[] = imported.cases || imported
                for (const gc of cases) {
                  await addGoldenCase(selectedDataset.id, gc)
                }
              } catch { /* ignore */ }
            }
            reader.readAsText(file)
            e.target.value = ""
          }} />
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}><Upload className="mr-2 h-4 w-4" />Import</Button>
          <Button variant="outline" size="sm" onClick={() => selectedDataset && handleExport()}><Download className="mr-2 h-4 w-4" />Export</Button>
          <Button variant="outline" size="sm" onClick={async () => {
            if (!selectedDataset) return
            const newVersion = `v${(selectedDataset.versions.length + 1)}.0`
            const lastVersion = selectedDataset.versions[selectedDataset.versions.length - 1]
            await apiFetch(`/datasets/${selectedDataset.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                versions: [...selectedDataset.versions, { version: newVersion, cases: lastVersion ? [...lastVersion.cases] : [], createdAt: new Date().toISOString(), changeNote: "New version" }],
                currentVersion: newVersion,
              }),
            })
            window.location.reload()
          }}><Tag className="mr-2 h-4 w-4" />New Version</Button>
        </div>
        <Button size="sm" onClick={startBenchmark} disabled={isRunning} className="bg-gray-900 text-white hover:bg-gray-800"><Play className="mr-2 h-4 w-4" />{isRunning ? "Running..." : "Run Benchmark"}</Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Search queries..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1) }} className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-gray-400" />
        </div>
        <SelectField
          value={filterDifficulty}
          onChange={(v) => { setFilterDifficulty(v as Difficulty | "all"); setCurrentPage(1) }}
          options={[
            { value: "all", label: "All Difficulties" },
            { value: "easy", label: "Easy" },
            { value: "medium", label: "Medium" },
            { value: "hard", label: "Hard" },
            { value: "expert", label: "Expert" },
          ]}
          width="auto"
        />
        <SelectField
          value={filterStatus}
          onChange={(v) => { setFilterStatus(v); setCurrentPage(1) }}
          options={[
            { value: "all", label: "All Statuses" },
            { value: "passed", label: "Passed" },
            { value: "partial", label: "Partial" },
            { value: "failed", label: "Failed" },
            { value: "not_run", label: "Not Run" },
          ]}
          width="auto"
        />
      </div>

      <AnimatePresence>{selectedCaseIds.size > 0 && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
          <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
            <span className="text-sm font-medium text-blue-700">{selectedCaseIds.size} case{selectedCaseIds.size !== 1 ? "s" : ""} selected</span>
            <Separator orientation="vertical" className="h-4 bg-blue-200" />
            <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-100" onClick={handleBulkDelete}><Trash2 className="mr-1.5 h-3.5 w-3.5" />Delete</Button>
            <div className="flex-1" />
            <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-700" onClick={() => setSelectedCaseIds(new Set())}><X className="h-3.5 w-3.5" /></Button>
          </div>
        </motion.div>
      )}</AnimatePresence>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-100 bg-gray-50/80">
              <th className="w-10 px-4 py-3"><input type="checkbox" checked={allSelected} onChange={handleSelectAll} className="h-4 w-4 rounded border-gray-300 accent-gray-900" /></th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Query</th>
              <th className="px-4 py-3 text-center font-medium text-gray-600">Sources</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Difficulty</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Tags</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Hit Rate</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Recall</th>
              <th className="w-12 px-4 py-3" />
            </tr></thead>
            <tbody>
              {paginatedCases.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-16 text-center text-gray-400"><FileText className="mx-auto mb-3 h-8 w-8 text-gray-300" /><p className="font-medium text-gray-500">No test cases found</p></td></tr>
              ) : paginatedCases.map((gc) => {
                const diffConfig = DIFFICULTY_CONFIG[gc.difficulty]
                const statusConfig = STATUS_CONFIG[gc.status]
                const metrics = gc.lastMetrics
                return (
                  <tr key={gc.id} className={cn("border-b border-gray-50 hover:bg-gray-50/50", selectedCaseIds.has(gc.id) && "bg-blue-50/50")}>
                    <td className="px-4 py-3"><input type="checkbox" checked={selectedCaseIds.has(gc.id)} onChange={() => { const next = new Set(selectedCaseIds); if (next.has(gc.id)) next.delete(gc.id); else next.add(gc.id); setSelectedCaseIds(next) }} className="h-4 w-4 rounded border-gray-300 accent-gray-900" /></td>
                    <td className="max-w-xs px-4 py-3"><p className="truncate font-medium text-gray-900">{gc.query}</p>{gc.expectedSection && <p className="mt-0.5 truncate text-xs text-gray-400">{gc.expectedSection}</p>}</td>
                    <td className="px-4 py-3 text-center"><span className="inline-flex items-center justify-center rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">{gc.expectedSources.length}</span></td>
                    <td className="px-4 py-3"><Badge variant="outline" className={cn("text-xs font-medium border", diffConfig.color, diffConfig.bg, diffConfig.border)}>{diffConfig.label}</Badge></td>
                    <td className="px-4 py-3"><div className="flex flex-wrap gap-1">{gc.tags.slice(0, 2).map((tag) => (<Badge key={tag} variant="secondary" className="bg-gray-100 text-gray-600 text-xs">{tag}</Badge>))}{gc.tags.length > 2 && <Badge variant="secondary" className="bg-gray-100 text-gray-400 text-xs">+{gc.tags.length - 2}</Badge>}</div></td>
                    <td className="px-4 py-3"><span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", statusConfig.color, statusConfig.bg)}>{statusConfig.label}</span></td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-700">{formatPercent(metrics?.hitRate)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-700">{formatPercent(metrics?.recall)}</td>
                    <td className="px-4 py-3"><Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-400 hover:text-gray-700" onClick={() => { setEditingCase(gc); setShowCaseEditor(true) }}><Edit className="h-3.5 w-3.5" /></Button></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {filteredCases.length > ITEMS_PER_PAGE && (
          <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/50 px-4 py-3">
            <span className="text-xs text-gray-500">Showing {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, filteredCases.length)}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredCases.length)} of {filteredCases.length}</span>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setCurrentPage((p) => p - 1)} className="h-8 text-xs">Previous</Button>
              <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((p) => p + 1)} className="h-8 text-xs">Next</Button>
            </div>
          </div>
        )}
      </div>

      {showCreateModal && <CreateDatasetModal open={showCreateModal} onClose={() => setShowCreateModal(false)} onCreate={(name, desc, tags) => { createDataset(name, desc, tags); setShowCreateModal(false) }} />}
      {showCaseEditor && <GoldenCaseEditorModal open={showCaseEditor} onClose={() => { setShowCaseEditor(false); setEditingCase(null) }} existingCase={editingCase} onSave={(data) => { if (editingCase && selectedDataset) updateGoldenCase(selectedDataset.id, data); else if (selectedDataset) addGoldenCase(selectedDataset.id, data); setShowCaseEditor(false); setEditingCase(null) }} />}
    </div>
  )
}

function CreateDatasetModal({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (name: string, description: string, tags: string[]) => void }) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [tagsInput, setTagsInput] = useState("")
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>New Dataset</DialogTitle><DialogDescription>Create a new golden dataset for benchmarking.</DialogDescription></DialogHeader>
        <div className="space-y-4 py-2">
          <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Name</label><input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Customer Support Evaluation" className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-gray-400" /></div>
          <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Description</label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe what this dataset tests..." rows={3} /></div>
          <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Tags</label><input type="text" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="Comma-separated tags..." className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-gray-400" /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => { if (!name.trim()) return; onCreate(name.trim(), description.trim(), tagsInput.split(",").map((t) => t.trim()).filter(Boolean)) }} disabled={!name.trim()} className="bg-gray-900 text-white hover:bg-gray-800">Create Dataset</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function GoldenCaseEditorModal({ open, onClose, existingCase, onSave }: { open: boolean; onClose: () => void; existingCase: GoldenCase | null; onSave: (data: GoldenCase) => void }) {
  const [query, setQuery] = useState(existingCase?.query ?? "")
  const [expectedAnswer, setExpectedAnswer] = useState(existingCase?.expectedAnswer ?? "")
  const [sources, setSources] = useState<{ document: string; section: string; page: string; chunkId: string }[]>(existingCase?.expectedSources?.map((s) => ({ document: s.document, section: s.section, page: String(s.page), chunkId: s.chunkId ?? "" })) ?? [{ document: "", section: "", page: "", chunkId: "" }])
  const [expectedSection, setExpectedSection] = useState(existingCase?.expectedSection ?? "")
  const [expectedPages, setExpectedPages] = useState(existingCase?.expectedPages?.join(", ") ?? "")
  const [whyDifficult, setWhyDifficult] = useState(existingCase?.whyDifficult ?? "")
  const [difficulty, setDifficulty] = useState<Difficulty>(existingCase?.difficulty ?? "medium")
  const [tags, setTags] = useState<string[]>(existingCase?.tags ?? [])
  const [tagInput, setTagInput] = useState("")
  const [showAdvanced, setShowAdvanced] = useState(false)

  const handleSave = () => {
    const parsedPages = expectedPages.split(",").map((p) => parseInt(p.trim(), 10)).filter((n) => !isNaN(n))
    const id = existingCase?.id ?? `case_${generateId()}`
    const data: GoldenCase = {
      id, query: query.trim(), expectedAnswer: expectedAnswer.trim(),
      expectedSources: sources.filter((s) => s.document.trim()).map((s) => ({ id: generateId(), document: s.document.trim(), section: s.section.trim(), page: parseInt(s.page, 10) || 1, chunkId: s.chunkId.trim() || undefined })),
      expectedSection: expectedSection.trim() || undefined, expectedPages: parsedPages.length > 0 ? parsedPages : [],
      whyDifficult: whyDifficult.trim(), difficulty, tags, status: existingCase?.status ?? "not_run",
    }
    onSave(data)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh]">
        <DialogHeader><DialogTitle>{existingCase ? "Edit Test Case" : "Add Test Case"}</DialogTitle><DialogDescription>Define a golden test case for your benchmark dataset.</DialogDescription></DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-2">
          <div className="space-y-5 py-2">
            <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Query <span className="text-red-400">*</span></label><Textarea value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Enter the user query..." rows={4} /></div>
            <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Expected Answer</label><Textarea value={expectedAnswer} onChange={(e) => setExpectedAnswer(e.target.value)} placeholder="What should the ideal answer look like..." rows={4} /></div>
            <div>
              <div className="mb-2 flex items-center justify-between"><label className="text-sm font-medium text-gray-700">Expected Sources</label><Button variant="ghost" size="sm" onClick={() => setSources([...sources, { document: "", section: "", page: "", chunkId: "" }])} className="h-7 text-xs text-gray-600"><Plus className="mr-1 h-3 w-3" />Add Source</Button></div>
              <div className="space-y-2">{sources.map((source, idx) => (
                <div key={idx} className="flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50/50 p-2.5">
                  <input type="text" value={source.document} onChange={(e) => setSources(sources.map((s, i) => i === idx ? { ...s, document: e.target.value } : s))} placeholder="Document name" className="flex-1 rounded border border-gray-200 bg-white px-2 py-1.5 text-xs" />
                  <input type="text" value={source.section} onChange={(e) => setSources(sources.map((s, i) => i === idx ? { ...s, section: e.target.value } : s))} placeholder="Section" className="w-28 rounded border border-gray-200 bg-white px-2 py-1.5 text-xs" />
                  <input type="text" value={source.page} onChange={(e) => setSources(sources.map((s, i) => i === idx ? { ...s, page: e.target.value } : s))} placeholder="Page" className="w-16 rounded border border-gray-200 bg-white px-2 py-1.5 text-xs" />
                  <input type="text" value={source.chunkId} onChange={(e) => setSources(sources.map((s, i) => i === idx ? { ...s, chunkId: e.target.value } : s))} placeholder="Chunk ID" className="w-20 rounded border border-gray-200 bg-white px-2 py-1.5 text-xs" />
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-400 hover:text-red-500 shrink-0" onClick={() => setSources(sources.filter((_, i) => i !== idx))}><X className="h-3.5 w-3.5" /></Button>
                </div>
              ))}</div>
            </div>
            <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Expected Section</label><input type="text" value={expectedSection} onChange={(e) => setExpectedSection(e.target.value)} placeholder="e.g. Hybrid Retrieval" className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm" /></div>
            <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Expected Pages</label><input type="text" value={expectedPages} onChange={(e) => setExpectedPages(e.target.value)} placeholder="Comma-separated page numbers" className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm" /></div>
            <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Why is this query difficult?</label><Textarea value={whyDifficult} onChange={(e) => setWhyDifficult(e.target.value)} placeholder="Explain the difficulty..." rows={3} /></div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Difficulty</label>
              <div className="flex gap-2">{(["easy", "medium", "hard", "expert"] as Difficulty[]).map((d) => {
                const cfg = DIFFICULTY_CONFIG[d]
                return <button key={d} onClick={() => setDifficulty(d)} className={cn("rounded-full px-3 py-1.5 text-xs font-medium border transition-all", difficulty === d ? `${cfg.bg} ${cfg.color} ${cfg.border}` : "border-gray-200 text-gray-500 hover:bg-gray-50")}>{cfg.label}</button>
              })}</div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Tags</label>
              <div className="flex gap-2"><input type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && tagInput.trim()) { e.preventDefault(); if (!tags.includes(tagInput.trim())) setTags([...tags, tagInput.trim()]); setTagInput("") } }} placeholder="Add tag..." className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm" /></div>
              {tags.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{tags.map((tag) => (<Badge key={tag} variant="secondary" className="bg-gray-100 text-gray-600 text-xs cursor-pointer hover:bg-red-50" onClick={() => setTags(tags.filter((t) => t !== tag))}>{tag} <X className="ml-1 h-3 w-3" /></Badge>))}</div>}
            </div>
            <button onClick={() => setShowAdvanced(!showAdvanced)} className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-700"><ChevronDown className={cn("h-3.5 w-3.5 transition-transform", showAdvanced && "rotate-180")} />Advanced Settings</button>
            {showAdvanced && (
              <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-4 space-y-3">
                <div><label className="mb-1 block text-xs font-medium text-gray-600">Expected Keywords (comma-separated)</label><input type="text" className="w-full rounded border border-gray-200 bg-white px-2 py-1.5 text-xs" placeholder="keyword1, keyword2" /></div>
                <div><label className="mb-1 block text-xs font-medium text-gray-600">Min Hit Rate</label><input type="number" step="0.1" min="0" max="1" className="w-full rounded border border-gray-200 bg-white px-2 py-1.5 text-xs" placeholder="0.0" /></div>
                <div><label className="mb-1 block text-xs font-medium text-gray-600">Min Recall</label><input type="number" step="0.1" min="0" max="1" className="w-full rounded border border-gray-200 bg-white px-2 py-1.5 text-xs" placeholder="0.0" /></div>
                <div><label className="mb-1 block text-xs font-medium text-gray-600">Max Latency (ms)</label><input type="number" className="w-full rounded border border-gray-200 bg-white px-2 py-1.5 text-xs" placeholder="5000" /></div>
              </div>
            )}
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!query.trim()} className="bg-gray-900 text-white hover:bg-gray-800">{existingCase ? "Save Changes" : "Add Test Case"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
