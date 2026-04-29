import { afterEach, describe, expect, it, vi } from "vitest";
import { installGlobalErrorLogging, logAppError, resetAppErrorLoggingForTests } from "./appErrorLogging";

const rpc = vi.fn().mockResolvedValue({ error: null });
const getUser = vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } });

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser },
    rpc,
  },
}));

describe("appErrorLogging", () => {
  const nativeConsoleError = console.error;

  afterEach(() => {
    console.error = nativeConsoleError;
    rpc.mockClear();
    getUser.mockClear();
    getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    rpc.mockResolvedValue({ error: null });
    resetAppErrorLoggingForTests();
  });

  it("dedupliziert ähnliche Fehler kurzfristig", async () => {
    await logAppError({ title: "Test", message: "kaputt", stack: "stack" });
    await logAppError({ title: "Test", message: "kaputt", stack: "stack" });

    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it("behält Deduplizierung über Reloads per localStorage", async () => {
    await logAppError({ title: "Reload-Test", message: "kaputt", stack: "stack" });
    resetAppErrorLoggingForTests();
    localStorage.setItem(
      "clemio_error_fingerprints_v1",
      JSON.stringify({ "Reload-Test|kaputt|/|stack": Date.now() })
    );

    await logAppError({ title: "Reload-Test", message: "kaputt", stack: "stack" });

    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it("logged window.error", async () => {
    const cleanup = installGlobalErrorLogging();
    window.dispatchEvent(new ErrorEvent("error", { message: "boom", error: new Error("boom") }));

    await vi.waitFor(() => expect(rpc).toHaveBeenCalledTimes(1));
    expect(rpc.mock.calls[0][1]).toMatchObject({ _title: "Globaler App-Fehler" });
    cleanup();
  });

  it("logged unhandledrejection", async () => {
    const cleanup = installGlobalErrorLogging();
    const event = new Event("unhandledrejection") as PromiseRejectionEvent;
    Object.defineProperty(event, "reason", { value: new Error("promise kaputt") });
    Object.defineProperty(event, "promise", { value: Promise.resolve() });
    window.dispatchEvent(event);

    await vi.waitFor(() => expect(rpc).toHaveBeenCalledTimes(1));
    expect(rpc.mock.calls[0][1]).toMatchObject({ _title: "Nicht behandelte App-Aktion" });
    cleanup();
  });

  it("logged console.error automatisch", async () => {
    const cleanup = installGlobalErrorLogging();
    console.error("Upload failed:", new Error("storage kaputt"));

    await vi.waitFor(() => expect(rpc).toHaveBeenCalledTimes(1));
    expect(rpc.mock.calls[0][1]).toMatchObject({
      _title: "Konsolen-Fehler",
      _details: { source: "console.error" },
      _category: "storage",
    });
    expect(rpc.mock.calls[0][1]._message).toContain("Upload failed");
    cleanup();
  });

  it("startet keine Endlosschleife, wenn Logging selbst fehlschlägt", async () => {
    rpc.mockRejectedValueOnce(new Error("db down"));

    await logAppError({ title: "DB", message: "down" });
    await logAppError({ title: "DB 2", message: "down 2" });

    expect(rpc).toHaveBeenCalledTimes(2);
  });

  it("maskiert sensible Daten vor dem Speichern", async () => {
    await logAppError({
      title: "Token leak",
      message: "Mail test@example.com phone +49 170 1234567 token=secret-value",
      stack: "Authorization: Bearer eyJabc.def.ghi",
      details: { filename: "app.ts", ignored: "secret=abc" },
    });

    expect(rpc.mock.calls[0][1]._message).toContain("[email]");
    expect(rpc.mock.calls[0][1]._message).toContain("[phone]");
    expect(rpc.mock.calls[0][1]._dedupe_window_seconds).toBe(1800);
    expect(rpc.mock.calls[0][1]._category).toBe("auth");
    expect(rpc.mock.calls[0][1]._message).not.toContain("test@example.com");
    expect(rpc.mock.calls[0][1]._details).toEqual({ filename: "app.ts" });
  });
});