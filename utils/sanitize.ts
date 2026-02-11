/**
 * Input Sanitization Utilities
 * Prevents XSS attacks, script injection, and malicious content
 */

// HTML entities to encode
const HTML_ENTITIES: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;',
}

/**
 * Escape HTML special characters to prevent XSS
 */
export function escapeHtml(str: string): string {
    if (typeof str !== 'string') return ''
    return str.replace(/[&<>"'`=/]/g, (char) => HTML_ENTITIES[char] || char)
}

/**
 * Remove all HTML tags from a string
 */
export function stripHtml(str: string): string {
    if (typeof str !== 'string') return ''
    return str.replace(/<[^>]*>/g, '')
}

/**
 * Remove script tags and their content
 */
export function removeScripts(str: string): string {
    if (typeof str !== 'string') return ''
    // Remove script tags and content
    let result = str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove event handlers
    result = result.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')
    // Remove javascript: URLs
    result = result.replace(/javascript:/gi, '')
    // Remove data: URLs that could contain scripts
    result = result.replace(/data:[^,]*base64[^"']*/gi, '')
    return result
}

/**
 * Sanitize a string for safe display (removes scripts, keeps safe HTML)
 */
export function sanitizeHtml(str: string): string {
    if (typeof str !== 'string') return ''

    let result = removeScripts(str)

    // Remove dangerous tags
    const dangerousTags = [
        'script', 'iframe', 'object', 'embed', 'form', 'input',
        'button', 'textarea', 'select', 'style', 'link', 'meta',
        'base', 'applet', 'frame', 'frameset', 'layer', 'ilayer',
        'bgsound', 'xml', 'xss'
    ]

    dangerousTags.forEach(tag => {
        const regex = new RegExp(`<${tag}[^>]*>.*?</${tag}>|<${tag}[^>]*/>|<${tag}[^>]*>`, 'gi')
        result = result.replace(regex, '')
    })

    return result
}

/**
 * Sanitize plain text input (for text fields, removes all HTML)
 */
export function sanitizeText(str: string): string {
    if (typeof str !== 'string') return ''
    return stripHtml(str).trim()
}

/**
 * Sanitize email address
 */
export function sanitizeEmail(email: string): string {
    if (typeof email !== 'string') return ''
    // Remove any HTML/scripts first
    const cleaned = stripHtml(email).trim().toLowerCase()
    // Basic email pattern validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(cleaned) ? cleaned : ''
}

/**
 * Sanitize URL
 */
export function sanitizeUrl(url: string): string {
    if (typeof url !== 'string') return ''

    const cleaned = stripHtml(url).trim()

    // Check for dangerous protocols
    const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:']
    const lowerUrl = cleaned.toLowerCase()

    for (const protocol of dangerousProtocols) {
        if (lowerUrl.startsWith(protocol)) {
            return ''
        }
    }

    // Only allow http, https, or relative URLs
    if (cleaned.startsWith('http://') || cleaned.startsWith('https://') || cleaned.startsWith('/')) {
        return cleaned
    }

    // If no protocol, assume https
    if (cleaned && !cleaned.includes('://')) {
        return `https://${cleaned}`
    }

    return ''
}

/**
 * Sanitize a filename (remove path traversal, special chars)
 */
export function sanitizeFilename(filename: string): string {
    if (typeof filename !== 'string') return ''

    return filename
        // Remove path traversal
        .replace(/\.\./g, '')
        // Remove slashes
        .replace(/[/\\]/g, '')
        // Remove null bytes
        .replace(/\0/g, '')
        // Remove special characters (keep alphanumeric, dash, underscore, dot)
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        // Remove multiple dots
        .replace(/\.+/g, '.')
        // Remove leading/trailing dots and spaces
        .replace(/^[.\s]+|[.\s]+$/g, '')
        .trim()
}

/**
 * Sanitize JSON input - deep clean all string values
 */
export function sanitizeJson<T extends Record<string, unknown>>(obj: T): T {
    if (typeof obj !== 'object' || obj === null) {
        return obj
    }

    if (Array.isArray(obj)) {
        return obj.map(item => {
            if (typeof item === 'string') {
                return sanitizeText(item)
            } else if (typeof item === 'object' && item !== null) {
                return sanitizeJson(item as Record<string, unknown>)
            }
            return item
        }) as unknown as T
    }

    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj)) {
        const sanitizedKey = sanitizeText(key)
        if (typeof value === 'string') {
            result[sanitizedKey] = sanitizeText(value)
        } else if (typeof value === 'object' && value !== null) {
            result[sanitizedKey] = sanitizeJson(value as Record<string, unknown>)
        } else {
            result[sanitizedKey] = value
        }
    }

    return result as T
}

/**
 * Sanitize SQL-like input (prevent SQL injection patterns)
 */
export function sanitizeSqlInput(str: string): string {
    if (typeof str !== 'string') return ''

    return str
        // Remove SQL comments
        .replace(/--/g, '')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        // Remove common SQL injection patterns
        .replace(/['";]/g, '')
        // Remove UNION, SELECT, INSERT, UPDATE, DELETE, DROP keywords
        .replace(/\b(union|select|insert|update|delete|drop|truncate|alter|exec|execute|xp_)\b/gi, '')
        .trim()
}

/**
 * Check if input contains potential XSS patterns
 */
export function containsXss(str: string): boolean {
    if (typeof str !== 'string') return false

    const xssPatterns = [
        /<script/i,
        /javascript:/i,
        /on\w+\s*=/i,
        /<iframe/i,
        /<object/i,
        /<embed/i,
        /data:text\/html/i,
        /expression\s*\(/i,
        /vbscript:/i,
    ]

    return xssPatterns.some(pattern => pattern.test(str))
}

/**
 * Check if input contains potential SQL injection patterns
 */
export function containsSqlInjection(str: string): boolean {
    if (typeof str !== 'string') return false

    const sqlPatterns = [
        /(\bor\b|\band\b)\s+\d+\s*=\s*\d+/i,
        /union\s+(all\s+)?select/i,
        /;\s*(drop|delete|truncate|alter)\s/i,
        /'\s*or\s+'[^']*'\s*=\s*'/i,
        /--\s*$/,
        /\/\*.*\*\//,
    ]

    return sqlPatterns.some(pattern => pattern.test(str))
}
