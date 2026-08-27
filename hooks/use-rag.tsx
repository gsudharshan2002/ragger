"use client"

import { createContext, useContext, useCallback, useRef, useState, useEffect, type ReactNode } from "react"
import { apiFetch, previewUrl as previewUrlHelper } from "@/lib/api"
import type { RagStrategy, RagTrace, ChatMessage, UploadedDocument, Session } from "../lib/types"
import type { RagEvent } from "../lib/events"
import { RagEventBus, createEventBus } from "../lib/events"
import { generateId } from "../lib/utils"

interface RagContextValue {
  session: Session
  activeTrace: RagTrace | null
  isExecuting: boolean
  events: RagEvent[]
  strategy: RagStrategy
  setStrategy: (s: RagStrategy) => void
  selectedKnowledgeBaseId: string | null
  setSelectedKnowledgeBaseId: (id: string | null) => void
  sendMessage: (content: string) => void
  stopGeneration: () => void
  addDocument: (doc: UploadedDocument) => void
  removeDocument: (id: string) => void
  clearChat: () => void
  tracePanelOpen: boolean
  setTracePanelOpen: (open: boolean) => void
  selectedTrace: RagTrace | null
  setSelectedTrace: (t: RagTrace | null) => void
}

const RagContext = createContext<RagContextValue | null>(null)

export function useRagContext() {
  const ctx = useContext(RagContext)
  if (!ctx) throw new Error("useRagContext must be used within RagProvider")
  return ctx
}

async function fetchRagStream(
  query: string,
  strategy: RagStrategy,
  onEvent: (event: RagEvent) => void,
  knowledgeBaseId?: string
): Promise<() => void> {
  const controller = new AbortController()

  try {
    const response = await apiFetch("/chat/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, strategy, knowledgeBaseId }),
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error("No response body")
    }

    const decoder = new TextDecoder()
    let buffer = ""

    const readStream = async () => {
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split("\n")
          buffer = lines.pop() || ""
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6).trim()
              if (data === "[DONE]") break
              try {
                const event = JSON.parse(data) as RagEvent
                onEvent(event)
              } catch {
                // skip malformed lines
              }
            }
          }
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return
        throw err
      }
    }

    // Fire and forget – caller cancels via the returned function
    readStream().catch(() => {})
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      // cleaned up
    } else {
      throw err
    }
  }

  return () => controller.abort()
}

export function RagProvider({ children }: { children: ReactNode }) {
  const busRef = useRef<RagEventBus>(createEventBus())
  const [strategy, setStrategy] = useState<RagStrategy>("hybrid-rerank-mmr")
  const [selectedKnowledgeBaseId, setSelectedKnowledgeBaseId] = useState<string | null>(null)
  const [activeTrace, setActiveTrace] = useState<RagTrace | null>(null)
  const [isExecuting, setIsExecuting] = useState(false)
  const [events, setEvents] = useState<RagEvent[]>([])
  const [tracePanelOpen, setTracePanelOpen] = useState(false)
  const [selectedTrace, setSelectedTrace] = useState<RagTrace | null>(null)
  const cancelRef = useRef<(() => void) | null>(null)

  const [session, setSession] = useState<Session>({
    id: generateId(),
    title: "New Session",
    createdAt: new Date().toISOString(),
    messages: [],
    documents: [],
  })

  useEffect(() => {
    apiFetch("/documents")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data) {
          setSession((prev) => ({ ...prev, documents: data.data }))
        }
      })
      .catch(() => {})
  }, [])

  const addDocument = useCallback((doc: UploadedDocument) => {
    setSession((prev) => ({
      ...prev,
      documents: [...prev.documents, doc],
    }))
  }, [])

  const removeDocument = useCallback((id: string) => {
    setSession((prev) => ({
      ...prev,
      documents: prev.documents.filter((d) => d.id !== id),
    }))
    apiFetch(`/documents/${id}`, { method: "DELETE" }).catch(() => {})
  }, [])

  const sendMessage = useCallback((content: string) => {
    if (isExecuting || !content.trim()) return

    const userMessage: ChatMessage = {
      id: generateId(),
      role: "user",
      content: content.trim(),
      timestamp: new Date().toISOString(),
      strategy,
    }

    setSession((prev) => ({
      ...prev,
      messages: [...prev.messages, userMessage],
    }))

    setIsExecuting(true)
    setActiveTrace(null)
    setEvents([])

    const collectedEventsRef = { current: [] as RagEvent[] }
    let eventsUpdateScheduled = false

    const scheduleEventsUpdate = () => {
      if (eventsUpdateScheduled) return
      eventsUpdateScheduled = true
      queueMicrotask(() => {
        eventsUpdateScheduled = false
        setEvents([...collectedEventsRef.current])
      })
    }

    const unsubscribe = busRef.current.subscribe((event: RagEvent) => {
      // Skip high-frequency token events to avoid excessive re-renders
      const t = event.type as string
      if (t === "llm.token" || t === "llm.token.generated") return
      collectedEventsRef.current.push(event)
      scheduleEventsUpdate()
    })

    fetchRagStream(content.trim(), strategy, (event) => {
      busRef.current.emit(event)
    }, selectedKnowledgeBaseId ?? undefined).then((cleanup) => {
      cancelRef.current = cleanup

      // Watch for trace.completed to finalize
      const traceUnsubscribe = busRef.current.subscribe((event: RagEvent) => {
        if (event.type === "trace.completed") {
          traceUnsubscribe()
          cleanup()

          const trace = event.data as unknown as RagTrace
          setActiveTrace(trace)
          setIsExecuting(false)
          setEvents([...collectedEventsRef.current])

          const assistantMessage: ChatMessage = {
            id: generateId(),
            role: "assistant",
            content: trace.llm.answer,
            timestamp: new Date().toISOString(),
            trace,
            strategy,
            sources: (trace.context.chunks as unknown as { documentName: string; page: number; section?: string; documentId: string }[]).map((c) => ({
              document: c.documentName,
              page: c.page,
              section: c.section,
              documentId: c.documentId,
            })),
          }

          setSession((prev) => ({
            ...prev,
            messages: [...prev.messages, assistantMessage],
          }))

          unsubscribe()
        } else if (event.type === "trace.failed" || event.type === "error") {
          traceUnsubscribe()
          cleanup()

          const errorMessage = (event.data as { error?: string })?.error || "Something went wrong."
          setIsExecuting(false)
          setEvents([...collectedEventsRef.current])

          const assistantMessage: ChatMessage = {
            id: generateId(),
            role: "assistant",
            content: `Error: ${errorMessage}`,
            timestamp: new Date().toISOString(),
            strategy,
            sources: [],
          }

          setSession((prev) => ({
            ...prev,
            messages: [...prev.messages, assistantMessage],
          }))

          unsubscribe()
        }
      })
    }).catch(() => {
      unsubscribe()
      setIsExecuting(false)
    })
  }, [strategy, selectedKnowledgeBaseId])

  const stopGeneration = useCallback(() => {
    cancelRef.current?.()
    cancelRef.current = null
    setIsExecuting(false)
  }, [])

  const clearChat = useCallback(() => {
    cancelRef.current?.()
    cancelRef.current = null
    setSession((prev) => ({
      ...prev,
      messages: [],
    }))
    setActiveTrace(null)
    setEvents([])
    setIsExecuting(false)
  }, [])

  return (
    <RagContext.Provider
      value={{
        session,
        activeTrace,
        isExecuting,
        events,
        strategy,
        setStrategy,
        selectedKnowledgeBaseId,
        setSelectedKnowledgeBaseId,
        sendMessage,
        stopGeneration,
        addDocument,
        removeDocument,
        clearChat,
        tracePanelOpen,
        setTracePanelOpen,
        selectedTrace,
        setSelectedTrace,
      }}
    >
      {children}
    </RagContext.Provider>
  )
}
