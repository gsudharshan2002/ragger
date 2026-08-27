import { getSettings, updateSettings, resetSettings } from '@/lib/services/settings'
import type { AppSettings } from '@/lib/types'

jest.mock('@/lib/services/storage', () => ({
  readJson: jest.fn(),
  writeJson: jest.fn(),
  getDataPath: jest.fn(),
}))

import { readJson, writeJson } from '@/lib/services/storage'

const mockSettings: AppSettings = {
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
  defaultStrategy: 'hybrid-rrf',
  systemPrompt: 'You are a helpful assistant.',
  rerankerModel: '',
  mmrLambda: 0.7,
}

describe('settings service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(readJson as jest.Mock).mockResolvedValue(null)
    ;(writeJson as jest.Mock).mockResolvedValue(undefined)
  })
  
  describe('getSettings', () => {
    it('should return default settings when no settings stored', async () => {
      const settings = await getSettings()
      
      expect(settings).toBeDefined()
      expect(settings.defaultStrategy).toBe('hybrid-rrf')
      expect(settings.chunkSize).toBe(512)
    })
    
    it('should return stored settings merged with defaults', async () => {
      const storedSettings = { chunkSize: 1024, defaultTopK: 10 }
      ;(readJson as jest.Mock).mockResolvedValue(storedSettings)
      
      const settings = await getSettings()
      
      expect(settings.chunkSize).toBe(1024)
      expect(settings.defaultTopK).toBe(10)
    })
  })
  
  describe('updateSettings', () => {
    it('should update settings and return merged result', async () => {
      const updates = { chunkSize: 2048, defaultTopK: 15 }
      ;(readJson as jest.Mock).mockResolvedValue({ defaultTopK: 5 })
      
      const result = await updateSettings(updates)
      
      expect(writeJson).toHaveBeenCalled()
      expect(result.chunkSize).toBe(2048)
      expect(result.defaultTopK).toBe(15)
    })
  })
  
  describe('resetSettings', () => {
    it('should reset settings to defaults', async () => {
      const result = await resetSettings()
      
      expect(writeJson).toHaveBeenCalled()
      expect(result.defaultStrategy).toBe('hybrid-rrf')
      expect(result.chunkSize).toBe(512)
    })
  })
})