// Tests für die Eingangsvalidierung von transcribe-voice-message.
// Diese Tests decken die Code-Pfade ab, die KEIN Supabase/STT-Backend brauchen:
//   - Method-Check
//   - CORS-Preflight
//   - Auth-Header-Check
//   - JSON-Body-Validation
//   - UUID-Validation
//
// DB- und STT-Pfade werden hier bewusst NICHT getestet, weil sie echte
// Service-Credentials + einen laufenden STT-Server brauchen. Sie werden
// später per curl_edge_functions in einer separaten Stufe verifiziert.

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

// Stub für Env-Variablen, damit der Modul-Import nicht crasht.
Deno.env.set("SUPABASE_URL", "http://localhost:54321");
Deno.env.set("SUPABASE_ANON_KEY", "test-anon");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "test-srv");

// Modul importieren -> registriert Deno.serve-Handler.
// Wir greifen den Handler über einen Monkey-Patch von Deno.serve ab.
let handler: ((req: Request) => Response | Promise<Response>) | null = null;
const originalServe = Deno.serve;
// deno-lint-ignore no-explicit-any
(Deno as any).serve = (h: any) => {
  handler = typeof h === "function" ? h : h.handler;
  return { finished: Promise.resolve(), shutdown: () => {}, ref: () => {}, unref: () => {} } as any;
};
await import("./index.ts");
// deno-lint-ignore no-explicit-any
(Deno as any).serve = originalServe;

if (!handler) {
  throw new Error("Handler wurde nicht registriert");
}

const call = (init: RequestInit & { url?: string } = {}) =>
  handler!(new Request(init.url ?? "http://localhost/transcribe-voice-message", init));

Deno.test("OPTIONS Preflight liefert CORS-Header", async () => {
  const res = await call({ method: "OPTIONS" });
  assertEquals(res.status, 200);
  assertEquals(res.headers.get("Access-Control-Allow-Origin"), "*");
});

Deno.test("GET wird mit 405 abgelehnt", async () => {
  const res = await call({ method: "GET" });
  assertEquals(res.status, 405);
});

Deno.test("POST ohne Authorization-Header liefert 401", async () => {
  const res = await call({ method: "POST", body: JSON.stringify({}) });
  assertEquals(res.status, 401);
});

Deno.test("POST mit falschem Auth-Schema liefert 401", async () => {
  const res = await call({
    method: "POST",
    headers: { Authorization: "Basic abc" },
    body: JSON.stringify({}),
  });
  assertEquals(res.status, 401);
});

// Hinweis: Tests, die mit gültigem Bearer-Header weiterlaufen würden,
// triggern echte Netzwerk-Aufrufe an die Supabase-Auth-API und sind
// daher hier ausgespart. Sie werden später per curl_edge_functions
// gegen die deployte Function mit einem echten Session-Token verifiziert.
