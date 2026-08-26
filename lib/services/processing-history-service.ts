import type { ProcessingHistoryEvent, ProcessingAction } from "@/lib/types"
import { generateId } from "@/lib/utils"
import { readJson, writeJson, getDataPath } from "./storage"

const HISTORY_PATH = getDataPath("processing-history.json")

export async function getDocumentHistory(
  documentId: string
): Promise<ProcessingHistoryEvent[]> {
  const events = (await readJson<ProcessingHistoryEvent[]>(HISTORY_PATH)) || []
  return events
    .filter((e) => e.documentId === documentId)
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
}

export async function getKnowledgeBaseHistory(
  knowledgeBaseId: string
): Promise<ProcessingHistoryEvent[]> {
  const events = (await readJson<ProcessingHistoryEvent[]>(HISTORY_PATH)) || []
  return events
    .filter((e) => e.knowledgeBaseId === knowledgeBaseId)
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
}

export async function startProcessingEvent(
  documentId: string,
  action: ProcessingAction,
  config?: Record<string, unknown>,
  knowledgeBaseId?: string
): Promise<ProcessingHistoryEvent> {
  const events = (await readJson<ProcessingHistoryEvent[]>(HISTORY_PATH)) || []

  const event: ProcessingHistoryEvent = {
    id: generateId(),
    documentId,
    knowledgeBaseId,
    action,
    startedAt: new Date().toISOString(),
    status: "running",
    config,
  }

  events.push(event)
  await writeJson(HISTORY_PATH, events)

  return event
}

export async function completeProcessingEvent(
  eventId: string,
  resultSummary?: string
): Promise<void> {
  const events = (await readJson<ProcessingHistoryEvent[]>(HISTORY_PATH)) || []
  const idx = events.findIndex((e) => e.id === eventId)
  if (idx === -1) {
    throw new Error(`Event not found: ${eventId}`)
  }

  const now = new Date().toISOString()
  const startedAt = new Date(events[idx].startedAt).getTime()

  events[idx] = {
    ...events[idx],
    status: "completed",
    completedAt: now,
    durationMs: Date.now() - startedAt,
    resultSummary,
  }

  await writeJson(HISTORY_PATH, events)
}

export async function failProcessingEvent(
  eventId: string,
  error: string
): Promise<void> {
  const events = (await readJson<ProcessingHistoryEvent[]>(HISTORY_PATH)) || []
  const idx = events.findIndex((e) => e.id === eventId)
  if (idx === -1) {
    throw new Error(`Event not found: ${eventId}`)
  }

  const now = new Date().toISOString()
  const startedAt = new Date(events[idx].startedAt).getTime()

  events[idx] = {
    ...events[idx],
    status: "failed",
    completedAt: now,
    durationMs: Date.now() - startedAt,
    error,
  }

  await writeJson(HISTORY_PATH, events)
}

export async function deleteDocumentHistory(
  documentId: string
): Promise<void> {
  const events = (await readJson<ProcessingHistoryEvent[]>(HISTORY_PATH)) || []
  const remaining = events.filter((e) => e.documentId !== documentId)
  await writeJson(HISTORY_PATH, remaining)
}
