import { NextRequest } from "next/server"
import { getTrace, deleteTrace } from "@/lib/services/trace-service"

export const dynamic = "force-dynamic"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const trace = await getTrace(id)

    if (!trace) {
      return Response.json(
        { success: false, error: { code: "NOT_FOUND", message: "Trace not found" } },
        { status: 404 }
      )
    }

    return Response.json({ success: true, data: trace })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch trace"
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
    const deleted = await deleteTrace(id)

    if (!deleted) {
      return Response.json(
        { success: false, error: { code: "NOT_FOUND", message: "Trace not found" } },
        { status: 404 }
      )
    }

    return Response.json({ success: true, data: { id } })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete trace"
    return Response.json(
      { success: false, error: { code: "DELETE_ERROR", message } },
      { status: 500 }
    )
  }
}
