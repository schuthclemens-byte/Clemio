import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const loadHook = async ({
  native,
  speechMock,
}: {
  native: boolean;
  speechMock?: () => unknown;
}) => {
  vi.resetModules();
  vi.doMock("@capacitor/core", () => ({
    Capacitor: { isNativePlatform: () => native },
  }));
  if (speechMock) {
    vi.doMock("@capacitor-community/speech-recognition", speechMock);
  }
  return import("./useLiveCaptions");
};

describe("useLiveCaptions cleanup", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    vi.unmock("@capacitor/core");
    vi.unmock("@capacitor-community/speech-recognition");
    delete (window as any).SpeechRecognition;
    delete (window as any).webkitSpeechRecognition;
  });

  it("entfernt Browser-Handler beim Stop und startet nach onend nicht erneut", async () => {
    const start = vi.fn();
    const stop = vi.fn();
    let instance: any;

    (window as any).SpeechRecognition = vi.fn(function SpeechRecognitionMock(this: any) {
      instance = this;
      this.start = start;
      this.stop = stop;
    });

    const { useLiveCaptions } = await loadHook({ native: false });
    const { result } = renderHook(() => useLiveCaptions());

    await waitFor(() => expect(result.current.isSupported).toBe(true));

    act(() => result.current.startCaptions("de-DE"));
    await waitFor(() => expect(result.current.isEnabled).toBe(true));
    expect(start).toHaveBeenCalledTimes(1);

    act(() => result.current.stopCaptions());

    expect(stop).toHaveBeenCalledTimes(1);
    expect(instance.onresult).toBeNull();
    expect(instance.onend).toBeNull();
    expect(instance.onerror).toBeNull();

    instance.onend?.();
    expect(start).toHaveBeenCalledTimes(1);
    expect(result.current.isEnabled).toBe(false);
  });

  it("entfernt native Listener und stoppt SpeechRecognition beim Unmount", async () => {
    const removePartial = vi.fn().mockResolvedValue(undefined);
    const removeState = vi.fn().mockResolvedValue(undefined);
    const stop = vi.fn().mockResolvedValue(undefined);
    const start = vi.fn().mockResolvedValue({ matches: [] });
    const addListener = vi
      .fn()
      .mockResolvedValueOnce({ remove: removePartial })
      .mockResolvedValueOnce({ remove: removeState });

    const { useLiveCaptions } = await loadHook({
      native: true,
      speechMock: () => ({
        SpeechRecognition: {
          available: vi.fn().mockResolvedValue({ available: true }),
          checkPermissions: vi.fn().mockResolvedValue({ speechRecognition: "granted" }),
          requestPermissions: vi.fn().mockResolvedValue({ speechRecognition: "granted" }),
          addListener,
          start,
          stop,
        },
      }),
    });

    const { result, unmount } = renderHook(() => useLiveCaptions());
    await waitFor(() => expect(result.current.isSupported).toBe(true));

    act(() => result.current.startCaptions("de-DE"));
    await waitFor(() => expect(result.current.isEnabled).toBe(true));

    unmount();

    await waitFor(() => {
      expect(removePartial).toHaveBeenCalledTimes(1);
      expect(removeState).toHaveBeenCalledTimes(1);
      expect(stop).toHaveBeenCalled();
    });
  });

  it("behandelt native Import-Fails ohne Listener oder Neustart", async () => {
    const { useLiveCaptions } = await loadHook({
      native: true,
      speechMock: () => {
        throw new Error("speech plugin missing");
      },
    });

    const { result } = renderHook(() => useLiveCaptions());

    await waitFor(() => {
      expect(result.current.isSupported).toBe(false);
      expect(result.current.errorMessage).toBe("Untertitel sind in dieser App-Version nicht verfügbar.");
      expect(result.current.debugStatus.lastStatus).toBe("native-import-failed");
    });

    act(() => result.current.startCaptions("de-DE"));

    expect(result.current.isEnabled).toBe(false);
    expect(result.current.debugStatus.lastStatus).toBe("native-import-failed");
  });
});