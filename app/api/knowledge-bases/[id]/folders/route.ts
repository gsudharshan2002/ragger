import { NextRequest } from "next/server"
import { readJson, writeJson, getDataPath } from "@/lib/services/storage"
import type { DocumentFolder } from "@/lib/types"
import { generateId } from "@/lib/utils"

const FOLDERS_PATH = getDataPath("document-folders.json")

export const dynamic = "force-dynamic"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const folders = (await readJson<DocumentFolder[]>(FOLDERS_PATH)) || []
    const kbFolders = folders.filter((f) => f.knowledgeBaseId === id)
    return Response.json({ success: true, data: kbFolders })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch folders"
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
    const body = await request.json()
    const { name, parentId } = body

    if (!name || typeof name !== "string") {
      return Response.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Name is required" } },
        { status: 400 }
      )
    }

    const folders = (await readJson<DocumentFolder[]>(FOLDERS_PATH)) || []
    const now = new Date().toISOString()

    const folder: DocumentFolder = {
      id: generateId(),
      knowledgeBaseId: id,
      name,
      parentId: parentId || null,
      createdAt: now,
      updatedAt: now,
    }

    folders.push(folder)
    await writeJson(FOLDERS_PATH, folders)

    return Response.json({ success: true, data: folder }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create folder"
    return Response.json(
      { success: false, error: { code: "CREATE_ERROR", message } },
      { status: 500 }
    )
  }
}
