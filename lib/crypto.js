"use client";
// End-to-end encryption: AES-256-GCM via Web Crypto.
// Both people set the same chat secret once. Key is derived on-device with
// PBKDF2 (150k iterations, chat-specific salt). Firestore only ever sees ciphertext.

const enc = new TextEncoder();
const dec = new TextDecoder();

function bufToB64(buf) {
  const bytes = new Uint8Array(buf);
  let s = "";
  const CH = 0x8000;
  for (let i = 0; i < bytes.length; i += CH)
    s += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
  return btoa(s);
}
function b64ToBuf(b64) {
  const s = atob(b64);
  const bytes = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
  return bytes;
}

export async function deriveKey(passphrase, chatId) {
  const material = await crypto.subtle.importKey(
    "raw", enc.encode(passphrase), "PBKDF2", false, ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: enc.encode("muaw::" + chatId), iterations: 150000, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

// Returns "iv.ciphertext" (both base64)
export async function encryptStr(key, plaintext) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(plaintext));
  return bufToB64(iv) + "." + bufToB64(ct);
}

export async function decryptStr(key, payload) {
  const [ivB64, ctB64] = payload.split(".");
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: b64ToBuf(ivB64) }, key, b64ToBuf(ctB64)
  );
  return dec.decode(pt);
}

// Passphrase storage (device-local only — never sent to the server)
export const savePass = (chatId, pass) => localStorage.setItem("muaw-e2e-" + chatId, pass);
export const loadPass = (chatId) => localStorage.getItem("muaw-e2e-" + chatId);
export const clearPass = (chatId) => localStorage.removeItem("muaw-e2e-" + chatId);
