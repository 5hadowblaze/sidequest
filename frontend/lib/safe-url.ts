const BLOCKED_PROTOCOL_RE = /^(javascript|data|vbscript|file|blob):/i;
const PROTOCOL_RELATIVE_RE = /^\/\//;

/**
 * Returns a safe https URL for use in href/src, or null if the value is unsafe.
 * Only https: is allowed; blocks javascript:, data:, protocol-relative //, etc.
 */
export function sanitizeExternalUrl(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (BLOCKED_PROTOCOL_RE.test(trimmed) || PROTOCOL_RELATIVE_RE.test(trimmed)) {
    return null;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:") {
      return null;
    }
    return parsed.href;
  } catch {
    return null;
  }
}

/** Safe https URL or a neutral placeholder for broken/missing image URLs. */
export function sanitizeImageUrl(raw: string | null | undefined): string {
  return sanitizeExternalUrl(raw) ?? "/icon.svg";
}
