/**
 * Bridges the offline queue between localStorage, IndexedDB (for SW),
 * and registers Background Sync.
 */

const IDB_NAME = "clevara_offline";
const IDB_STORE = "queue";
const IDB_KEY = "messages";
const SYNC_TAG = "flush-offline-queue";
const LS_KEY = "clevara_offline_queue";

// ---- IndexedDB helpers ----
function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(IDB_STORE)) {
        req.result.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function mirrorQueueToIDB(): Promise<void> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return;
    const queue = JSON.parse(raw);
    if (!Array.isArray(queue) || queue.length === 0) return;

    // Attach current access token so SW can authenticate
    const sessionRaw = localStorage.getItem("sb-abosqgstsdahrlnvjwzc-auth-token");
    let accessToken: string | null = null;
    if (sessionRaw) {
      try {
        const parsed = JSON.parse(sessionRaw);
        accessToken = parsed?.access_token || null;
      } catch { /* ignore */ }
    }

    const enriched = queue.map((m: any) => ({ ...m, accessToken }));

    const db = await openIDB();
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).put(enriched, IDB_KEY);
  } catch {
    // silently fail
  }
}

export async function registerBackgroundSync(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;

  try {
    const reg = await navigator.serviceWorker.ready;

    // Send config to SW
    reg.active?.postMessage({
      type: "INIT_CONFIG",
      supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
      supabaseKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    });

    // Register Background Sync if available
    if ("sync" in reg) {
      await (reg as any).sync.register(SYNC_TAG);
    }
  } catch {
    // Background Sync not supported – online event still works
  }
}

/** Call after enqueueing a message to mirror + register sync */
export async function scheduleOfflineSync(): Promise<void> {
  await mirrorQueueToIDB();
  await registerBackgroundSync();
}

/** Listen for SW requesting a flush (when client is available) */
export function listenForSWFlushRequest(flushFn: () => Promise<void>): () => void {
  if (!("serviceWorker" in navigator)) return () => {};

  const handler = (event: MessageEvent) => {
    if (event.data?.type === "REQUEST_FLUSH") {
      flushFn();
    }
  };

  navigator.serviceWorker.addEventListener("message", handler);
  return () => navigator.serviceWorker.removeEventListener("message", handler);
}
