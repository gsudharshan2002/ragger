import { NextRequest } from "next/server"
import { getAllKnowledgeBases, createKnowledgeBase } from "@/lib/services/knowledge-base-service"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const kbs = await getAllKnowledgeBases()
    return Response.json({ success: true, data: kbs })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch knowledge bases"
    return Response.json(
      { success: false, error: { code: "FETCH_ERROR", message } },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, tags, settings } = body

    if (!name || typeof name !== "string") {
      return Response.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Name is required" } },
        { status: 400 }
      )
    }

    const kb = await createKnowledgeBase(name, description || "", tags || [], settings)
    return Response.json({ success: true, data: kb }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create knowledge base"
    return Response.json(
      { success: false, error: { code: "CREATE_ERROR", message } },
      { status: 500 }
    )
  }
}
