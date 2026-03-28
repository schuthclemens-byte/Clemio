// Custom Service Worker additions – Background Sync + Web Push

async function notifyClients(message) {
  const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  clients.forEach((client) => client.postMessage({ type: "SW_DEBUG", ...message }));
}

// ── Force activation: skip waiting and claim clients immediately ──
// This ensures the latest SW version always handles push events
self.addEventListener("install", (event) => {
  console.log("[SW-Custom] Installing, calling skipWaiting()");
  event.waitUntil(
    Promise.all([
      self.skipWaiting(),
      notifyClients({ phase: "install", message: "skipWaiting ausgeführt" }),
    ])
  );
});

self.addEventListener("activate", (event) => {
  console.log("[SW-Custom] Activating, calling clients.claim()");
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      notifyClients({ phase: "activate", message: "clients.claim ausgeführt" }),
    ])
  );
});

// ---- Push Notification Handler ----
self.addEventListener("push", (event) => {
  console.log("[SW-Custom] Push event received");
  event.waitUntil((async () => {
    let data = { title: "Neue Nachricht", body: "", data: {} };
    try {
      if (event.data) {
        data = event.data.json();
      }
    } catch (e) {
      console.warn("[SW-Custom] Failed to parse push data as JSON:", e);
      if (event.data) {
        data.body = event.data.text();
      }
    }

    const normalizedTitle = typeof data.title === "string" && data.title.trim().length === 0 ? "\u00A0" : data.title;

    const options = {
      body: data.body,
      icon: data.icon || "/icon-192.png",
      badge: data.badge || "/icon-192.png",
      tag: data.data?.conversation_id || "clemio-push",
      data: data.data || {},
      vibrate: [200, 100, 200],
      renotify: true,
    };

    await notifyClients({
      phase: "push",
      message: "push-Event ausgelöst",
      title: normalizedTitle,
      body: options.body,
    });

    console.log("[SW-Custom] Showing notification:", normalizedTitle, options.body);
    await self.registration.showNotification(normalizedTitle, options);
    await notifyClients({
      phase: "showNotification",
      message: "showNotification ausgeführt",
      title: normalizedTitle,
      body: options.body,
    });
  })());
});

// Handle notification click
self.addEventListener("notificationclick", (event) => {
  console.log("[SW-Custom] Notification clicked");
  event.notification.close();
  const conversationId = event.notification.data?.conversation_id;
  const url = conversationId ? `/chat/${conversationId}` : "/chats";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin)) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});

// ---- Background Sync for offline message queue ----

const SYNC_TAG = "flush-offline-queue";

self.addEventListener("sync", (event) => {
  if (event.tag === SYNC_TAG) {
    event.waitUntil(flushQueue());
  }
});

// Message from main thread to trigger sync or pass config
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
    return;
  }
  if (event.data && event.data.type === "INIT_CONFIG") {
    self.__SUPABASE_URL = event.data.supabaseUrl;
    self.__SUPABASE_KEY = event.data.supabaseKey;
  }
  if (event.data && event.data.type === "TRIGGER_FLUSH") {
    flushQueue().then(() => {
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

  const clients = await self.clients.matchAll();
  if (clients.length > 0) {
    clients[0].postMessage({ type: "REQUEST_FLUSH" });
    return;
  }

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
    const req = indexedDB.open("clemio_offline", 1);
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
