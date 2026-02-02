import { describe, it, expect, beforeEach } from 'vitest'
import {
  sanitizeText,
  sanitizeUrl,
  sanitizeFilename,
  sanitizeForDb,
} from '@/lib/utils/sanitize'
import { createRateLimiter } from '@/lib/utils/rateLimit'
import { getChangedFields as getChangedFieldsFromAudit } from '@/lib/utils/audit'

describe('Sanitization Utilities', () => {
  describe('sanitizeText', () => {
    it('escapes HTML entities', () => {
      expect(sanitizeText('<script>alert("xss")</script>')).toBe(
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
      )
    })

    it('escapes ampersands', () => {
      expect(sanitizeText('Tom & Jerry')).toBe('Tom &amp; Jerry')
    })

    it('escapes single quotes', () => {
      expect(sanitizeText("it's")).toBe('it&#39;s')
    })

    it('handles empty string', () => {
      expect(sanitizeText('')).toBe('')
    })

    it('handles string with no special characters', () => {
      expect(sanitizeText('Hello World')).toBe('Hello World')
    })
  })

  describe('sanitizeUrl', () => {
    it('allows https URLs', () => {
      expect(sanitizeUrl('https://example.com')).toBe('https://example.com/')
    })

    it('allows http URLs', () => {
      expect(sanitizeUrl('http://example.com')).toBe('http://example.com/')
    })

    it('blocks javascript: URLs', () => {
      expect(sanitizeUrl('javascript:alert(1)')).toBeNull()
    })

    it('blocks data: URLs', () => {
      expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBeNull()
    })

    it('blocks file: URLs', () => {
      expect(sanitizeUrl('file:///etc/passwd')).toBeNull()
    })

    it('returns null for invalid URLs', () => {
      expect(sanitizeUrl('not a url')).toBeNull()
    })
  })

  describe('sanitizeFilename', () => {
    it('removes path traversal sequences', () => {
      // .. sequences and slashes are stripped (not replaced)
      expect(sanitizeFilename('../../../etc/passwd')).toBe('etcpasswd')
    })

    it('removes slashes', () => {
      expect(sanitizeFilename('path/to/file.txt')).toBe('pathtofile.txt')
    })

    it('replaces spaces and special chars with dashes', () => {
      expect(sanitizeFilename('my file (1).pdf')).toBe('my-file-1-.pdf')
    })

    it('returns result with dots preserved', () => {
      // Single dots are valid in filenames
      expect(sanitizeFilename('...')).toBe('.')
    })

    it('preserves valid filenames', () => {
      expect(sanitizeFilename('document.pdf')).toBe('document.pdf')
    })
  })

  describe('sanitizeForDb', () => {
    it('removes null bytes', () => {
      expect(sanitizeForDb('hello\0world')).toBe('helloworld')
    })

    it('truncates long strings', () => {
      const longString = 'a'.repeat(15000)
      expect(sanitizeForDb(longString).length).toBe(10000)
    })

    it('preserves normal strings', () => {
      expect(sanitizeForDb('normal text')).toBe('normal text')
    })
  })
})

describe('Rate Limiting', () => {
  describe('createRateLimiter', () => {
    let limiter: ReturnType<typeof createRateLimiter>

    beforeEach(() => {
      limiter = createRateLimiter({ maxRequests: 3, windowMs: 1000 })
    })

    it('allows requests within limit', () => {
      expect(limiter.check('test-ip').success).toBe(true)
      expect(limiter.check('test-ip').success).toBe(true)
      expect(limiter.check('test-ip').success).toBe(true)
    })

    it('blocks requests over limit', () => {
      limiter.check('test-ip')
      limiter.check('test-ip')
      limiter.check('test-ip')
      expect(limiter.check('test-ip').success).toBe(false)
    })

    it('tracks remaining requests', () => {
      expect(limiter.check('test-ip').remaining).toBe(2)
      expect(limiter.check('test-ip').remaining).toBe(1)
      expect(limiter.check('test-ip').remaining).toBe(0)
    })

    it('tracks different identifiers separately', () => {
      limiter.check('ip-1')
      limiter.check('ip-1')
      limiter.check('ip-1')

      // ip-2 should still have full quota
      expect(limiter.check('ip-2').remaining).toBe(2)
    })

    it('reset clears limit for identifier', () => {
      limiter.check('test-ip')
      limiter.check('test-ip')
      limiter.check('test-ip')
      limiter.check('test-ip') // blocked

      limiter.reset('test-ip')
      expect(limiter.check('test-ip').success).toBe(true)
    })

    it('clear resets all limits', () => {
      limiter.check('ip-1')
      limiter.check('ip-1')
      limiter.check('ip-1')
      limiter.check('ip-2')
      limiter.check('ip-2')

      limiter.clear()

      expect(limiter.check('ip-1').remaining).toBe(2)
      expect(limiter.check('ip-2').remaining).toBe(2)
    })
  })
})

describe('Audit Utilities', () => {
  describe('getChangedFields', () => {
    it('detects changed fields', () => {
      const oldData = { name: 'old', status: 'planned' }
      const newData = { name: 'old', status: 'cast' }

      expect(getChangedFieldsFromAudit(oldData, newData)).toEqual(['status'])
    })

    it('detects multiple changed fields', () => {
      const oldData = { name: 'old', status: 'planned', width: 100 }
      const newData = { name: 'new', status: 'cast', width: 100 }

      const changed = getChangedFieldsFromAudit(oldData, newData)
      expect(changed).toContain('name')
      expect(changed).toContain('status')
      expect(changed).not.toContain('width')
    })

    it('detects added fields', () => {
      const oldData = { name: 'test' }
      const newData = { name: 'test', status: 'ready' }

      expect(getChangedFieldsFromAudit(oldData, newData)).toContain('status')
    })

    it('detects removed fields', () => {
      const oldData = { name: 'test', status: 'ready' }
      const newData = { name: 'test' }

      expect(getChangedFieldsFromAudit(oldData, newData)).toContain('status')
    })

    it('returns empty array when no changes', () => {
      const data = { name: 'test', status: 'ready' }

      expect(getChangedFieldsFromAudit(data, data)).toEqual([])
    })
  })
})
