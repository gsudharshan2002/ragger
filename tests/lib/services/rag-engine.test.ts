import { executeRagQuery, getDefaultRagConfig } from '@/lib/services/rag-engine'
import type { RagStrategy } from '@/lib/types'

jest.mock('@/lib/services/settings', () => ({
  getSettings: jest.fn().mockResolvedValue({
    embeddingModel: 'text-embedding-3-small',
    defaultTopK: 5,
    defaultStrategy: 'hybrid-rrf',
    chunkSize: 512,
    chunkOverlap: 64,
    groqModel: 'openai/gpt-oss-20b',
    systemPrompt: 'You are a helpful assistant.',
    rerankerModel: '',
    mmrLambda: 0.7,
  }),
}))

jest.mock('@/lib/services/document-service', () => ({
  getAllChunks: jest.fn().mockResolvedValue([]),
  getAllDocuments: jest.fn().mockResolvedValue([]),
}))

jest.mock('@/lib/services/embedding-service', () => ({
  isEmbeddingConfigured: jest.fn().mockResolvedValue(false),
  generateQueryEmbedding: jest.fn().mockResolvedValue(null),
}))

jest.mock('@/lib/services/vector-search', () => ({
  vectorSearch: jest.fn().mockReturnValue([]),
}))

jest.mock('@/lib/services/bm25', () => ({
  bm25Search: jest.fn().mockReturnValue([]),
}))

jest.mock('@/lib/services/rrf', () => ({
  rrfFusion: jest.fn().mockReturnValue([]),
}))

jest.mock('@/lib/services/reranker', () => ({
  rerankChunks: jest.fn().mockResolvedValue([]),
  isRerankerConfigured: jest.fn().mockReturnValue(false),
}))

jest.mock('@/lib/services/mmr', () => ({
  mmrSelection: jest.fn().mockReturnValue([]),
}))

jest.mock('@/lib/services/prompt-builder', () => ({
  buildPrompt: jest.fn().mockReturnValue({
    system: 'System prompt',
    context: 'Test context',
    user: 'Test query',
    systemTokens: 10,
    contextTokens: 50,
    userTokens: 3,
    totalTokens: 63,
  }),
}))

jest.mock('@/lib/services/groq-service', () => ({
  isGroqConfigured: jest.fn().mockResolvedValue(false),
  generateCompletionStream: jest.fn(),
}))

jest.mock('@/lib/services/trace-service', () => ({
  createTraceId: jest.fn().mockReturnValue('trace-test-1'),
  createRunId: jest.fn().mockReturnValue('run-test-1'),
  createTraceEvent: jest.fn().mockReturnValue({
    id: 'event-1',
    traceId: 'trace-test-1',
    runId: 'run-test-1',
    stage: 'query',
    event: 'query.started',
    timestamp: '2024-01-01T00:00:00Z',
    data: {},
  }),
  saveTrace: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('@/lib/utils', () => ({
  generateId: jest.fn().mockReturnValue('id-test-123'),
}))

describe('rag-engine', () => {
  describe('getDefaultRagConfig', () => {
    it('should return config with strategy', async () => {
      const strategy: RagStrategy = 'hybrid-rrf'
      const config = await getDefaultRagConfig(strategy)
      
      expect(config.strategy).toBe(strategy)
      expect(config.vector.embeddingModel).toBe('text-embedding-3-small')
      expect(config.vector.topK).toBe(5)
    })
    
    it('should return config for all strategies', async () => {
      const strategies: RagStrategy[] = [
        'vector',
        'bm25',
        'hybrid',
        'hybrid-rrf',
        'hybrid-rerank',
        'hybrid-rerank-mmr',
      ]
      
      for (const strategy of strategies) {
        const config = await getDefaultRagConfig(strategy)
        expect(config.strategy).toBe(strategy)
      }
    })
  })
  
  describe('executeRagQuery', () => {
    it('should return a trace object', async () => {
      const result = await executeRagQuery('test query', 'hybrid-rrf')
      
      expect(result).toBeDefined()
      expect(result.id).toBeDefined()
      expect(result.query).toBe('test query')
    })
  })
})