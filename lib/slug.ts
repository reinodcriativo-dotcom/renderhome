const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

/**
 * Gera um slug público difícil de adivinhar (12 caracteres alfanuméricos).
 * Usa crypto.getRandomValues no client e crypto.randomBytes no server.
 */
export function generatePublicSlug(length = 12): string {
  const bytes = new Uint8Array(length);
  if (typeof globalThis.crypto !== "undefined" && globalThis.crypto.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  let out = "";
  for (let i = 0; i < length; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}
