import { NextRequest } from "next/server"
import fs from "fs/promises"
import path from "path"
import { getAllDocuments, createDocument, processDocument } from "@/lib/services/document-service"
import { getStoragePath } from "@/lib/services/storage"
import { generateId } from "@/lib/utils"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const documents = await getAllDocuments()
    return Response.json({ success: true, data: documents })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch documents"
    return Response.json(
      { success: false, error: { code: "FETCH_ERROR", message } },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return Response.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "No file provided" } },
        { status: 400 }
      )
    }

    const ext = path.extname(file.name) || ".bin"
    const uniqueFilename = `${generateId()}${ext}`
    const relativePath = `documents/${uniqueFilename}`
    const absolutePath = getStoragePath(relativePath)

    const dir = path.dirname(absolutePath)
    await fs.mkdir(dir, { recursive: true })

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    await fs.writeFile(absolutePath, buffer)

    const doc = await createDocument(file.name, file.type, file.size, relativePath)

    processDocument(doc.id).catch((err) => {
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
