import type { StoredChunk, PageContent, DocumentMetadata } from "@/lib/types"
import { generateId } from "@/lib/utils"

function countTokens(text: string): number {
  if (!text.trim()) return 0
  return text.split(/\s+/).filter((t) => t.length > 0).length
}

export function chunkPages(
  pages: PageContent[],
  doc: DocumentMetadata,
  chunkSize: number,
  chunkOverlap: number
): StoredChunk[] {
  const chunks: StoredChunk[] = []

  for (const page of pages) {
    const text = page.text || ""
    const totalTokens = countTokens(text)

    if (totalTokens === 0) continue

    if (totalTokens <= chunkSize) {
      chunks.push({
        id: `chunk_${generateId()}`,
        documentId: doc.id,
        documentName: doc.name,
        page: page.pageNumber,
        section: page.section,
        content: text,
        tokenCount: totalTokens,
        startOffset: 0,
        endOffset: text.length,
      })
      continue
    }

    const words = text.split(/(\s+)/)
    const tokens: string[] = []
    for (const w of words) {
      if (w.trim().length > 0) {
        tokens.push(w)
      }
    }

    const step = chunkSize - chunkOverlap
    if (step <= 0) {
      let pos = 0
      let localChunkIndex = 0
      while (pos < tokens.length) {
        const end = Math.min(pos + chunkSize, tokens.length)
        const tokenSlice = tokens.slice(pos, end)
        const content = tokenSlice.join("")
        const tokenCount = tokenSlice.length

        const charStart = computeCharOffset(text, tokens, pos)
        const charEnd = computeCharOffset(text, tokens, end)
        const isOnlyChunk = localChunkIndex === 0 && end >= tokens.length

        if (tokenCount >= 20 || isOnlyChunk) {
          chunks.push({
            id: `chunk_${generateId()}`,
            documentId: doc.id,
            documentName: doc.name,
            page: page.pageNumber,
            section: page.section,
            content,
            tokenCount,
            startOffset: charStart,
            endOffset: charEnd,
          })
        }

        localChunkIndex++
        pos = end
      }
      continue
    }

    let position = 0
    let chunkIndex = 0

    while (position < tokens.length) {
      const end = Math.min(position + chunkSize, tokens.length)
      const tokenSlice = tokens.slice(position, end)
      const content = tokenSlice.join("")
      const tokenCount = tokenSlice.length

      const charStart = computeCharOffset(text, tokens, position)
      const charEnd = computeCharOffset(text, tokens, end)

      const isOnlyChunkFromPage = chunkIndex === 0 && end >= tokens.length

      if (tokenCount >= 20 || isOnlyChunkFromPage) {
        chunks.push({
          id: `chunk_${generateId()}`,
          documentId: doc.id,
          documentName: doc.name,
          page: page.pageNumber,
          section: page.section,
          content,
          tokenCount,
          startOffset: charStart,
          endOffset: charEnd,
        })
      }

      chunkIndex++
      position += step

      if (end >= tokens.length) break
    }
  }

  return chunks
}

function computeCharOffset(text: string, tokens: string[], tokenIndex: number): number {
  if (tokenIndex === 0) return 0
  if (tokenIndex >= tokens.length) return text.length

  let searchFrom = 0
  for (let i = 0; i < tokenIndex && i < tokens.length; i++) {
    const idx = text.indexOf(tokens[i], searchFrom)
    if (idx >= 0) {
      searchFrom = idx + tokens[i].length
    } else {
      searchFrom += tokens[i].length
    }
  }

  return searchFrom
}
