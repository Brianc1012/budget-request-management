// ============================================================================
// IDEMPOTENCY UTILITY - Generate and validate idempotency keys
// ============================================================================

import { v4 as uuidv4 } from 'uuid';

/**
 * Generate a unique idempotency key
 * Format: service-action-resourceId-uuid
 */
export function generateIdempotencyKey(
  service: string,
  action: string,
  resourceId?: string | number
): string {
  const uuid = uuidv4();
  if (resourceId) {
    return `${service}-${action}-${resourceId}-${uuid}`;
  }
  return `${service}-${action}-${uuid}`;
}

/**
 * Generate a simple UUID-based idempotency key
 */
export function generateSimpleIdempotencyKey(): string {
  return uuidv4();
}

/**
 * Validate idempotency key format
 */
export function isValidIdempotencyKey(key: string): boolean {
  // Allow UUID format or custom format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const customRegex = /^[\w-]+-[\w-]+-[\w-]+-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  return uuidRegex.test(key) || customRegex.test(key);
}

/**
 * Extract components from idempotency key
 */
export function parseIdempotencyKey(key: string): {
  service?: string;
  action?: string;
  resourceId?: string;
  uuid?: string;
} | null {
  const parts = key.split('-');
  
  if (parts.length === 5) {
    // Format: service-action-resourceId-uuid (4 parts of UUID)
    return {
      service: parts[0],
      action: parts[1],
      resourceId: parts[2],
      uuid: parts.slice(3).join('-'),
    };
  } else if (parts.length === 4) {
    // Just UUID format
    return {
      uuid: key,
    };
  }
  
  return null;
}
