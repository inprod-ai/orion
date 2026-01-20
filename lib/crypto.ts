// =============================================================================
// CRYPTOGRAPHY UTILITIES - Secure encryption/decryption for sensitive data
// =============================================================================
// Uses AES-256-GCM for authenticated encryption.
// =============================================================================

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto'

// =============================================================================
// CONFIGURATION
// =============================================================================

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16 // 128 bits
const AUTH_TAG_LENGTH = 16 // 128 bits
const SALT_LENGTH = 32 // 256 bits
const KEY_LENGTH = 32 // 256 bits for AES-256

// Get encryption key from environment
function getEncryptionKey(): Buffer {
  const secret = process.env.NEXTAUTH_SECRET || process.env.ENCRYPTION_SECRET
  if (!secret) {
    throw new Error(
      'NEXTAUTH_SECRET or ENCRYPTION_SECRET environment variable is required for secure operations.'
    )
  }
  
  // Derive a proper 256-bit key from the secret using scrypt
  const salt = Buffer.from(secret.slice(0, SALT_LENGTH).padEnd(SALT_LENGTH, '0'))
  return scryptSync(secret, salt, KEY_LENGTH)
}

// =============================================================================
// ENCRYPTION / DECRYPTION
// =============================================================================

/**
 * Encrypt a string value using AES-256-GCM
 * Returns a base64-encoded string containing IV + AuthTag + Ciphertext
 */
export function encrypt(plaintext: string): string {
  if (!plaintext) return ''
  
  const key = getEncryptionKey()
  const iv = randomBytes(IV_LENGTH)
  
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH })
  
  let encrypted = cipher.update(plaintext, 'utf8')
  encrypted = Buffer.concat([encrypted, cipher.final()])
  
  const authTag = cipher.getAuthTag()
  
  // Combine: IV (16 bytes) + AuthTag (16 bytes) + Ciphertext
  const combined = Buffer.concat([iv, authTag, encrypted])
  
  return combined.toString('base64')
}

/**
 * Decrypt a value encrypted with encrypt()
 * Expects base64-encoded string containing IV + AuthTag + Ciphertext
 */
export function decrypt(encryptedBase64: string): string {
  if (!encryptedBase64) return ''
  
  try {
    const key = getEncryptionKey()
    const combined = Buffer.from(encryptedBase64, 'base64')
    
    // Extract: IV (16 bytes) + AuthTag (16 bytes) + Ciphertext
    const iv = combined.subarray(0, IV_LENGTH)
    const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH)
    const ciphertext = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH)
    
    const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH })
    decipher.setAuthTag(authTag)
    
    let decrypted = decipher.update(ciphertext)
    decrypted = Buffer.concat([decrypted, decipher.final()])
    
    return decrypted.toString('utf8')
  } catch (error) {
    console.error('[crypto] Decryption failed:', error)
    return ''
  }
}

// =============================================================================
// SESSION TOKEN ENCRYPTION (For cookies)
// =============================================================================

/**
 * Encrypt session data for cookie storage
 */
export function encryptSession(data: { userId: string; accessToken: string }): string {
  const json = JSON.stringify(data)
  return encrypt(json)
}

/**
 * Decrypt session data from cookie
 */
export function decryptSession(encryptedCookie: string): { userId: string; accessToken: string } | null {
  try {
    const json = decrypt(encryptedCookie)
    if (!json) return null
    
    const data = JSON.parse(json)
    
    // Validate structure
    if (!data.userId || !data.accessToken) {
      return null
    }
    
    return data
  } catch {
    return null
  }
}
