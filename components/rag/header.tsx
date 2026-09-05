"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Upload, Plus, Activity, BarChart3, Settings, Layers, Database, Brain, ClipboardCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useRagContext } from "@/hooks/use-rag"
import { cn } from "@/lib/utils"
import { SettingsModal } from "./settings-modal"
import { TracesListModal } from "./traces-list-modal"
import { TracePanel } from "./trace-panel"

interface HeaderProps {
  onUploadClick?: () => void
}

const NAV_ITEMS = [
  { href: "/", label: "Chat", icon: Layers },
  { href: "/knowledge-bases", label: "Knowledge Bases", icon: Brain },
  { href: "/benchmark", label: "Benchmark", icon: BarChart3 },
  { href: "/datasets", label: "Datasets", icon: Database },
] as const

export function Header({ onUploadClick }: HeaderProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { clearChat, session, tracePanelOpen, setTracePanelOpen, selectedTrace, setSelectedTrace, refreshDocuments } = useRagContext()
  const isChatPage = pathname === "/"
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [tracesOpen, setTracesOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <>
    <header className="relative z-30 flex items-center justify-between px-3 sm:px-6 py-3 bg-transparent gap-2">
      <div className="flex items-center gap-1 bg-white rounded-full p-1 shadow-[0_1px_8px_-2px_rgba(0,0,0,0.08),0_0_0_1px_rgba(0,0,0,0.04)] max-w-full overflow-hidden">
        <Link href="/" className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition-opacity shrink-0 px-2.5 sm:px-3.5 py-2 rounded-full">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-black shadow-sm overflow-hidden">
            <img src="/logo-container.svg" alt="RAG Lab" className="w-5 h-5 object-contain" />
          </div>
          <div className="leading-none hidden sm:block">
            <h1 className="text-sm font-semibold tracking-tight text-gray-900">
              RAG Lab
            </h1>
            <p className="text-[10px] text-gray-400 mt-0.5">
              Workspace
            </p>
          </div>
        </Link>

        <span className="w-px h-6 bg-gray-200 shrink-0 hidden sm:block" />

        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                  isActive
                    ? "bg-gray-900 text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                )}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            )
          })}
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        {/* Desktop actions */}
        <div className="hidden sm:flex items-center gap-1.5">
          {isChatPage && (
            <>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push("/week-6")}
                      className="gap-1.5 rounded-full border-black/[0.06] bg-white shadow-sm hover:shadow-md transition-all text-gray-600 hover:text-gray-900 h-8 px-2.5 sm:px-3 text-xs font-medium whitespace-nowrap"
                    >
                      <ClipboardCheck className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Week 6</span>
                    </Button>
                  }
                />
                <TooltipContent>Developer documentation evaluation reference</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onUploadClick}
                      className="gap-1.5 rounded-full border-black/[0.06] bg-white shadow-sm hover:shadow-md transition-all text-gray-600 hover:text-gray-900 h-8 px-2.5 sm:px-3 text-xs font-medium whitespace-nowrap"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Upload</span>
                    </Button>
                  }
                />
                <TooltipContent>Upload documents</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearChat}
                      className="gap-1.5 rounded-full border-black/[0.06] bg-white shadow-sm hover:shadow-md transition-all text-gray-600 hover:text-gray-900 h-8 px-2.5 sm:px-3 text-xs font-medium whitespace-nowrap"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">New Chat</span>
                    </Button>
                  }
                />
                <TooltipContent>Start a new chat</TooltipContent>
              </Tooltip>
            </>
          )}

          {!isChatPage && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTracesOpen(true)}
                    className="gap-1.5 rounded-full border-black/[0.06] bg-white shadow-sm hover:shadow-md transition-all text-gray-600 hover:text-gray-900 h-8 px-2.5 sm:px-3 text-xs font-medium whitespace-nowrap"
                  >
                    <Activity className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Traces</span>
                  </Button>
                }
              />
              <TooltipContent>View execution traces</TooltipContent>
            </Tooltip>
          )}

          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSettingsOpen(true)}
                    className="gap-1.5 rounded-full border-black/[0.06] bg-white shadow-sm hover:shadow-md transition-all text-gray-600 hover:text-gray-900 h-8 w-8 p-0 min-h-[44px] min-w-[44px] sm:min-h-8 sm:min-w-8"
                >
                  <Settings className="w-3.5 h-3.5" />
                </Button>
              }
            />
            <TooltipContent>Settings</TooltipContent>
          </Tooltip>

          {isChatPage && session.documents.length > 0 && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <div className="ml-2 text-[11px] text-gray-400 font-medium cursor-default" />
                }
              >
                {session.documents.length} docs
              </TooltipTrigger>
              <TooltipContent side="bottom" align="end" className="flex-col items-start gap-1 max-w-xs">
                {session.documents.map((doc) => (
                  <div key={doc.id} className="w-full truncate">{doc.name}</div>
                ))}
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Mobile menu button */}
        <div className="relative sm:hidden">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="gap-1.5 rounded-full border-black/[0.06] bg-white shadow-sm h-8 w-8 p-0 min-h-[44px] min-w-[44px] sm:min-h-8 sm:min-w-8"
          >
            <span className="w-4 h-4 flex flex-col justify-center gap-0.5">
              <span className="block h-0.5 w-4 bg-current rounded" />
              <span className="block h-0.5 w-4 bg-current rounded" />
              <span className="block h-0.5 w-4 bg-current rounded" />
            </span>
          </Button>

          {mobileMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-black/[0.06] p-2 z-50">
              <div className="flex flex-col gap-1">
                {isChatPage && (
                  <>
                    <Button variant="ghost" size="sm" onClick={() => { router.push("/week-6"); setMobileMenuOpen(false) }} className="justify-start gap-2">
                      <ClipboardCheck className="w-4 h-4" /> Week 6
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => { onUploadClick?.(); setMobileMenuOpen(false) }} className="justify-start gap-2">
                      <Upload className="w-4 h-4" /> Upload
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => { clearChat(); setMobileMenuOpen(false) }} className="justify-start gap-2">
                      <Plus className="w-4 h-4" /> New Chat
                    </Button>
                  </>
                )}
                {!isChatPage && (
                  <Button variant="ghost" size="sm" onClick={() => { setTracesOpen(true); setMobileMenuOpen(false) }} className="justify-start gap-2">
                    <Activity className="w-4 h-4" /> Traces
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => { setSettingsOpen(true); setMobileMenuOpen(false) }} className="justify-start gap-2">
                  <Settings className="w-4 h-4" /> Settings
                </Button>
                {isChatPage && session.documents.length > 0 && (
                  <div className="px-3 py-2 text-xs text-gray-400">
                    {session.documents.length} docs
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} onDataCleared={refreshDocuments} />
      <TracesListModal open={tracesOpen} onClose={() => setTracesOpen(false)} />
      <TracePanel
        open={tracePanelOpen}
        onClose={() => {
          setTracePanelOpen(false)
          setSelectedTrace(null)
        }}
        trace={selectedTrace}
      />
    </header>

    {/* Mobile bottom tab bar */}
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur border-t border-black/[0.06] pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around px-2 py-2">
        <Link href="/" className={cn("flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg", pathname === "/" ? "text-gray-900" : "text-gray-500")}>
          <img src="/logo-container.svg" alt="App" className="w-5 h-5" />
          <span className="text-[10px]">Home</span>
        </Link>
        <Link href="/chat" className={cn("flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg", pathname === "/" ? "text-gray-900" : "text-gray-500")}>
          <Layers className="w-5 h-5" />
          <span className="text-[10px]">Chat</span>
        </Link>
        <Link href="/knowledge-bases" className={cn("flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg", pathname.startsWith("/knowledge-bases") ? "text-gray-900" : "text-gray-500")}>
          <Brain className="w-5 h-5" />
          <span className="text-[10px]">Knowledge Base</span>
        </Link>
        <Link href="/datasets" className={cn("flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg", pathname.startsWith("/datasets") ? "text-gray-900" : "text-gray-500")}>
          <Database className="w-5 h-5" />
          <span className="text-[10px]">Data Set</span>
        </Link>
      </div>
    </nav>
  </>
  )
}
