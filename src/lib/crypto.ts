import { DBBackupData } from '../db';

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return u8;
}

function bytesToBase64(u8: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < u8.length; i++) bin += String.fromCharCode(u8[i]);
  return btoa(bin);
}

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 600000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export interface EncryptedPayload {
  __encrypted: true;
  salt: string;
  iv: string;
  ciphertext: string;
}

export function isEncrypted(data: any): data is EncryptedPayload {
  return data && data.__encrypted === true;
}

export async function encryptBackup(data: DBBackupData, password: string): Promise<EncryptedPayload> {
  const salt = crypto.getRandomValues(new Uint8Array(32));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);

  const enc = new TextEncoder();
  const plaintext = enc.encode(JSON.stringify(data));

  const ciphertext = new Uint8Array(await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv }, key, plaintext
  ));

  return {
    __encrypted: true,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(ciphertext)
  };
}

export async function decryptBackup(payload: EncryptedPayload, password: string): Promise<DBBackupData> {
  const salt = base64ToBytes(payload.salt);
  const iv = base64ToBytes(payload.iv);
  const ciphertext = base64ToBytes(payload.ciphertext);
  const key = await deriveKey(password, salt);

  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv }, key, ciphertext
  );

  const dec = new TextDecoder();
  return JSON.parse(dec.decode(plaintext));
}
