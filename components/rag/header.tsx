"use client"

import { useState } from "react"
import { Bot, Brain, Sparkles, Upload, Plus, Activity, BarChart3, Settings, Layers, Database, ClipboardCheck } from "lucide-react"
import { motion, AnimatePresence } from 'framer-motion'
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
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
  const { clearChat, session, tracePanelOpen, setTracePanelOpen, selectedTrace, setSelectedTrace, refreshDocuments, mode, setMode } = useRagContext()
  
  const isChatPage = pathname === "/"
  const isAgent = mode === "agent"                    // ← Added this

  const [settingsOpen, setSettingsOpen] = useState(false)
  const [tracesOpen, setTracesOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <>
      <header className="relative z-30 flex items-center justify-between px-3 sm:px-6 py-3 bg-transparent gap-2">
        {/* Left side - Logo + Navigation */}
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

        {/* Right side - Actions */}
        <div className="flex items-center gap-1.5">
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
                        className="gap-1.5 rounded-full border-black/[0.06] bg-white shadow-sm hover:shadow-md transition-all text-gray-600 hover:text-gray-900 h-8 px-3 text-xs font-medium whitespace-nowrap"
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
                        className="gap-1.5 rounded-full border-black/[0.06] bg-white shadow-sm hover:shadow-md transition-all text-gray-600 hover:text-gray-900 h-8 px-3 text-xs font-medium whitespace-nowrap"
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
                        className="gap-1.5 rounded-full border-black/[0.06] bg-white shadow-sm hover:shadow-md transition-all text-gray-600 hover:text-gray-900 h-8 px-3 text-xs font-medium whitespace-nowrap"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">New Chat</span>
                      </Button>
                    }
                  />
                  <TooltipContent>Start a new chat</TooltipContent>
                </Tooltip>

                {/* ====================== MODERN AGENT TOGGLE ====================== */}
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <motion.button
                        onClick={() => setMode(isAgent ? "rag" : "agent")}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={`
                          group relative flex items-center gap-2 h-8 px-4 rounded-2xl font-medium text-xs
                          overflow-hidden border transition-all duration-300
                          ${isAgent
                            ? 'border-violet-500/30 bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/30'
                            : 'bg-white border-gray-200 hover:border-gray-300 text-gray-600 hover:text-gray-900'
                          }
                        `}
                      >
                        {/* Shine animation when Agent is active */}
                        {isAgent && (
                          <motion.div
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent"
                            initial={{ x: '-150%' }}
                            animate={{ x: '400%' }}
                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                          />
                        )}

                        <AnimatePresence mode="wait">
                          <motion.div
                            key={isAgent ? 'brain' : 'bot'}
                            initial={{ opacity: 0, scale: 0.7, rotate: -15 }}
                            animate={{ opacity: 1, scale: isAgent ? 1.15 : 1, rotate: isAgent ? 12 : 0 }}
                            exit={{ opacity: 0, scale: 0.7, rotate: 15 }}
                            transition={{ type: "spring", stiffness: 500, damping: 20 }}
                          >
                            {isAgent ? <Brain className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                          </motion.div>
                        </AnimatePresence>

                        <span className="relative z-10">Agent</span>

                        <motion.div
                          animate={{
                            backgroundColor: isAgent ? '#c4d0ff' : '#e5e5e5',
                            color: isAgent ? '#1e1b4b' : '#666666',
                          }}
                          className="text-[10px] font-mono px-2 py-0.5 rounded-full tracking-widest font-medium"
                        >
                          {isAgent ? 'ON' : 'OFF'}
                        </motion.div>

                        {isAgent && (
                          <motion.div
                            animate={{ opacity: [0.6, 1, 0.6], scale: [0.85, 1.15, 0.85] }}
                            transition={{ duration: 2.8, repeat: Infinity }}
                            className="absolute -top-1 -right-1"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-yellow-300 drop-shadow-sm" />
                          </motion.div>
                        )}
                      </motion.button>
                    }
                  />
                  <TooltipContent side="bottom">
                    Toggle between Classic RAG and Intelligent Agent mode
                  </TooltipContent>
                </Tooltip>
                {/* ================================================================ */}
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
                      className="gap-1.5 rounded-full border-black/[0.06] bg-white shadow-sm hover:shadow-md transition-all text-gray-600 hover:text-gray-900 h-8 px-3 text-xs font-medium whitespace-nowrap"
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
                    className="h-8 w-8 p-0 border-black/[0.06] bg-white shadow-sm hover:shadow-md"
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
                    <div className="ml-2 text-[11px] text-gray-400 font-medium cursor-default">
                      {session.documents.length} docs
                    </div>
                  }
                />
                <TooltipContent side="bottom" align="end" className="flex-col items-start gap-1 max-w-xs">
                  {session.documents.map((doc) => (
                    <div key={doc.id} className="w-full truncate">{doc.name}</div>
                  ))}
                </TooltipContent>
              </Tooltip>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="relative sm:hidden">
            {/* ... existing mobile menu code ... */}
          </div>
        </div>
      </header>

      {/* Modals */}
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

      {/* Mobile bottom tab bar */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur border-t border-black/[0.06] pb-[env(safe-area-inset-bottom)]">
        {/* ... your existing mobile nav ... */}
      </nav>
    </>
  )
}