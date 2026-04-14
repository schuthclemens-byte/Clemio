/**
 * Simple in-memory LRU cache for TTS audio blobs.
 * Keys are hash(senderId + text). Max 30 entries.
 */
const MAX_ENTRIES = 30;

interface CacheEntry {
  url: string;
  blob: Blob;
  accessedAt: number;
}

const cache = new Map<string, CacheEntry>();

function makeKey(senderId: string, text: string): string {
  // Simple hash – good enough for cache keying
  const raw = `${senderId}::${text.slice(0, 200)}`;
  let h = 0;
  for (let i = 0; i < raw.length; i++) {
    h = ((h << 5) - h + raw.charCodeAt(i)) | 0;
  }
  return h.toString(36);
}

function evictIfNeeded() {
  if (cache.size < MAX_ENTRIES) return;
  let oldest: string | null = null;
  let oldestTime = Infinity;
  for (const [key, entry] of cache) {
    if (entry.accessedAt < oldestTime) {
      oldestTime = entry.accessedAt;
      oldest = key;
    }
  }
  if (oldest) {
    const entry = cache.get(oldest);
    if (entry) URL.revokeObjectURL(entry.url);
    cache.delete(oldest);
  }
}

export function getCachedAudio(senderId: string, text: string): string | null {
  const key = makeKey(senderId, text);
  const entry = cache.get(key);
  if (!entry) return null;
  entry.accessedAt = Date.now();
  return entry.url;
}

export function setCachedAudio(senderId: string, text: string, blob: Blob): string {
  const key = makeKey(senderId, text);
  const existing = cache.get(key);
  if (existing) {
    existing.accessedAt = Date.now();
    return existing.url;
  }
  evictIfNeeded();
  const url = URL.createObjectURL(blob);
  cache.set(key, { url, blob, accessedAt: Date.now() });
  return url;
}

export function preloadAudio(senderId: string, text: string, fetchFn: () => Promise<Blob>): void {
  const key = makeKey(senderId, text);
  if (cache.has(key)) return;
  // Fire-and-forget preload
  fetchFn().then(blob => {
    setCachedAudio(senderId, text, blob);
  }).catch(() => {
    // Silent fail for preload
  });
}

export function clearTtsCache() {
  for (const entry of cache.values()) {
    URL.revokeObjectURL(entry.url);
  }
  cache.clear();
}
