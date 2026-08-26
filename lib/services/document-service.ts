import type {
  DocumentMetadata,
  DocumentProcessingStatus,
  PageContent,
  StoredChunk,
} from "@/lib/types"
import { generateId } from "@/lib/utils"
import {
  readJson,
  writeJson,
  findById,
  getDataPath,
  getStoragePath,
} from "./storage"
import { extractText } from "./text-extractor"
import { chunkPages } from "./chunking"
import { getSettings } from "./settings"

const DOCUMENTS_PATH = getDataPath("documents.json")
const CHUNKS_PATH = getDataPath("chunks.json")

export async function getAllDocuments(): Promise<DocumentMetadata[]> {
  const docs = await readJson<DocumentMetadata[]>(DOCUMENTS_PATH)
  return docs || []
}

export async function getDocument(
  id: string
): Promise<DocumentMetadata | null> {
  return findById<DocumentMetadata>(DOCUMENTS_PATH, id)
}

export async function createDocument(
  name: string,
  mimeType: string,
  size: number,
  relativePath: string
): Promise<DocumentMetadata> {
  const docs = await getAllDocuments()

  const doc: DocumentMetadata = {
    id: generateId(),
    name,
    path: relativePath,
    mimeType,
    size,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    pageCount: 0,
    chunkCount: 0,
    tokenCount: 0,
    status: "uploaded",
  }

  docs.push(doc)
  await writeJson(DOCUMENTS_PATH, docs)

  return doc
}

export async function updateDocumentStatus(
  id: string,
  status: DocumentProcessingStatus,
  error?: string
): Promise<void> {
  const docs = await getAllDocuments()
  const idx = docs.findIndex((d) => d.id === id)

  if (idx === -1) {
    throw new Error(`Document not found: ${id}`)
  }

  docs[idx] = {
    ...docs[idx],
    status,
    updatedAt: new Date().toISOString(),
    ...(error !== undefined ? { error } : {}),
  }

  await writeJson(DOCUMENTS_PATH, docs)
}

export async function processDocument(docId: string): Promise<void> {
  const doc = await getDocument(docId)
  if (!doc) {
    throw new Error(`Document not found: ${docId}`)
  }

  try {
    await updateDocumentStatus(docId, "processing")

    await updateDocumentStatus(docId, "parsing")
    const filePath = getStoragePath(doc.path)
    const extracted = await extractText(filePath, doc.mimeType)

    const docPages: PageContent[] = extracted.pages.map((page) => ({
      ...page,
      documentId: docId,
    }))

    const docs = await getAllDocuments()
    const docIdx = docs.findIndex((d) => d.id === docId)
    if (docIdx !== -1) {
      docs[docIdx] = {
        ...docs[docIdx],
        pageCount: extracted.pageCount,
        updatedAt: new Date().toISOString(),
      }
      await writeJson(DOCUMENTS_PATH, docs)
    }

    await updateDocumentStatus(docId, "chunking")
    const settings = await getSettings()
    const chunks: StoredChunk[] = chunkPages(docPages, doc, settings.chunkSize, settings.chunkOverlap)

    let embeddedChunks: StoredChunk[] = chunks
    await updateDocumentStatus(docId, "embedding")

    try {
      const { generateEmbeddings } = await import("./embedding-service")
      embeddedChunks = await generateEmbeddings(chunks)
    } catch (embeddingError) {
      console.warn(
        `Embedding generation skipped for document ${docId}:`,
        embeddingError instanceof Error
          ? embeddingError.message
          : embeddingError
      )
      embeddedChunks = chunks
    }

    await updateDocumentStatus(docId, "indexing")

    const existingChunks = await readJson<StoredChunk[]>(CHUNKS_PATH)
    const allChunks = existingChunks || []
    const filteredChunks = allChunks.filter((c) => c.documentId !== docId)
    filteredChunks.push(...embeddedChunks)
    await writeJson(CHUNKS_PATH, filteredChunks)

    const totalTokens = embeddedChunks.reduce(
      (sum, chunk) => sum + chunk.tokenCount,
      0
    )

    const finalDocs = await getAllDocuments()
    const finalIdx = finalDocs.findIndex((d) => d.id === docId)
    if (finalIdx !== -1) {
      finalDocs[finalIdx] = {
        ...finalDocs[finalIdx],
        status: "ready",
        chunkCount: embeddedChunks.length,
        tokenCount: totalTokens,
        pageCount: extracted.pageCount,
        updatedAt: new Date().toISOString(),
        error: undefined,
      }
      await writeJson(DOCUMENTS_PATH, finalDocs)
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error"
    console.error(`Document processing failed for ${docId}:`, error)
    await updateDocumentStatus(docId, "failed", errorMessage)
  }
}

export async function deleteDocument(docId: string): Promise<boolean> {
  const docs = await getAllDocuments()
  const filtered = docs.filter((d) => d.id !== docId)

  if (filtered.length === docs.length) {
    return false
  }

  await writeJson(DOCUMENTS_PATH, filtered)

  const chunks = await readJson<StoredChunk[]>(CHUNKS_PATH)
  if (chunks) {
    const filteredChunks = chunks.filter((c) => c.documentId !== docId)
    await writeJson(CHUNKS_PATH, filteredChunks)
  }

  return true
}

export async function getDocumentChunks(
  docId: string
): Promise<StoredChunk[]> {
  const allChunks = await readJson<StoredChunk[]>(CHUNKS_PATH)
  if (!allChunks) return []
  return allChunks.filter((chunk) => chunk.documentId === docId)
}

export async function getAllChunks(): Promise<StoredChunk[]> {
  const chunks = await readJson<StoredChunk[]>(CHUNKS_PATH)
  return chunks || []
}
