"use client"

import { motion } from "framer-motion"
import { FileText, Search, GitCompare, BookOpen } from "lucide-react"

const EXAMPLE_PROMPTS = [
  { icon: FileText, text: "Explain this document" },
  { icon: Search, text: "Find the main topic" },
  { icon: GitCompare, text: "Compare two sections" },
  { icon: BookOpen, text: "Summarize this document" },
]

interface EmptyStateProps {
  onPromptClick: (prompt: string) => void
}

export function EmptyState({ onPromptClick }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="flex flex-col items-center justify-center flex-1 px-4 pb-32"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="text-center mb-8"
      >
        <h2 className="text-2xl font-semibold text-gray-900 tracking-tight mb-2">
          Chat with your documents
        </h2>
        <p className="text-sm text-gray-400 max-w-md mx-auto leading-relaxed">
          Ask questions and inspect how your RAG system retrieves and uses context.
        </p>
      </motion.div>

      <div className="flex flex-wrap justify-center gap-2.5 max-w-lg">
        {EXAMPLE_PROMPTS.map((prompt, i) => (
          <motion.button
            key={prompt.text}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 + i * 0.08 }}
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onPromptClick(prompt.text)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white border border-black/[0.06] shadow-sm hover:shadow-md transition-all text-sm text-gray-600 hover:text-gray-900 cursor-pointer"
          >
            <prompt.icon className="w-3.5 h-3.5 text-gray-400" />
            {prompt.text}
          </motion.button>
        ))}
      </div>
    </motion.div>
  )
}
