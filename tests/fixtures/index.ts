import { StoredChunk } from '@/lib/types'

export function createMockChunk(overrides: Partial<StoredChunk> = {}): StoredChunk {
  return {
    id: 'chunk-1',
    documentId: 'doc-1',
    documentName: 'Test Document',
    page: 1,
    section: 'Introduction',
    content: 'This is a test chunk content for testing purposes.',
    tokenCount: 15,
    startOffset: 0,
    endOffset: 100,
    ...overrides,
  }
}

export function createMockChunks(count: number = 5, overrides?: Partial<StoredChunk>): StoredChunk[] {
  return Array.from({ length: count }, (_, i) => 
    createMockChunk({
      id: `chunk-${i + 1}`,
      documentName: `Document ${i + 1}`,
      content: `This is chunk ${i + 1} content for testing.`,
      ...overrides,
    })
  )
}

export const mockSettings = {
  llmProvider: 'groq',
  groqModel: 'openai/gpt-oss-20b',
  groqApiKey: 'test-api-key',
  geminiApiKey: '',
  embeddingProvider: 'openai',
  embeddingModel: 'text-embedding-3-small',
  embeddingApiKey: 'test-embedding-key',
  chunkSize: 512,
  chunkOverlap: 64,
  defaultTopK: 5,
  defaultStrategy: 'hybrid-rrf' as const,
  systemPrompt: 'You are a helpful assistant.',
  rerankerModel: '',
  mmrLambda: 0.7,
}