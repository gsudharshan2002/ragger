import type { RagStrategy } from '@/lib/types'
import { RAG_STRATEGIES } from '@/lib/types'

describe('types', () => {
  describe('RagStrategy', () => {
    it('should have all required strategies', () => {
      const strategies: RagStrategy[] = [
        'vector',
        'bm25',
        'hybrid',
        'hybrid-rrf',
        'hybrid-rerank',
        'hybrid-rerank-mmr',
      ]
      
      expect(RAG_STRATEGIES).toHaveLength(6)
      
      strategies.forEach(strategy => {
        const found = RAG_STRATEGIES.find(s => s.value === strategy)
        expect(found).toBeDefined()
        expect(found?.stages).toBeDefined()
        expect(found?.stages.length).toBeGreaterThan(0)
      })
    })
    
    it('should have correct stages for each strategy', () => {
      const strategyStages: Record<RagStrategy, string[]> = {
        'vector': ['query', 'vector', 'context', 'prompt', 'llm'],
        'bm25': ['query', 'bm25', 'context', 'prompt', 'llm'],
        'hybrid': ['query', 'vector', 'bm25', 'context', 'prompt', 'llm'],
        'hybrid-rrf': ['query', 'vector', 'bm25', 'rrf', 'context', 'prompt', 'llm'],
        'hybrid-rerank': ['query', 'vector', 'bm25', 'reranker', 'context', 'prompt', 'llm'],
        'hybrid-rerank-mmr': ['query', 'vector', 'bm25', 'rrf', 'reranker', 'mmr', 'context', 'prompt', 'llm'],
      }
      
      RAG_STRATEGIES.forEach(({ value, stages }) => {
        expect(stages).toEqual(strategyStages[value])
      })
    })
  })
})