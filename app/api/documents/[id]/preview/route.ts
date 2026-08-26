import { NextRequest } from "next/server"
import { getDocument } from "@/lib/services/document-service"
import { getStoragePath } from "@/lib/services/storage"
import fs from "fs/promises"
import path from "path"

export const dynamic = "force-dynamic"

const STORAGE_ROOT = path.join(process.cwd(), "storage")

function getFileMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  const mimeTypes: Record<string, string> = {
    ".pdf": "application/pdf",
    ".txt": "text/plain",
    ".md": "text/markdown",
    ".html": "text/html",
    ".htm": "text/html",
    ".csv": "text/csv",
    ".json": "application/json",
    ".xml": "application/xml",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xls": "application/vnd.ms-excel",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".ppt": "application/vnd.ms-powerpoint",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
  }
  return mimeTypes[ext] || "application/octet-stream"
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const doc = await getDocument(id)

    if (!doc) {
      return Response.json(
        { success: false, error: { code: "NOT_FOUND", message: "Document not found" } },
        { status: 404 }
      )
    }

    const filePath = getStoragePath(doc.path)
    const resolvedPath = path.resolve(filePath)

    if (!resolvedPath.startsWith(STORAGE_ROOT)) {
      return Response.json(
        { success: false, error: { code: "FORBIDDEN", message: "Access denied" } },
        { status: 403 }
      )
    }

    const stat = await fs.stat(resolvedPath)
    const fileSize = stat.size
    const mimeType = doc.mimeType || getFileMimeType(resolvedPath)
    const range = request.headers.get("range")

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-")
      const start = parseInt(parts[0], 10)
      const end = parts[1] ? parseInt(parts[1], 10) : Math.min(start + 1024 * 1024 - 1, fileSize - 1)

      if (start >= fileSize || end >= fileSize || start > end) {
        return new Response(null, {
          status: 416,
          headers: {
            "Content-Range": `bytes */${fileSize}`,
          },
        })
      }

      const chunkSize = end - start + 1
      const fileHandle = await fs.open(resolvedPath, "r")
      const buffer = Buffer.alloc(chunkSize)
      await fileHandle.read(buffer, 0, chunkSize, start)
      await fileHandle.close()

      return new Response(buffer, {
        status: 206,
        headers: {
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": String(chunkSize),
          "Content-Type": mimeType,
        },
      })
    }

    const fileBuffer = await fs.readFile(resolvedPath)

    return new Response(fileBuffer, {
      headers: {
        "Content-Type": mimeType,
        "Content-Length": String(fileSize),
        "Accept-Ranges": "bytes",
      },
    })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return Response.json(
        { success: false, error: { code: "NOT_FOUND", message: "File not found on disk" } },
        { status: 404 }
      )
    }
    const message = error instanceof Error ? error.message : "Failed to read document"
    return Response.json(
      { success: false, error: { code: "READ_ERROR", message } },
      { status: 500 }
    )
  }
}
