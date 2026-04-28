import { afterEach, describe, expect, it, vi } from "vitest";
import { installGlobalErrorLogging, logAppError, resetAppErrorLoggingForTests } from "./appErrorLogging";

const insert = vi.fn().mockResolvedValue({ error: null });
const getUser = vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } });

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser },
    from: () => ({ insert }),
  },
}));

describe("appErrorLogging", () => {
  afterEach(() => {
    insert.mockClear();
    getUser.mockClear();
    getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    insert.mockResolvedValue({ error: null });
    resetAppErrorLoggingForTests();
  });

  it("dedupliziert ähnliche Fehler kurzfristig", async () => {
    await logAppError({ title: "Test", message: "kaputt", stack: "stack" });
    await logAppError({ title: "Test", message: "kaputt", stack: "stack" });

    expect(insert).toHaveBeenCalledTimes(1);
  });

  it("logged window.error", async () => {
    const cleanup = installGlobalErrorLogging();
    window.dispatchEvent(new ErrorEvent("error", { message: "boom", error: new Error("boom") }));

    await vi.waitFor(() => expect(insert).toHaveBeenCalledTimes(1));
    expect(insert.mock.calls[0][0]).toMatchObject({ title: "Globaler App-Fehler", user_id: "user-1" });
    cleanup();
  });

  it("logged unhandledrejection", async () => {
    const cleanup = installGlobalErrorLogging();
    const event = new Event("unhandledrejection") as PromiseRejectionEvent;
    Object.defineProperty(event, "reason", { value: new Error("promise kaputt") });
    Object.defineProperty(event, "promise", { value: Promise.resolve() });
    window.dispatchEvent(event);

    await vi.waitFor(() => expect(insert).toHaveBeenCalledTimes(1));
    expect(insert.mock.calls[0][0]).toMatchObject({ title: "Nicht behandelte App-Aktion" });
    cleanup();
  });

  it("startet keine Endlosschleife, wenn Logging selbst fehlschlägt", async () => {
    insert.mockRejectedValueOnce(new Error("db down"));

    await logAppError({ title: "DB", message: "down" });
    await logAppError({ title: "DB 2", message: "down 2" });

    expect(insert).toHaveBeenCalledTimes(2);
  });
});