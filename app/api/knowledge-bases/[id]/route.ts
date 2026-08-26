import { NextRequest } from "next/server"
import {
  getKnowledgeBase,
  updateKnowledgeBase,
  deleteKnowledgeBase,
  getKnowledgeBaseStats,
} from "@/lib/services/knowledge-base-service"

export const dynamic = "force-dynamic"

export async function GET(
  _request: NextRequest,
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

    const stats = await getKnowledgeBaseStats(id)
    return Response.json({ success: true, data: { ...kb, stats } })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch knowledge base"
    return Response.json(
      { success: false, error: { code: "FETCH_ERROR", message } },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const updated = await updateKnowledgeBase(id, body)

    if (!updated) {
      return Response.json(
        { success: false, error: { code: "NOT_FOUND", message: "Knowledge base not found" } },
        { status: 404 }
      )
    }

    return Response.json({ success: true, data: updated })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update knowledge base"
    return Response.json(
      { success: false, error: { code: "UPDATE_ERROR", message } },
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
    const deleted = await deleteKnowledgeBase(id)

    if (!deleted) {
      return Response.json(
        { success: false, error: { code: "NOT_FOUND", message: "Knowledge base not found" } },
        { status: 404 }
      )
    }

    return Response.json({ success: true, data: { id } })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete knowledge base"
    return Response.json(
      { success: false, error: { code: "DELETE_ERROR", message } },
      { status: 500 }
    )
  }
}
