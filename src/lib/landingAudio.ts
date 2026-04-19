/**
 * Shared audio cache for the public website intro & hero.
 * Avoids fetching localized TTS twice when both intro and hero use it.
 */

const AUDIO_SRC = "/landing-voice-original.mp3";
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export const fallbackAudio = new Audio(`${AUDIO_SRC}?v=1`);
fallbackAudio.preload = "auto";
fallbackAudio.volume = 0.18;
fallbackAudio.load();

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

/**
 * Returns a cloned, ready-to-play audio element for the given locale.
 * Falls back to the German master recording if no localized TTS is cached yet.
 */
export function createPlayableAudio(locale: string): HTMLAudioElement {
  const source = cache.get(locale) ?? fallbackAudio;
  const audio = source.cloneNode(true) as HTMLAudioElement;
  audio.volume = 0.18;
  return audio;
}
