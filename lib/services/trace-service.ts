import fs from "fs/promises"
import path from "path"
import type { FullTrace, TraceEvent } from "@/lib/types"
import { generateId } from "@/lib/utils"
import { readJson, writeJson, readTrace, writeTrace } from "./storage"

const TRACES_DIR = path.join(process.cwd(), "data", "traces")

export function createTraceId(): string {
  return `trace_${generateId()}`
}

export function createRunId(): string {
  return `run_${generateId()}`
}

export async function saveTrace(trace: FullTrace): Promise<void> {
  await writeTrace(trace.id, trace as unknown as Record<string, unknown>)
}

export async function getTrace(traceId: string): Promise<FullTrace | null> {
  const data = await readTrace(traceId)
  return data as FullTrace | null
}

export async function listTraces(limit: number = 50): Promise<FullTrace[]> {
  try {
    await fs.access(TRACES_DIR)
  } catch {
    return []
  }

  const files = await fs.readdir(TRACES_DIR)
  const jsonFiles = files.filter((f) => f.endsWith(".json"))

  const traces: FullTrace[] = []

  for (const file of jsonFiles) {
    try {
      const filePath = path.join(TRACES_DIR, file)
      const data = await readJson<FullTrace>(filePath)
      if (data) {
        traces.push(data)
      }
    } catch {
      // Skip malformed trace files
    }
  }

  traces.sort((a, b) => {
    const timeA = new Date(a.timestamp).getTime()
    const timeB = new Date(b.timestamp).getTime()
    return timeB - timeA
  })

  return traces.slice(0, limit)
}

export async function deleteTrace(traceId: string): Promise<boolean> {
  const filePath = path.join(TRACES_DIR, `${traceId}.json`)
  try {
    await fs.access(filePath)
  } catch {
    return false
  }

  try {
    await fs.unlink(filePath)
    return true
  } catch {
    return false
  }
}

export function createTraceEvent(
  traceId: string,
  runId: string,
  stage: string,
  event: string,
  data: Record<string, unknown>
): TraceEvent {
  return {
    id: generateId(),
    traceId,
    runId,
    stage,
    event,
    timestamp: new Date().toISOString(),
    data,
  }
}
