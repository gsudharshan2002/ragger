import * as fs from 'fs/promises'
import * as path from 'path'
import { readJson, writeJson, getDataPath, getStoragePath } from '@/lib/services/storage'

jest.mock('fs/promises', () => ({
  access: jest.fn(),
  mkdir: jest.fn(),
  readFile: jest.fn(),
  writeFile: jest.fn(),
}))

describe('storage service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(fs.access as jest.Mock).mockResolvedValue(undefined)
    ;(fs.mkdir as jest.Mock).mockResolvedValue(undefined)
    ;(fs.readFile as jest.Mock).mockResolvedValue('{"test": "data"}')
    ;(fs.writeFile as jest.Mock).mockResolvedValue(undefined)
  })
  
  describe('getDataPath', () => {
    it('should return data path with filename', () => {
      const result = getDataPath('settings.json')
      expect(result).toContain('settings.json')
      expect(result).toContain('data')
    })
  })
  
  describe('getStoragePath', () => {
    it('should return storage path with subpath', () => {
      const result = getStoragePath('documents/test.json')
      expect(result).toContain('documents')
      expect(result).toContain('test.json')
    })
  })
  
  describe('readJson', () => {
    it('should read and parse JSON file', async () => {
      const result = await readJson<{ test: string }>('/test/path.json')
      
      expect(result).toEqual({ test: 'data' })
      expect(fs.readFile).toHaveBeenCalledWith('/test/path.json', 'utf-8')
    })
    
    it('should return null for missing files', async () => {
      ;(fs.readFile as jest.Mock).mockRejectedValue({ code: 'ENOENT' })
      
      const result = await readJson('/nonexistent.json')
      
      expect(result).toBeNull()
    })
    
    it('should throw for other errors', async () => {
      ;(fs.readFile as jest.Mock).mockRejectedValue(new Error('Read error'))
      
      await expect(readJson('/test.json')).rejects.toThrow('Read error')
    })
  })
  
  describe('writeJson', () => {
    it('should write JSON to file', async () => {
      await writeJson('/test/path.json', { key: 'value' })
      
      expect(fs.writeFile).toHaveBeenCalledWith(
        '/test/path.json',
        JSON.stringify({ key: 'value' }, null, 2),
        'utf-8'
      )
    })
  })
})