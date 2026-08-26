"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Upload, Plus, Activity, BarChart3, Settings, Layers, Database, Brain } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useRagContext } from "@/hooks/use-rag"
import { cn } from "@/lib/utils"
import { SettingsModal } from "./settings-modal"
import { TracesListModal } from "./traces-list-modal"

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
  const { clearChat, session } = useRagContext()
  const isChatPage = pathname === "/"
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [tracesOpen, setTracesOpen] = useState(false)

  return (
    <header className="relative z-10 flex items-center justify-between px-6 py-3 bg-transparent">
      <div className="flex items-center gap-3">
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity shrink-0 bg-white rounded-full px-3.5 py-2 shadow-[0_1px_8px_-2px_rgba(0,0,0,0.08),0_0_0_1px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 shadow-sm">
            <Layers className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="leading-none">
            <h1 className="text-sm font-semibold tracking-tight text-gray-900">
              RAG Lab
            </h1>
            <p className="text-[10px] text-gray-400 mt-0.5">
              Workspace
            </p>
          </div>
        </Link>

        <nav className="flex items-center gap-1 bg-white rounded-full p-1 shadow-[0_1px_8px_-2px_rgba(0,0,0,0.08),0_0_0_1px_rgba(0,0,0,0.04)]">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                  isActive
                    ? "bg-gray-900 text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </Link>
            )
          })}
        </nav>
      </div>

      <div className="flex items-center gap-1.5">
        {isChatPage && (
          <>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onUploadClick}
                    className="gap-1.5 rounded-full border-black/[0.06] bg-white shadow-sm hover:shadow-md transition-all text-gray-600 hover:text-gray-900 h-8 px-3 text-xs font-medium"
                  />
                }
              >
                <Upload className="w-3.5 h-3.5" />
                Upload
              </TooltipTrigger>
              <TooltipContent>Upload documents</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearChat}
                    className="gap-1.5 rounded-full border-black/[0.06] bg-white shadow-sm hover:shadow-md transition-all text-gray-600 hover:text-gray-900 h-8 px-3 text-xs font-medium"
                  />
                }
              >
                <Plus className="w-3.5 h-3.5" />
                New Chat
              </TooltipTrigger>
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
                  className="gap-1.5 rounded-full border-black/[0.06] bg-white shadow-sm hover:shadow-md transition-all text-gray-600 hover:text-gray-900 h-8 px-3 text-xs font-medium"
                />
              }
            >
              <Activity className="w-3.5 h-3.5" />
              Traces
            </TooltipTrigger>
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
                className="gap-1.5 rounded-full border-black/[0.06] bg-white shadow-sm hover:shadow-md transition-all text-gray-600 hover:text-gray-900 h-8 w-8 p-0"
              />
            }
          >
            <Settings className="w-3.5 h-3.5" />
          </TooltipTrigger>
          <TooltipContent>Settings</TooltipContent>
        </Tooltip>

        {isChatPage && session.documents.length > 0 && (
          <div className="ml-2 text-[11px] text-gray-400 font-medium">
            {session.documents.length} docs
          </div>
        )}
      </div>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <TracesListModal open={tracesOpen} onClose={() => setTracesOpen(false)} />
    </header>
  )
}
