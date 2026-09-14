/**
 * C4 — Device-key service.
 *
 * Generates and stores a non-extractable AES-256-GCM key in IndexedDB.
 * This key is used to encrypt sensitive material (identity keys, channel keys)
 * before writing to localStorage. Since the key is non-extractable, JS cannot
 * call exportKey() on it — protecting against storage-theft attacks where an
 * adversary reads raw browser storage files without code execution.
 *
 * Note: XSS with code execution can still call encrypt/decrypt on this key,
 * but eliminating the XSS vector (H1) is the primary defence there.
 */
import { Injectable } from '@angular/core';

const IDB_DB    = 'nimbus-device-v1';
const IDB_STORE = 'keys';
const KEY_ID    = 'device-master';

/** Prefix that distinguishes device-encrypted blobs from plaintext. */
export const DEVENC1_PREFIX = 'DEVENC1:';

@Injectable({ providedIn: 'root' })
export class DeviceKeyService {
  private keyPromise: Promise<CryptoKey> | null = null;

  /** Returns the non-extractable device key (loads or generates on first call). */
  async getKey(): Promise<CryptoKey> {
    if (!this.keyPromise) {
      this.keyPromise = this.loadOrCreate();
    }
    return this.keyPromise;
  }

  /**
   * Encrypt plaintext bytes and return a `DEVENC1:{iv}:{cipher}` string.
   * The returned string is safe to store in localStorage.
   */
  async encrypt(plaintext: Uint8Array): Promise<string> {
    const key = await this.getKey();
    const iv  = crypto.getRandomValues(new Uint8Array(12));
    const cipherBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);
    return DEVENC1_PREFIX + b64(iv) + ':' + b64(new Uint8Array(cipherBuf));
  }

  /**
   * Decrypt a `DEVENC1:{iv}:{cipher}` blob produced by encrypt().
   * Throws if the blob format or decryption fails.
   */
  async decrypt(blob: string): Promise<Uint8Array> {
    if (!blob.startsWith(DEVENC1_PREFIX)) {
      throw new Error('Not a device-encrypted blob');
    }
    const parts = blob.slice(DEVENC1_PREFIX.length).split(':');
    if (parts.length !== 2) throw new Error('Malformed DEVENC1 blob');
    const iv     = unb64(parts[0]);
    const cipher = unb64(parts[1]);
    const key    = await this.getKey();
    const plain  = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher);
    return new Uint8Array(plain);
  }

  // -------------------------------------------------------------------------
  private async loadOrCreate(): Promise<CryptoKey> {
    const db = await openIdb(IDB_DB, IDB_STORE);
    const stored = await idbGet<CryptoKey>(db, IDB_STORE, KEY_ID);

    if (stored instanceof CryptoKey) {
      return stored;
    }

    const newKey = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      false,              // non-extractable — JS cannot call exportKey on this
      ['encrypt', 'decrypt']
    );
    await idbPut(db, IDB_STORE, KEY_ID, newKey);
    return newKey;
  }
}

// ---------------------------------------------------------------------------
// IDB helpers
// ---------------------------------------------------------------------------

function openIdb(dbName: string, storeName: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(dbName, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(storeName)) {
        req.result.createObjectStore(storeName);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

function idbGet<T>(db: IDBDatabase, store: string, key: string): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const req = db.transaction(store, 'readonly').objectStore(store).get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror   = () => reject(req.error);
  });
}

function idbPut(db: IDBDatabase, store: string, key: string, value: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = db.transaction(store, 'readwrite').objectStore(store).put(value, key);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

// ---------------------------------------------------------------------------
// Base64 helpers (stand-alone so no circular deps)
// ---------------------------------------------------------------------------

function b64(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach(b => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

function unb64(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
