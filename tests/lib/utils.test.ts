import { generateId, formatDuration, formatNumber, copyToClipboard } from '@/lib/utils'

describe('utils', () => {
  describe('generateId', () => {
    it('should generate a unique id', () => {
      const id1 = generateId()
      const id2 = generateId()
      
      expect(id1).toBeDefined()
      expect(typeof id1).toBe('string')
      expect(id1.length).toBeGreaterThan(0)
      expect(id1).not.toBe(id2)
    })
    
    it('should generate id of expected length', () => {
      const id = generateId()
      expect(id.length).toBeGreaterThanOrEqual(20)
    })
  })
  
  describe('formatDuration', () => {
    it('should format milliseconds correctly', () => {
      expect(formatDuration(500)).toBe('500ms')
      expect(formatDuration(999)).toBe('999ms')
    })
    
    it('should format seconds correctly', () => {
      expect(formatDuration(1000)).toBe('1.00s')
      expect(formatDuration(1500)).toBe('1.50s')
      expect(formatDuration(60000)).toBe('60.00s')
    })
  })
  
  describe('formatNumber', () => {
    it('should format numbers with locale separators', () => {
      expect(formatNumber(1000)).toBe('1,000')
      expect(formatNumber(1000000)).toBe('1,000,000')
      expect(formatNumber(0)).toBe('0')
    })
  })
  
  describe('copyToClipboard', () => {
    it('should be a function', () => {
      expect(typeof copyToClipboard).toBe('function')
    })
    
    it('should return a promise', async () => {
      global.navigator.clipboard = {
        writeText: jest.fn().mockResolvedValue(undefined),
      } as Clipboard
      
      const result = copyToClipboard('test')
      
      expect(result).toBeInstanceOf(Promise)
    })
  })
})