/**
 * AES-256-GCM client-side encryption for voice files.
 * The IV (12 bytes) is prepended to the ciphertext.
 */

/** Generate a new AES-256-GCM key and return it as a Base64 string. */
export async function generateVoiceKey(): Promise<string> {
  const key = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );
  const raw = await crypto.subtle.exportKey("raw", key);
  return btoa(String.fromCharCode(...new Uint8Array(raw)));
}

/** Import a Base64-encoded key into a CryptoKey. */
async function importKey(b64: string): Promise<CryptoKey> {
  const raw = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM", length: 256 }, false, [
    "encrypt",
    "decrypt",
  ]);
}

/** Encrypt a file and return the ciphertext blob (IV prepended). */
export async function encryptVoiceFile(file: File | Blob, keyB64: string): Promise<Blob> {
  const key = await importKey(keyB64);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = await file.arrayBuffer();
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext);
  // Prepend IV (12 bytes) to ciphertext
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return new Blob([combined], { type: "application/octet-stream" });
}

/** Decrypt a blob (IV prepended) and return the plaintext as an audio Blob. */
export async function decryptVoiceFile(
  encryptedData: ArrayBuffer,
  keyB64: string,
): Promise<Blob> {
  const key = await importKey(keyB64);
  const data = new Uint8Array(encryptedData);
  const iv = data.slice(0, 12);
  const ciphertext = data.slice(12);
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return new Blob([plaintext], { type: "audio/wav" });
}
