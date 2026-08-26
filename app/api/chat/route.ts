import { NextRequest } from "next/server"
import { executeRag } from "@/lib/services/rag-engine"
import type { RagStrategy } from "@/lib/types"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { query, strategy, knowledgeBaseId } = body as { query: string; strategy?: RagStrategy; knowledgeBaseId?: string }

    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return Response.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Query is required and must be non-empty" } },
        { status: 400 }
      )
    }

    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of executeRag(query.trim(), strategy, undefined, knowledgeBaseId)) {
            if (event.type === "llm.token.generated") {
              const token = event.data.token as string
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "llm.token", content: token })}\n\n`)
              )
            } else {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
              )
            }
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"))
          controller.close()
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Stream processing failed"
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "error", message: errorMessage })}\n\n`)
          )
          controller.close()
        }
      },
    })

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    return Response.json(
      { success: false, error: { code: "INTERNAL_ERROR", message } },
      { status: 500 }
    )
  }
}
