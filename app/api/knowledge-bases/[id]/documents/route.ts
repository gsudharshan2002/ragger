import { NextRequest } from "next/server"
import fs from "fs/promises"
import path from "path"
import { getAllDocuments, createDocument, processDocument } from "@/lib/services/document-service"
import { getKnowledgeBase } from "@/lib/services/knowledge-base-service"
import { startProcessingEvent } from "@/lib/services/processing-history-service"
import { createVersion } from "@/lib/services/document-version-service"
import { getStoragePath, readJson, writeJson, getDataPath } from "@/lib/services/storage"
import { generateId } from "@/lib/utils"
import type { DocumentMetadata } from "@/lib/types"

const DOCUMENTS_PATH = getDataPath("documents.json")

export const dynamic = "force-dynamic"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const docs = await getAllDocuments()
    const kbDocs = docs.filter(
      (d) => "knowledgeBaseId" in d && (d as { knowledgeBaseId?: string }).knowledgeBaseId === id
    )
    return Response.json({ success: true, data: kbDocs })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch documents"
    return Response.json(
      { success: false, error: { code: "FETCH_ERROR", message } },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const kb = await getKnowledgeBase(id)

    if (!kb) {
      return Response.json(
        { success: false, error: { code: "NOT_FOUND", message: "Knowledge base not found" } },
        { status: 404 }
      )
    }

    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const folderId = formData.get("folderId") as string | null

    if (!file) {
      return Response.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "No file provided" } },
        { status: 400 }
      )
    }

    const ext = path.extname(file.name) || ".bin"
    const uniqueFilename = `${generateId()}${ext}`
    const relativePath = `documents/kb-${id}/${uniqueFilename}`
    const absolutePath = getStoragePath(relativePath)

    const dir = path.dirname(absolutePath)
    await fs.mkdir(dir, { recursive: true })

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    await fs.writeFile(absolutePath, buffer)

    const doc = await createDocument(file.name, file.type, file.size, relativePath)

    const allDocs = await readJson<DocumentMetadata[]>(DOCUMENTS_PATH)
    if (allDocs) {
      const idx = allDocs.findIndex((d) => d.id === doc.id)
      if (idx !== -1) {
        const patched = {
          ...allDocs[idx],
          knowledgeBaseId: id,
          ...(folderId ? { folderId } : {}),
        } as DocumentMetadata & { knowledgeBaseId: string; folderId?: string }
        allDocs[idx] = patched
        await writeJson(DOCUMENTS_PATH, allDocs)
      }
    }

    await createVersion(doc.id, relativePath, file.size)

    const event = await startProcessingEvent(doc.id, "upload", { fileName: file.name }, id)

    processDocument(doc.id)
      .then(() => {
        console.log(`Document ${doc.id} processing completed`)
      })
      .catch((err) => {
        console.error(`Background processing failed for document ${doc.id}:`, err)
      })

    return Response.json({ success: true, data: doc }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to upload document"
    return Response.json(
      { success: false, error: { code: "UPLOAD_ERROR", message } },
      { status: 500 }
    )
  }
}
