/**
 * Shared audio cache for the public website intro & hero.
 * Avoids fetching localized TTS twice when both intro and hero use it.
 *
 * Performance: nothing is fetched at module-load. The fallback MP3 is only
 * downloaded the first time someone actually needs an audio element (user
 * interaction or explicit idle-time warmup), and localized TTS is only
 * requested on demand. This keeps the landing page's initial network
 * footprint small.
 */

const AUDIO_SRC = "/landing-voice-original.mp3";
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

let _fallback: HTMLAudioElement | null = null;
function getFallback(): HTMLAudioElement {
  if (_fallback) return _fallback;
  const a = new Audio(`${AUDIO_SRC}?v=1`);
  a.preload = "auto";
  a.volume = 0.18;
  a.load();
  _fallback = a;
  return a;
}

/** Idle-time warmup. Safe to call eagerly — defers the actual fetch. */
export function warmFallbackAudio(): void {
  if (_fallback) return;
  const run = () => { getFallback(); };
  const ric = (window as any).requestIdleCallback as
    | ((cb: () => void, opts?: { timeout: number }) => number)
    | undefined;
  if (ric) ric(run, { timeout: 4000 });
  else setTimeout(run, 2500);
}

const cache = new Map<string, HTMLAudioElement>();
const pending = new Map<string, Promise<HTMLAudioElement | null>>();

export function getCachedAudio(lang: string): HTMLAudioElement | undefined {
  return cache.get(lang);
}

export function prefetchLocalizedAudio(lang: string): Promise<HTMLAudioElement | null> {
  if (cache.has(lang)) return Promise.resolve(cache.get(lang)!);
  if (pending.has(lang)) return pending.get(lang)!;

  // Daily cache-buster: stable across reloads, refreshes once per day.
  const dayKey = new Date().toISOString().slice(0, 10);
  const promise = fetch(`${SUPABASE_URL}/functions/v1/onboarding-tts?lang=${lang}&v=${dayKey}`)
    .then(async (res) => {
      const ct = res.headers.get("Content-Type") || "";
      if (ct.includes("application/json") || !res.ok) return null;
      const blob = await res.blob();
      const audio = new Audio(URL.createObjectURL(blob));
      audio.preload = "auto";
      audio.volume = 0.18;
      cache.set(lang, audio);
      return audio;
    })
    .catch(() => null)
    .finally(() => pending.delete(lang));

  pending.set(lang, promise);
  return promise;
}

/** Defer localized TTS prefetch to idle time so it never blocks the first paint. */
export function idlePrefetchLocalizedAudio(lang: string): void {
  if (lang === "de" || cache.has(lang) || pending.has(lang)) return;
  const run = () => { void prefetchLocalizedAudio(lang); };
  const ric = (window as any).requestIdleCallback as
    | ((cb: () => void, opts?: { timeout: number }) => number)
    | undefined;
  if (ric) ric(run, { timeout: 4000 });
  else setTimeout(run, 2500);
}

/**
 * Returns a cloned, ready-to-play audio element for the given locale.
 * Falls back to the German master recording if no localized TTS is cached yet.
 */
export function createPlayableAudio(locale: string): HTMLAudioElement {
  const source = cache.get(locale) ?? getFallback();
  const audio = source.cloneNode(true) as HTMLAudioElement;
  audio.volume = 0.18;
  return audio;
}
