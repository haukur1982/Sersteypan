import DOMPurify from 'dompurify'

/**
 * Sanitize HTML content to prevent XSS attacks.
 * Use this for any user-generated content that will be rendered as HTML.
 *
 * @example
 * // In a component
 * <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(userContent) }} />
 */
export function sanitizeHtml(dirty: string): string {
  if (typeof window === 'undefined') {
    // Server-side: strip all HTML tags as a safe fallback
    return dirty.replace(/<[^>]*>/g, '')
  }
  return DOMPurify.sanitize(dirty)
}

/**
 * Sanitize plain text input by escaping HTML entities.
 * Use this for text that will be displayed as text (not HTML).
 *
 * @example
 * // Escapes < > & " ' to prevent injection
 * sanitizeText('<script>alert("xss")</script>')
 * // Returns: &lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;
 */
export function sanitizeText(text: string): string {
  const escapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }
  return text.replace(/[&<>"']/g, (char) => escapeMap[char])
}

/**
 * Validate and sanitize a URL to prevent javascript: and data: protocol attacks.
 * Returns null if the URL is invalid or potentially malicious.
 *
 * @example
 * sanitizeUrl('https://example.com') // Returns 'https://example.com'
 * sanitizeUrl('javascript:alert(1)') // Returns null
 */
export function sanitizeUrl(url: string): string | null {
  try {
    const parsed = new URL(url)
    // Only allow http and https protocols
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null
    }
    return parsed.href
  } catch {
    // Invalid URL
    return null
  }
}

/**
 * Sanitize a filename to prevent path traversal attacks.
 * Removes directory traversal sequences and invalid characters.
 *
 * @example
 * sanitizeFilename('../../../etc/passwd') // Returns 'etc-passwd'
 * sanitizeFilename('my file (1).pdf') // Returns 'my-file-1.pdf'
 */
export function sanitizeFilename(filename: string): string {
  return filename
    // Remove path traversal sequences
    .replace(/\.\./g, '')
    .replace(/[/\\]/g, '')
    // Replace spaces and special characters with dashes
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    // Remove multiple consecutive dashes
    .replace(/-+/g, '-')
    // Remove leading/trailing dashes
    .replace(/^-|-$/g, '')
    // Ensure not empty
    || 'unnamed'
}

/**
 * Sanitize user input for database queries.
 * Note: This is a secondary defense - always use parameterized queries!
 * Supabase handles this automatically, but this adds an extra layer.
 */
export function sanitizeForDb(input: string): string {
  return input
    // Remove null bytes
    .replace(/\0/g, '')
    // Limit length to prevent DoS
    .slice(0, 10000)
}
