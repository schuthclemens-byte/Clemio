import { supabase } from "@/integrations/supabase/client";

export type RequestVoiceConsentResult =
  | { ok: true; consent_id: string; shadowed: boolean }
  | { ok: false; code: VoiceConsentErrorCode };

export type VoiceConsentErrorCode =
  | "rate_limited"
  | "duplicate_request"
  | "cooldown_active"
  | "request_not_allowed"
  | "invalid_request"
  | "unauthorized"
  | "unknown_error";

/**
 * Bittet den Voice-Owner um Stimm-Freigabe.
 * Ruft die Edge Function `request-voice-consent` auf, die wiederum die DB-RPC
 * mit allen Sicherheitsprüfungen ausführt (Block-Check, Trust-Level, Rate-Limits,
 * Shadow-Limit, Cooldown, Self-Check). Push wird nur serverseitig getriggert.
 */
export async function requestVoiceConsent(
  voiceOwnerId: string,
): Promise<RequestVoiceConsentResult> {
  try {
    const { data, error } = await supabase.functions.invoke<
      | { ok: true; consent_id: string; shadowed: boolean }
      | { error: VoiceConsentErrorCode }
    >("request-voice-consent", {
      body: { voice_owner_id: voiceOwnerId },
    });

    if (error) {
      // supabase.functions.invoke setzt error für non-2xx; data enthält trotzdem den Body
      const code =
        (data && "error" in data ? data.error : "unknown_error") ??
        "unknown_error";
      return { ok: false, code };
    }

    if (data && "ok" in data && data.ok) {
      return data;
    }

    return { ok: false, code: "unknown_error" };
  } catch (e) {
    console.error("[requestVoiceConsent] unexpected", e);
    return { ok: false, code: "unknown_error" };
  }
}

/**
 * Liefert den i18n-Key für eine sichere, neutrale Fehlermeldung.
 * Niemals Block-/Profile-Status durchblitzen lassen.
 */
export function voiceConsentErrorKey(code: VoiceConsentErrorCode): string {
  switch (code) {
    case "rate_limited":
      return "voiceConsent.error.rateLimited";
    case "duplicate_request":
      return "voiceConsent.error.duplicate";
    case "cooldown_active":
      return "voiceConsent.error.cooldown";
    case "request_not_allowed":
      return "voiceConsent.error.notAllowed";
    case "invalid_request":
      return "voiceConsent.error.invalid";
    case "unauthorized":
      return "voiceConsent.error.unauthorized";
    default:
      return "voiceConsent.error.unknown";
  }
}
