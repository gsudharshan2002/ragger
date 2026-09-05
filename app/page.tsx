"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Header } from "@/components/rag/header"
import { ChatComposer } from "@/components/rag/chat-composer"
import { ChatMessage } from "@/components/rag/chat-message"
import { RagExecutionCanvas } from "@/components/rag/rag-execution-canvas"
import { UploadModal } from "@/components/rag/upload-modal"
import { ChatVisual } from "@/components/rag/chat-visual"
import { useRagContext } from "@/hooks/use-rag"
import type { RagTrace } from "@/lib/types"
import { FileText, Search, GitCompare, BookOpen, Layers, Zap, ListTree, Sparkles } from "lucide-react"

const SUGGESTIONS_LEFT = [
  {
    icon: FileText,
    label: "Summarize my documents",
    prompt: "Give me a comprehensive summary of all the key points across my uploaded documents.",
  },
  {
    icon: Search,
    label: "Find specific information",
    prompt: "Search my documents for information about ",
  },
  {
    icon: GitCompare,
    label: "Compare approaches",
    prompt: "Compare the different approaches or methodologies discussed in my documents.",
  },
  {
    icon: BookOpen,
    label: "Explain a concept",
    prompt: "Explain the main concepts from my documents in simple terms.",
  },
]

const SUGGESTIONS_RIGHT = [
  {
    icon: Layers,
    label: "How does retrieval work?",
    prompt: "How does the RAG retrieval pipeline work in this system? Walk me through each stage.",
  },
  {
    icon: Zap,
    label: "Optimize chunk settings",
    prompt: "What chunk size and overlap settings would work best for my document types?",
  },
  {
    icon: ListTree,
    label: "Outline the structure",
    prompt: "Create a structured outline of the topics covered across my knowledge base.",
  },
  {
    icon: Sparkles,
    label: "Generate quiz questions",
    prompt: "Generate 5 quiz questions based on the content in my documents, with answers.",
  },
]

export default function Home() {
  const {
    session,
    activeTrace,
    isExecuting,
    events,
    strategy,
    sendMessage,
    setTracePanelOpen,
    setSelectedTrace,
  } = useRagContext()

  const [uploadOpen, setUploadOpen] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [session.messages.length, isExecuting, events.length, scrollToBottom])

  const handlePromptClick = (prompt: string) => {
    sendMessage(prompt)
  }

  const handleViewTrace = (trace: RagTrace) => {
    setSelectedTrace(trace)
    setTracePanelOpen(true)
  }

  const hasMessages = session.messages.length > 0 || isExecuting

  return (
    <div className="flex flex-col h-screen bg-transparent">
      <div className="bg-animated-gradient">
        <div className="bg-orb bg-orb-1" />
        <div className="bg-orb bg-orb-2" />
        <div className="bg-orb bg-orb-3" />
        <div className="bg-orb bg-orb-4" />
      </div>

      {!hasMessages && (
        <div className="fixed inset-0 z-[1]">
          <ChatVisual />
        </div>
      )}

      <Header onUploadClick={() => setUploadOpen(true)} />

      {!hasMessages ? (
        <main className="flex-1 flex items-center justify-center relative z-10 px-4 overflow-hidden">
          <div className="relative z-10 w-full max-w-7xl flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="hidden lg:flex flex-col gap-2 flex-1 max-w-[280px]"
            >
              <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-1 px-1">
                Suggestions
              </p>
              {SUGGESTIONS_LEFT.map((s, i) => (
                <motion.button
                  key={s.label}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.4 + i * 0.05 }}
                  whileHover={{ scale: 1.01, x: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handlePromptClick(s.prompt)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/70 backdrop-blur-sm border border-black/[0.04] shadow-[0_1px_6px_-2px_rgba(0,0,0,0.06)] hover:shadow-[0_2px_12px_-2px_rgba(0,0,0,0.1)] hover:bg-white transition-all text-left cursor-pointer group"
                >
                  <div className="shrink-0 w-8 h-8 rounded-lg bg-gray-50 border border-black/[0.04] flex items-center justify-center group-hover:bg-gray-100 transition-colors">
                    <s.icon className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                  </div>
                  <span className="text-xs font-medium text-gray-600 group-hover:text-gray-900 transition-colors leading-snug">
                    {s.label}
                  </span>
                </motion.button>
              ))}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="text-center mb-20 sm:mb-8 flex-1 max-w-4xl"
            >
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold text-white tracking-tight mb-2">
                RAG LAB
              </h1>
              <p className="text-sm text-gray-400 max-w-md mx-auto leading-relaxed mb-6 sm:mb-8">
                Ask your documents anything
              </p>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className="w-full max-w-4xl mx-auto"
              >
                <ChatComposer onUploadClick={() => setUploadOpen(true)} />
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="hidden lg:flex flex-col gap-2 flex-1 max-w-[280px]"
            >
              <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-1 px-1">
                Suggestions
              </p>
              {SUGGESTIONS_RIGHT.map((s, i) => (
                <motion.button
                  key={s.label}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.4 + i * 0.05 }}
                  whileHover={{ scale: 1.01, x: 2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handlePromptClick(s.prompt)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/70 backdrop-blur-sm border border-black/[0.04] shadow-[0_1px_6px_-2px_rgba(0,0,0,0.06)] hover:shadow-[0_2px_12px_-2px_rgba(0,0,0,0.1)] hover:bg-white transition-all text-left cursor-pointer group"
                >
                  <div className="shrink-0 w-8 h-8 rounded-lg bg-gray-50 border border-black/[0.04] flex items-center justify-center group-hover:bg-gray-100 transition-colors">
                    <s.icon className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                  </div>
                  <span className="text-xs font-medium text-gray-600 group-hover:text-gray-900 transition-colors leading-snug">
                    {s.label}
                  </span>
                </motion.button>
              ))}
            </motion.div>
          </div>
        </main>
      ) : (
        <main className="flex-1 flex flex-col min-h-0 relative z-10">
          <div ref={chatContainerRef} className="flex-1 overflow-y-auto pb-40 sm:pb-24">
            <div className="max-w-3xl mx-auto py-4 space-y-2">
              <AnimatePresence mode="popLayout">
                {session.messages.map((msg) => (
                  <ChatMessage
                    key={msg.id}
                    message={msg}
                    onViewTrace={handleViewTrace}
                  />
                ))}
              </AnimatePresence>

              {isExecuting && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="px-4"
                >
                  <RagExecutionCanvas
                    events={events}
                    strategy={strategy}
                    trace={activeTrace}
                    isExecuting={isExecuting}
                  />
                </motion.div>
              )}

              {activeTrace && !isExecuting && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="px-4"
                >
                  <RagExecutionCanvas
                    events={events}
                    strategy={strategy}
                    trace={activeTrace}
                    isExecuting={false}
                  />
                </motion.div>
              )}

              <div ref={chatEndRef} />
            </div>
          </div>

          <div className="absolute bottom-14 sm:bottom-0 left-0 right-0 z-50 pb-[env(safe-area-inset-bottom)]">
            <ChatComposer />
          </div>
        </main>
      )}

      <UploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} />
    </div>
  )
}
