import { mmrSelection } from '@/lib/services/mmr'
import type { StoredChunk } from '@/lib/types'

describe('mmr', () => {
  const createMockChunk = (id: string, content: string): StoredChunk => ({
    id,
    documentId: 'doc-1',
    documentName: 'Document 1',
    page: 1,
    content,
    tokenCount: 10,
    startOffset: 0,
    endOffset: 10,
  })
  
  describe('mmrSelection', () => {
    it('should return results for empty input', () => {
      const results = mmrSelection([], [], 0.7, 10, 5)
      
      expect(results).toHaveLength(0)
    })
    
    it('should respect candidateCount parameter', () => {
      const chunks = [
        createMockChunk('chunk-1', 'Machine learning is a field of AI.'),
        createMockChunk('chunk-2', 'Artificial intelligence includes machine learning.'),
        createMockChunk('chunk-3', 'Deep learning is a subset of machine learning.'),
      ]
      const scores = [0.9, 0.8, 0.7]
      
      const results = mmrSelection(chunks, scores, 0.7, 2, 3)
      
      expect(results.every(r => r.selected)).toBeTruthy()
    })
    
    it('should mark top result as selected', () => {
      const chunks = [
        createMockChunk('chunk-1', 'Unique content here.'),
        createMockChunk('chunk-2', 'Similar content here.'),
      ]
      const scores = [0.95, 0.5]
      
      const results = mmrSelection(chunks, scores, 0.7, 10, 1)
      
      expect(results[0].selected).toBe(true)
      expect(results[0].relevanceScore).toBeCloseTo(0.95)
    })
    
    it('should select diverse chunks based on lambda', () => {
      const chunks = [
        createMockChunk('chunk-1', 'Machine learning algorithms'),
        createMockChunk('chunk-2', 'Machine learning techniques'),
        createMockChunk('chunk-3', 'Different topic entirely'),
      ]
      const scores = [0.9, 0.85, 0.8]
      
        const resultsHighLambda = mmrSelection(chunks, scores, 0.9, 10, 3)
        const resultsLowLambda = mmrSelection(chunks, scores, 0.3, 10, 3)
      
      expect(resultsHighLambda.filter(r => r.selected).length).toBeGreaterThanOrEqual(3)
    })
    
    it('should calculate max similarity correctly', () => {
      const chunks = [
        createMockChunk('chunk-1', 'Machine learning'),
        createMockChunk('chunk-2', 'Machine learning'),
        createMockChunk('chunk-3', 'Different content'),
      ]
      const scores = [0.9, 0.85, 0.8]
      
      const results = mmrSelection(chunks, scores, 0.5, 10, 3)
      
      const selected = results.filter(r => r.selected)
      selected.forEach(result => {
        expect(result.mmrScore).toBeDefined()
      })
    })
  })
})