// Custom Service Worker additions – Background Sync for offline message queue

const SUPABASE_URL = self.__SUPABASE_URL; // injected at registration time via query param
const SUPABASE_KEY = self.__SUPABASE_KEY;
const STORAGE_KEY = "clevara_offline_queue";
const SYNC_TAG = "flush-offline-queue";

// Listen for Background Sync events
self.addEventListener("sync", (event) => {
  if (event.tag === SYNC_TAG) {
    event.waitUntil(flushQueue());
  }
});

// Fallback: periodically check on SW activation if there's a queue
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Message from main thread to trigger sync or pass config
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "INIT_CONFIG") {
    self.__SUPABASE_URL = event.data.supabaseUrl;
    self.__SUPABASE_KEY = event.data.supabaseKey;
  }
  if (event.data && event.data.type === "TRIGGER_FLUSH") {
    flushQueue().then(() => {
      // Notify all clients that flush completed
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: "FLUSH_COMPLETE" });
        });
      });
    });
  }
});

async function flushQueue() {
  const url = self.__SUPABASE_URL;
  const key = self.__SUPABASE_KEY;
  if (!url || !key) return;

  // Read queue from all clients via BroadcastChannel or direct fetch
  // Since SW can't access localStorage, we ask a client for the queue
  const clients = await self.clients.matchAll();
  if (clients.length > 0) {
    // If a client is available, let the client handle it (it has localStorage)
    clients[0].postMessage({ type: "REQUEST_FLUSH" });
    return;
  }

  // No clients open – use IndexedDB as fallback
  const queue = await getQueueFromIDB();
  if (!queue || queue.length === 0) return;

  const remaining = [];

  for (const msg of queue) {
    try {
      const insertData = {
        conversation_id: msg.conversationId,
        sender_id: msg.senderId,
        content: msg.content,
        message_type: msg.messageType,
      };
      if (msg.replyTo) insertData.reply_to = msg.replyTo;

      const res = await fetch(`${url}/rest/v1/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: key,
          Authorization: `Bearer ${msg.accessToken || key}`,
          Prefer: "return=representation",
        },
        body: JSON.stringify(insertData),
      });

      if (!res.ok) {
        remaining.push(msg);
      } else {
        // Update conversation timestamp
        await fetch(`${url}/rest/v1/conversations?id=eq.${msg.conversationId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            apikey: key,
            Authorization: `Bearer ${msg.accessToken || key}`,
          },
          body: JSON.stringify({ updated_at: new Date().toISOString() }),
        });
      }
    } catch {
      remaining.push(msg);
    }
  }

  await setQueueInIDB(remaining);
}

// ---- IndexedDB helpers for SW (no localStorage access) ----
function openIDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("clevara_offline", 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore("queue");
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getQueueFromIDB() {
  try {
    const db = await openIDB();
    return new Promise((resolve) => {
      const tx = db.transaction("queue", "readonly");
      const store = tx.objectStore("queue");
      const req = store.get("messages");
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

async function setQueueInIDB(queue) {
  try {
    const db = await openIDB();
    const tx = db.transaction("queue", "readwrite");
    const store = tx.objectStore("queue");
    store.put(queue, "messages");
  } catch {
    // silently fail
  }
}
