import type {
  KnowledgeBase,
  KnowledgeBaseSettings,
  KnowledgeBaseStats,
  DocumentMetadata,
  StoredChunk,
} from "@/lib/types"
import { generateId } from "@/lib/utils"
import { readJson, writeJson, findById, getDataPath } from "./storage"

const KNOWLEDGE_BASES_PATH = getDataPath("knowledge-bases.json")
const DOCUMENTS_PATH = getDataPath("documents.json")
const CHUNKS_PATH = getDataPath("chunks.json")

const DEFAULT_SETTINGS: KnowledgeBaseSettings = {
  defaultChunkSize: 512,
  defaultChunkOverlap: 64,
  embeddingProvider: "none",
  embeddingModel: "",
}

export async function getAllKnowledgeBases(): Promise<KnowledgeBase[]> {
  const kbs = await readJson<KnowledgeBase[]>(KNOWLEDGE_BASES_PATH)
  return kbs || []
}

export async function getKnowledgeBase(
  id: string
): Promise<KnowledgeBase | null> {
  return findById<KnowledgeBase>(KNOWLEDGE_BASES_PATH, id)
}

export async function createKnowledgeBase(
  name: string,
  description: string,
  tags: string[],
  settings?: Partial<KnowledgeBaseSettings>
): Promise<KnowledgeBase> {
  const kbs = await getAllKnowledgeBases()
  const now = new Date().toISOString()

  const kb: KnowledgeBase = {
    id: generateId(),
    name,
    description,
    tags,
    createdAt: now,
    updatedAt: now,
    settings: { ...DEFAULT_SETTINGS, ...settings },
  }

  kbs.push(kb)
  await writeJson(KNOWLEDGE_BASES_PATH, kbs)

  return kb
}

export async function updateKnowledgeBase(
  id: string,
  updates: Partial<Pick<KnowledgeBase, "name" | "description" | "tags" | "settings">>
): Promise<KnowledgeBase | null> {
  const kbs = await getAllKnowledgeBases()
  const idx = kbs.findIndex((kb) => kb.id === id)
  if (idx === -1) return null

  kbs[idx] = {
    ...kbs[idx],
    ...updates,
    updatedAt: new Date().toISOString(),
  }

  await writeJson(KNOWLEDGE_BASES_PATH, kbs)
  return kbs[idx]
}

export async function deleteKnowledgeBase(id: string): Promise<boolean> {
  const kbs = await getAllKnowledgeBases()
  const filtered = kbs.filter((kb) => kb.id !== id)
  if (filtered.length === kbs.length) return false

  await writeJson(KNOWLEDGE_BASES_PATH, filtered)

  const docs = await readJson<DocumentMetadata[]>(DOCUMENTS_PATH)
  if (docs) {
    const docIds = new Set(
      docs.filter((d) => "knowledgeBaseId" in d && (d as { knowledgeBaseId?: string }).knowledgeBaseId === id).map((d) => d.id)
    )
    const remainingDocs = docs.filter((d) => !docIds.has(d.id))
    await writeJson(DOCUMENTS_PATH, remainingDocs)

    if (docIds.size > 0) {
      const chunks = await readJson<StoredChunk[]>(CHUNKS_PATH)
      if (chunks) {
        const remainingChunks = chunks.filter((c) => !docIds.has(c.documentId))
        await writeJson(CHUNKS_PATH, remainingChunks)
      }
    }
  }

  return true
}

export async function getKnowledgeBaseStats(
  id: string
): Promise<KnowledgeBaseStats> {
  const docs = (await readJson<DocumentMetadata[]>(DOCUMENTS_PATH)) || []
  const chunks = (await readJson<StoredChunk[]>(CHUNKS_PATH)) || []

  const kbDocs = docs.filter(
    (d) => "knowledgeBaseId" in d && (d as { knowledgeBaseId?: string }).knowledgeBaseId === id
  )
  const kbDocIds = new Set(kbDocs.map((d) => d.id))
  const kbChunks = chunks.filter((c) => kbDocIds.has(c.documentId))

  return {
    documentCount: kbDocs.length,
    readyDocuments: kbDocs.filter((d) => d.status === "ready").length,
    processingDocuments: kbDocs.filter(
      (d) =>
        d.status === "processing" ||
        d.status === "parsing" ||
        d.status === "chunking" ||
        d.status === "embedding" ||
        d.status === "indexing"
    ).length,
    failedDocuments: kbDocs.filter((d) => d.status === "failed").length,
    chunkCount: kbChunks.length,
    totalTokens: kbChunks.reduce((sum, c) => sum + c.tokenCount, 0),
    indexedChunks: kbChunks.filter((c) => c.embedding && c.embedding.length > 0)
      .length,
  }
}
