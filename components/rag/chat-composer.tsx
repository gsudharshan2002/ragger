"use client"

import { useState, useRef, useEffect } from "react"
import { apiFetch, apiUpload } from "@/lib/api"
import { motion, AnimatePresence } from "framer-motion"
import { Send, Paperclip, Mic, ChevronDown, Check, Database, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useRagContext } from "@/hooks/use-rag"
import { RAG_STRATEGIES, type RagStrategy, type KnowledgeBase } from "@/lib/types"
import { cn } from "@/lib/utils"
import { AnimatedStopButton } from "./animated-stop-button"

export function ChatComposer({ onUploadClick }: { onUploadClick?: () => void }) {
  const { sendMessage, strategy, setStrategy, isExecuting, stopGeneration, setSelectedKnowledgeBaseId } = useRagContext()
  const [value, setValue] = useState("")
  const [strategyOpen, setStrategyOpen] = useState(false)
  const [kbOpen, setKbOpen] = useState(false)
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([])
  const [selectedKbId, setSelectedKbId] = useState<string | null>(null)
  const [isListening, setIsListening] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const kbDropdownRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    apiFetch("/knowledge-bases")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data) {
          setKnowledgeBases(data.data)
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setStrategyOpen(false)
      }
      if (kbDropdownRef.current && !kbDropdownRef.current.contains(e.target as Node)) {
        setKbOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`
    }
  }, [value])

  const handleSend = () => {
    if (!value.trim() || isExecuting) return
    sendMessage(value)
    setValue("")
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleMicToggle = () => {
    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
      return
    }
    const w = window as unknown as Record<string, unknown>
    const SpeechRecognitionAPI = w.SpeechRecognition || w.webkitSpeechRecognition
    if (!SpeechRecognitionAPI) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognition = new (SpeechRecognitionAPI as any)()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = "en-US"
    recognition.onresult = (event: { results: { length: number; [index: number]: { 0: { transcript: string } } } }) => {
      let transcript = ""
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript
      }
      setValue(transcript)
    }
    recognition.onerror = () => setIsListening(false)
    recognition.onend = () => setIsListening(false)
    recognitionRef.current = recognition
    recognition.start()
    setIsListening(true)
  }

  const currentStrategy = RAG_STRATEGIES.find((s) => s.value === strategy)!
  const selectedKb = knowledgeBases.find((kb) => kb.id === selectedKbId)

  const handleKbSelect = (id: string | null) => {
    setSelectedKbId(id)
    setSelectedKnowledgeBaseId(id)
  }

  return (
    <div className="relative z-10 px-4 pb-4">
      <div className="max-w-4xl mx-auto">
        <div className="relative bg-white rounded-full shadow-[0_2px_20px_-4px_rgba(0,0,0,0.08),0_0_0_1px_rgba(0,0,0,0.04)] transition-shadow hover:shadow-[0_4px_30px_-4px_rgba(0,0,0,0.12),0_0_0_1px_rgba(0,0,0,0.06)]">
          <div className="flex items-center gap-1 px-1.5 sm:px-2 py-1 sm:py-1.5">
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onUploadClick}
                    className="shrink-0 w-7 h-7 sm:w-8 sm:h-8 min-w-[44px] min-h-[44px] sm:min-w-8 sm:min-h-8 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100/60"
                  >
                    <Paperclip className="w-4 h-4" />
                  </Button>
                }
              />
              <TooltipContent>Attach file</TooltipContent>
            </Tooltip>

            <div className="relative" ref={dropdownRef} onMouseLeave={() => setStrategyOpen(false)}>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      onClick={() => setStrategyOpen(!strategyOpen)}
                      onMouseEnter={() => setStrategyOpen(true)}
                      className={cn(
                        "flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-1.5 sm:py-2 min-h-[44px] sm:min-h-8 rounded-full text-[11px] font-medium transition-all border overflow-hidden",
                        strategyOpen
                          ? "bg-gray-100 border-gray-200 text-gray-700 w-auto max-w-[110px]"
                          : "bg-white border-black/[0.06] text-gray-500 hover:bg-gray-50 hover:border-gray-200 w-7 sm:w-8 justify-center"
                      )}
                    >
                      {getStrategyIcon(strategy)}
                      <span className={cn("whitespace-nowrap overflow-hidden text-ellipsis transition-all duration-200", strategyOpen ? "opacity-100 ml-1" : "opacity-0 w-0 ml-0")}>
                        {currentStrategy.label}
                      </span>
                      <ChevronDown className={cn("w-3.5 h-3.5 transition-all duration-200 shrink-0", strategyOpen ? "opacity-100 ml-0.5" : "opacity-0 w-0 ml-0")} />
                    </button>
                  }
                />
                <TooltipContent>Select retrieval strategy</TooltipContent>
              </Tooltip>

              <AnimatePresence>
                {strategyOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 4, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    className="absolute bottom-full mb-2 left-0 w-64 bg-white rounded-xl overflow-hidden popup-bevel-sm"
                  >
                    <div className="p-1">
                      {RAG_STRATEGIES.map((s) => (
                        <button
                          key={s.value}
                          onClick={() => {
                            setStrategy(s.value)
                            setStrategyOpen(false)
                          }}
                          className={cn(
                            "flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-left text-sm transition-colors",
                            strategy === s.value
                              ? "bg-gray-100 text-gray-900"
                              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                          )}
                        >
                          <span className="text-gray-400">{getStrategyIcon(s.value)}</span>
                          <span className="flex-1 text-xs font-medium">{s.label}</span>
                          {strategy === s.value && <Check className="w-3.5 h-3.5 text-gray-500" />}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="relative hidden sm:block" ref={kbDropdownRef} onMouseLeave={() => setKbOpen(false)}>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      onClick={() => setKbOpen(!kbOpen)}
                      onMouseEnter={() => setKbOpen(true)}
                      className={cn(
                        "flex items-center gap-1 px-2 py-2 rounded-full text-[11px] font-medium transition-all border overflow-hidden",
                        kbOpen
                          ? "bg-gray-100 border-gray-200 text-gray-700 w-auto max-w-[110px]"
                          : selectedKb
                            ? "bg-blue-50 border-blue-200 text-blue-600 w-8 justify-center"
                            : "bg-white border-black/[0.06] text-gray-500 hover:bg-gray-50 hover:border-gray-200 w-8 justify-center"
                      )}
                    >
                      <Database className="w-3 h-3 shrink-0" />
                      <span className={cn("whitespace-nowrap overflow-hidden text-ellipsis transition-all duration-200", kbOpen ? "opacity-100 ml-1" : "opacity-0 w-0 ml-0")}>
                        {selectedKb ? selectedKb.name : "All KBs"}
                      </span>
                      <ChevronDown className={cn("w-3.5 h-3.5 transition-all duration-200 shrink-0", kbOpen ? "opacity-100 ml-0.5" : "opacity-0 w-0 ml-0")} />
                    </button>
                  }
                />
                <TooltipContent>Select knowledge base</TooltipContent>
              </Tooltip>

              <AnimatePresence>
                {kbOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 4, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    className="absolute bottom-full mb-2 left-0 w-56 bg-white rounded-xl overflow-hidden popup-bevel-sm"
                  >
                    <div className="p-1">
                      <button
                        onClick={() => {
                          handleKbSelect(null)
                          setKbOpen(false)
                        }}
                        className={cn(
                          "flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-left text-sm transition-colors",
                          !selectedKbId
                            ? "bg-gray-100 text-gray-900"
                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                        )}
                      >
                        <Database className="w-3.5 h-3.5 text-gray-400" />
                        <span className="flex-1 text-xs font-medium">All knowledge bases</span>
                        {!selectedKbId && <Check className="w-3.5 h-3.5 text-gray-500" />}
                      </button>
                      {knowledgeBases.map((kb) => (
                        <button
                          key={kb.id}
                          onClick={() => {
                            handleKbSelect(kb.id)
                            setKbOpen(false)
                          }}
                          className={cn(
                            "flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-left text-sm transition-colors",
                            selectedKbId === kb.id
                              ? "bg-gray-100 text-gray-900"
                              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                          )}
                        >
                          <Database className="w-3.5 h-3.5 text-gray-400" />
                          <span className="flex-1 text-xs font-medium truncate">{kb.name}</span>
                          {selectedKbId === kb.id && <Check className="w-3.5 h-3.5 text-gray-500" />}
                        </button>
                      ))}
                      {knowledgeBases.length === 0 && (
                        <div className="px-3 py-2 text-xs text-gray-400">No knowledge bases found</div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question about your documents..."
              rows={1}
              disabled={isExecuting}
              className="flex-1 min-w-0 resize-none bg-transparent px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none disabled:opacity-50 min-h-[40px] max-h-[160px] leading-relaxed"
            />

            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleMicToggle}
                    className={cn(
                      "shrink-0 w-7 h-7 sm:w-8 sm:h-8 min-w-[44px] min-h-[44px] sm:min-w-8 sm:min-h-8 rounded-full transition-colors",
                      isListening ? "text-red-500 bg-red-50 hover:bg-red-100" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100/60"
                    )}
                  >
                    {isListening ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
                  </Button>
                }
              />
              <TooltipContent>{isListening ? "Stop listening" : "Voice input"}</TooltipContent>
            </Tooltip>

            {isExecuting ? (
              <AnimatedStopButton onClick={stopGeneration} />
            ) : (
              <Button
                onClick={handleSend}
                disabled={!value.trim()}
                size="icon"
                className={cn(
                  "shrink-0 w-8 h-8 min-w-[44px] min-h-[44px] sm:min-w-8 sm:min-h-8 rounded-full transition-all",
                  value.trim()
                    ? "bg-gray-900 text-white hover:bg-gray-800 shadow-sm"
                    : "bg-gray-100 text-gray-400"
                )}
              >
                <Send className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function getStrategyIcon(strategy: RagStrategy) {
  const colorMap: Record<RagStrategy, string> = {
    vector: "bg-indigo-500",
    bm25: "bg-amber-500",
    hybrid: "bg-gray-600",
    "hybrid-rrf": "bg-purple-500",
    "hybrid-rerank": "bg-purple-500",
    "hybrid-rerank-mmr": "bg-pink-500",
  }
  return (
    <div className={cn("w-1.5 h-1.5 rounded-full", colorMap[strategy])} />
  )
}
