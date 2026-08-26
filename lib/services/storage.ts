import fs from "fs/promises"
import path from "path"

const DATA_DIR = path.join(process.cwd(), "data")
const TRACES_DIR = path.join(DATA_DIR, "traces")

async function ensureDir(dir: string): Promise<void> {
  try {
    await fs.access(dir)
  } catch {
    await fs.mkdir(dir, { recursive: true })
  }
}

export async function readJson<T>(filePath: string): Promise<T | null> {
  try {
    const fullDir = path.dirname(filePath)
    await ensureDir(fullDir)
    const data = await fs.readFile(filePath, "utf-8")
    return JSON.parse(data) as T
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null
    throw err
  }
}

export async function writeJson<T>(filePath: string, data: T): Promise<void> {
  const fullDir = path.dirname(filePath)
  await ensureDir(fullDir)
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8")
}

export async function appendToArray<T>(filePath: string, item: T): Promise<void> {
  const existing = await readJson<T[]>(filePath)
  const arr = existing || []
  arr.push(item)
  await writeJson(filePath, arr)
}

export async function updateById<T extends { id: string }>(
  filePath: string,
  id: string,
  updates: Partial<T>
): Promise<T | null> {
  const arr = await readJson<T[]>(filePath)
  if (!arr) return null
  const idx = arr.findIndex((item) => item.id === id)
  if (idx === -1) return null
  arr[idx] = { ...arr[idx], ...updates }
  await writeJson(filePath, arr)
  return arr[idx]
}

export async function findById<T extends { id: string }>(
  filePath: string,
  id: string
): Promise<T | null> {
  const arr = await readJson<T[]>(filePath)
  if (!arr) return null
  return arr.find((item) => item.id === id) || null
}

export async function deleteById<T extends { id: string }>(
  filePath: string,
  id: string
): Promise<boolean> {
  const arr = await readJson<T[]>(filePath)
  if (!arr) return false
  const filtered = arr.filter((item) => item.id !== id)
  if (filtered.length === arr.length) return false
  await writeJson(filePath, filtered)
  return true
}

export async function readTrace(traceId: string): Promise<Record<string, unknown> | null> {
  return readJson<Record<string, unknown>>(path.join(TRACES_DIR, `${traceId}.json`))
}

export async function writeTrace(traceId: string, data: Record<string, unknown>): Promise<void> {
  await ensureDir(TRACES_DIR)
  await writeJson(path.join(TRACES_DIR, `${traceId}.json`), data)
}

export function getDataPath(filename: string): string {
  return path.join(DATA_DIR, filename)
}

export function getStoragePath(subpath: string): string {
  return path.join(process.cwd(), "storage", subpath)
}
