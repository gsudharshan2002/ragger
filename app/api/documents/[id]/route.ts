import { NextRequest } from "next/server"
import { getDocument, deleteDocument } from "@/lib/services/document-service"

export const dynamic = "force-dynamic"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const document = await getDocument(id)

    if (!document) {
      return Response.json(
        { success: false, error: { code: "NOT_FOUND", message: "Document not found" } },
        { status: 404 }
      )
    }

    return Response.json({ success: true, data: document })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch document"
    return Response.json(
      { success: false, error: { code: "FETCH_ERROR", message } },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const deleted = await deleteDocument(id)

    if (!deleted) {
      return Response.json(
        { success: false, error: { code: "NOT_FOUND", message: "Document not found" } },
        { status: 404 }
      )
    }

    return Response.json({ success: true, data: { id } })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete document"
    return Response.json(
      { success: false, error: { code: "DELETE_ERROR", message } },
      { status: 500 }
    )
  }
}
