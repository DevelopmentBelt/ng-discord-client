import { Injectable } from '@angular/core';
import { AuthService } from '../auth-service/auth.service';
import { KeyVaultCryptoService } from './key-vault-crypto.service';
import { Message } from '../../models/message/message';

const DB_NAME = 'angcord-local-vault-v1';
const STORE = 'messages';
const LOCAL_KEY_PREFIX = 'angcord-local-vault-key-v1-';

interface VaultRecord {
  id: string;
  userId: number;
  channelId: number;
  messageId: string;
  iv: string;
  ciphertext: string;
  postedAt: string;
}

/**
 * Local-first message archive: decrypted Phantom/plaintext history encrypted at rest
 * with a device vault key (also included in passphrase backups).
 */
@Injectable({
  providedIn: 'root'
})
export class LocalMessageVaultService {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private cryptoKeyCache = new Map<number, CryptoKey>();

  constructor(
    private authService: AuthService,
    private vaultCrypto: KeyVaultCryptoService
  ) {}

  async getOrCreateLocalVaultKeyB64(userId?: number): Promise<string | null> {
    const uid = userId ?? this.authService.currentUser()?.id;
    if (!uid) {
      return null;
    }
    const existing = localStorage.getItem(LOCAL_KEY_PREFIX + uid);
    if (existing) {
      return existing;
    }
    const raw = crypto.getRandomValues(new Uint8Array(32));
    const b64 = this.vaultCrypto.bytesToBase64(raw);
    localStorage.setItem(LOCAL_KEY_PREFIX + uid, b64);
    return b64;
  }

  setLocalVaultKeyB64(userId: number, keyB64: string): void {
    localStorage.setItem(LOCAL_KEY_PREFIX + userId, keyB64);
    this.cryptoKeyCache.delete(userId);
  }

  async putMessages(channelId: number, messages: Message[]): Promise<void> {
    const userId = this.authService.currentUser()?.id;
    if (!userId || !messages.length) {
      return;
    }
    const key = await this.getAesKey(userId);
    if (!key) {
      return;
    }
    const db = await this.openDb();
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);

    for (const message of messages) {
      if (!message?.id || message.decryptFailed) {
        continue;
      }
      const payload = {
        id: String(message.id),
        text: message.text || '',
        rawText: message.rawText || '',
        postedTimestamp: message.postedTimestamp,
        author: message.author,
        isAnonymous: !!message.isAnonymous,
        isEncrypted: !!message.isEncrypted,
        expiresAt: message.expiresAt ?? null,
        channelId
      };
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const cipherBuf = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        new TextEncoder().encode(JSON.stringify(payload))
      );
      const record: VaultRecord = {
        id: `${userId}:${channelId}:${message.id}`,
        userId,
        channelId,
        messageId: String(message.id),
        iv: this.vaultCrypto.bytesToBase64(iv),
        ciphertext: this.vaultCrypto.bytesToBase64(new Uint8Array(cipherBuf)),
        postedAt: String(payload.postedTimestamp || '')
      };
      store.put(record);
    }

    await this.txDone(tx);
  }

  async listMessages(channelId: number): Promise<Message[]> {
    const userId = this.authService.currentUser()?.id;
    if (!userId) {
      return [];
    }
    const key = await this.getAesKey(userId);
    if (!key) {
      return [];
    }

    const db = await this.openDb();
    const tx = db.transaction(STORE, 'readonly');
    const index = tx.objectStore(STORE).index('by_user_channel');
    const req = index.getAll(IDBKeyRange.only([userId, channelId]));
    const rows = await this.reqToPromise<VaultRecord[]>(req);
    await this.txDone(tx);

    const out: Message[] = [];
    for (const row of rows || []) {
      try {
        const plainBuf = await crypto.subtle.decrypt(
          { name: 'AES-GCM', iv: this.vaultCrypto.base64ToBytes(row.iv) },
          key,
          this.vaultCrypto.base64ToBytes(row.ciphertext)
        );
        const parsed = JSON.parse(new TextDecoder().decode(plainBuf));
        out.push({
          id: String(parsed.id),
          text: parsed.text || '',
          rawText: parsed.rawText || '',
          mentions: [],
          attachments: [],
          postedTimestamp: parsed.postedTimestamp,
          edited: false,
          editTimestamp: parsed.postedTimestamp,
          author: parsed.author,
          channelId: parsed.channelId,
          isAnonymous: !!parsed.isAnonymous,
          isEncrypted: !!parsed.isEncrypted,
          expiresAt: parsed.expiresAt ?? null
        } as Message);
      } catch {
        // skip undecryptable rows
      }
    }

    return out.sort((a, b) => String(a.postedTimestamp).localeCompare(String(b.postedTimestamp)));
  }

  async clearForUser(userId?: number): Promise<void> {
    const uid = userId ?? this.authService.currentUser()?.id;
    if (!uid) {
      return;
    }
    const db = await this.openDb();
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const index = store.index('by_user');
    const req = index.openCursor(IDBKeyRange.only(uid));
    await new Promise<void>((resolve, reject) => {
      req.onsuccess = () => {
        const cursor = req.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
      req.onerror = () => reject(req.error);
    });
    await this.txDone(tx);
    localStorage.removeItem(LOCAL_KEY_PREFIX + uid);
    this.cryptoKeyCache.delete(uid);
  }

  private async getAesKey(userId: number): Promise<CryptoKey | null> {
    const cached = this.cryptoKeyCache.get(userId);
    if (cached) {
      return cached;
    }
    const b64 = await this.getOrCreateLocalVaultKeyB64(userId);
    if (!b64) {
      return null;
    }
    const key = await crypto.subtle.importKey(
      'raw',
      this.vaultCrypto.base64ToBytes(b64),
      { name: 'AES-GCM' },
      false,
      ['encrypt', 'decrypt']
    );
    this.cryptoKeyCache.set(userId, key);
    return key;
  }

  private openDb(): Promise<IDBDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(STORE)) {
            const store = db.createObjectStore(STORE, { keyPath: 'id' });
            store.createIndex('by_user_channel', ['userId', 'channelId'], { unique: false });
            store.createIndex('by_user', 'userId', { unique: false });
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    }
    return this.dbPromise;
  }

  private reqToPromise<T>(req: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  private txDone(tx: IDBTransaction): Promise<void> {
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }
}
