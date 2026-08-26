import fs from "fs/promises"
import path from "path"
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdf = require("pdf-parse/lib/pdf-parse.js") as (dataBuffer: Buffer, options?: Record<string, unknown>) => Promise<{ numpages: number; text: string }>
import type { PageContent } from "@/lib/types"

export async function extractTextFromPDF(
  filePath: string
): Promise<{ pages: PageContent[]; fullText: string; pageCount: number }> {
  const buffer = await fs.readFile(filePath)
  const data = await pdf(buffer)

  const pages: PageContent[] = []
  let fullText = ""

  for (let i = 1; i <= data.numpages; i++) {
    const text = data.text || ""
    const pageText = text

    pages.push({
      documentId: "",
      pageNumber: i,
      text: pageText,
    })

    fullText += pageText + "\n"
  }

  return {
    pages,
    fullText: fullText.trim(),
    pageCount: data.numpages,
  }
}

export async function extractTextFromTXT(
  filePath: string
): Promise<{ pages: PageContent[]; fullText: string; pageCount: number }> {
  const content = await fs.readFile(filePath, "utf-8")
  const fullText = content.trim()

  const paragraphs = content.split(/\n\s*\n/)
  const pages: PageContent[] = []

  if (fullText.length < 2000 && paragraphs.length <= 3) {
    pages.push({
      documentId: "",
      pageNumber: 1,
      text: fullText,
    })
  } else {
    let currentPage = 1
    let currentText = ""

    for (const paragraph of paragraphs) {
      if (currentText.length + paragraph.length > 2000 && currentText.length > 0) {
        pages.push({
          documentId: "",
          pageNumber: currentPage,
          text: currentText.trim(),
        })
        currentPage++
        currentText = paragraph + "\n\n"
      } else {
        currentText += paragraph + "\n\n"
      }
    }

    if (currentText.trim()) {
      pages.push({
        documentId: "",
        pageNumber: currentPage,
        text: currentText.trim(),
      })
    }
  }

  return {
    pages,
    fullText,
    pageCount: pages.length,
  }
}

export async function extractTextFromMarkdown(
  filePath: string
): Promise<{ pages: PageContent[]; fullText: string; pageCount: number }> {
  const content = await fs.readFile(filePath, "utf-8")
  const fullText = content.trim()

  const pages: PageContent[] = [
    {
      documentId: "",
      pageNumber: 1,
      text: fullText,
    },
  ]

  return {
    pages,
    fullText,
    pageCount: 1,
  }
}

export async function extractText(
  filePath: string,
  mimeType: string
): Promise<{ pages: PageContent[]; fullText: string; pageCount: number }> {
  if (mimeType === "application/pdf") {
    return extractTextFromPDF(filePath)
  }

  if (mimeType === "text/plain") {
    return extractTextFromTXT(filePath)
  }

  if (mimeType === "text/markdown" || mimeType === "text/x-markdown") {
    return extractTextFromMarkdown(filePath)
  }

  const ext = path.extname(filePath).toLowerCase()

  if (ext === ".pdf") {
    return extractTextFromPDF(filePath)
  }

  if (ext === ".txt") {
    return extractTextFromTXT(filePath)
  }

  if (ext === ".md" || ext === ".markdown") {
    return extractTextFromMarkdown(filePath)
  }

  throw new Error(`Unsupported file type: ${mimeType} (${ext})`)
}
