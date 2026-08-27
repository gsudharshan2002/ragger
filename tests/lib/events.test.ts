import { RagEventBus, createEventBus, getStagesForStrategy, getStageColor, getStageLabel, getStagePulseClass } from '@/lib/events'

describe('events', () => {
  describe('RagEventBus', () => {
    it('should create an event bus', () => {
      const bus = createEventBus()
      expect(bus).toBeInstanceOf(RagEventBus)
    })
    
    it('should subscribe and emit events', async () => {
      const bus = createEventBus()
      const listener = jest.fn()
      
      bus.subscribe(listener)
      bus.emit({ type: 'test', timestamp: Date.now(), data: {} })
      
      await new Promise(resolve => setTimeout(resolve, 10))
      expect(listener).toHaveBeenCalledWith({
        type: 'test',
        timestamp: expect.any(Number),
        data: {},
      })
    })
    
    it('should unsubscribe correctly', async () => {
      const bus = createEventBus()
      const listener = jest.fn()
      
      const unsubscribe = bus.subscribe(listener)
      unsubscribe()
      bus.emit({ type: 'test', timestamp: Date.now(), data: {} })
      
      await new Promise(resolve => setTimeout(resolve, 10))
      expect(listener).not.toHaveBeenCalled()
    })
    
    it('should clear all listeners', () => {
      const bus = createEventBus()
      const listener1 = jest.fn()
      const listener2 = jest.fn()
      
      bus.subscribe(listener1)
      bus.subscribe(listener2)
      bus.clear()
      
      bus.emit({ type: 'test', timestamp: Date.now(), data: {} })
      
      expect(listener1).not.toHaveBeenCalled()
      expect(listener2).not.toHaveBeenCalled()
    })
  })
  
  describe('getStagesForStrategy', () => {
    it('should return correct stages for vector strategy', () => {
      const stages = getStagesForStrategy('vector')
      expect(stages).toContain('query')
      expect(stages).toContain('vector')
      expect(stages).toContain('context')
      expect(stages).toContain('prompt')
      expect(stages).toContain('llm')
    })
    
    it('should return correct stages for bm25 strategy', () => {
      const stages = getStagesForStrategy('bm25')
      expect(stages).toContain('query')
      expect(stages).toContain('bm25')
    })
    
    it('should return correct stages for hybrid strategy', () => {
      const stages = getStagesForStrategy('hybrid')
      expect(stages).toContain('vector')
      expect(stages).toContain('bm25')
    })
    
    it('should return correct stages for hybrid-rrf strategy', () => {
      const stages = getStagesForStrategy('hybrid-rrf')
      expect(stages).toContain('rrf')
    })
    
    it('should return correct stages for hybrid-rerank strategy', () => {
      const stages = getStagesForStrategy('hybrid-rerank')
      expect(stages).toContain('reranker')
    })
    
    it('should return correct stages for hybrid-rerank-mmr strategy', () => {
      const stages = getStagesForStrategy('hybrid-rerank-mmr')
      expect(stages).toContain('rrf')
      expect(stages).toContain('reranker')
      expect(stages).toContain('mmr')
    })
  })
  
  describe('getStageColor', () => {
    it('should return correct colors for stages', () => {
      expect(getStageColor('query')).toBe('#3b82f6')
      expect(getStageColor('vector')).toBe('#6366f1')
      expect(getStageColor('bm25')).toBe('#f59e0b')
      expect(getStageColor('rrf')).toBe('#8b5cf6')
      expect(getStageColor('reranker')).toBe('#a855f7')
      expect(getStageColor('mmr')).toBe('#ec4899')
      expect(getStageColor('context')).toBe('#10b981')
      expect(getStageColor('prompt')).toBe('#3b82f6')
      expect(getStageColor('llm')).toBe('#06b6d4')
    })
    
    it('should return default color for unknown stages', () => {
      expect(getStageColor('unknown')).toBe('#94a3b8')
    })
  })
  
  describe('getStageLabel', () => {
    it('should return correct labels for stages', () => {
      expect(getStageLabel('query')).toBe('Query Processing')
      expect(getStageLabel('vector')).toBe('Vector Search')
      expect(getStageLabel('bm25')).toBe('BM25')
      expect(getStageLabel('rrf')).toBe('Reciprocal Rank Fusion')
      expect(getStageLabel('reranker')).toBe('Cross-Encoder Reranking')
      expect(getStageLabel('mmr')).toBe('MMR Selection')
      expect(getStageLabel('context')).toBe('Context Building')
      expect(getStageLabel('prompt')).toBe('Prompt Construction')
      expect(getStageLabel('llm')).toBe('LLM Generation')
    })
    
    it('should return stage name for unknown stages', () => {
      expect(getStageLabel('unknown')).toBe('unknown')
    })
  })
  
  describe('getStagePulseClass', () => {
    it('should return correct pulse classes for stages', () => {
      expect(getStagePulseClass('vector')).toBe('animate-stage-pulse-vector')
      expect(getStagePulseClass('bm25')).toBe('animate-stage-pulse-bm25')
      expect(getStagePulseClass('rrf')).toBe('animate-stage-pulse-rrf')
      expect(getStagePulseClass('reranker')).toBe('animate-stage-pulse-reranker')
      expect(getStagePulseClass('mmr')).toBe('animate-stage-pulse-mmr')
      expect(getStagePulseClass('context')).toBe('animate-stage-pulse-context')
      expect(getStagePulseClass('prompt')).toBe('animate-stage-pulse-prompt')
      expect(getStagePulseClass('llm')).toBe('animate-stage-pulse-llm')
    })
    
    it('should return empty string for stages without pulse', () => {
      expect(getStagePulseClass('query')).toBe('')
    })
  })
})