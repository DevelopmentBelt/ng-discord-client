import { Injectable, signal } from '@angular/core';
import { PhantomCryptoService } from './phantom-crypto.service';

interface StoredPhantomUnlock {
  passphrase: string;
  salt: string;
}

@Injectable({
  providedIn: 'root'
})
export class PhantomKeyService {
  private readonly STORAGE_PREFIX = 'angcord-phantom-key:';
  private readonly unlockedIds = signal<Set<number>>(new Set());
  private readonly keyCache = new Map<number, CryptoKey>();

  readonly unlockedChannelIds = this.unlockedIds.asReadonly();

  constructor(private cryptoService: PhantomCryptoService) {}

  isUnlocked(channelId: number): boolean {
    return this.unlockedIds().has(channelId) || this.keyCache.has(channelId);
  }

  async unlock(channelId: number, passphrase: string, salt: string): Promise<CryptoKey> {
    const key = await this.cryptoService.deriveKey(passphrase, salt);
    this.keyCache.set(channelId, key);
    this.persist(channelId, { passphrase, salt });
    this.unlockedIds.update((set) => {
      const next = new Set(set);
      next.add(channelId);
      return next;
    });
    return key;
  }

  async getKey(channelId: number): Promise<CryptoKey | null> {
    const cached = this.keyCache.get(channelId);
    if (cached) {
      return cached;
    }
    const stored = this.read(channelId);
    if (!stored) {
      return null;
    }
    try {
      const key = await this.cryptoService.deriveKey(stored.passphrase, stored.salt);
      this.keyCache.set(channelId, key);
      this.unlockedIds.update((set) => {
        const next = new Set(set);
        next.add(channelId);
        return next;
      });
      return key;
    } catch {
      return null;
    }
  }

  lock(channelId: number): void {
    this.keyCache.delete(channelId);
    try {
      localStorage.removeItem(this.STORAGE_PREFIX + channelId);
    } catch {
      // ignore
    }
    this.unlockedIds.update((set) => {
      const next = new Set(set);
      next.delete(channelId);
      return next;
    });
  }

  private persist(channelId: number, value: StoredPhantomUnlock): void {
    try {
      localStorage.setItem(this.STORAGE_PREFIX + channelId, JSON.stringify(value));
    } catch {
      // ignore
    }
  }

  private read(channelId: number): StoredPhantomUnlock | null {
    try {
      const raw = localStorage.getItem(this.STORAGE_PREFIX + channelId);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw) as StoredPhantomUnlock;
      if (!parsed?.passphrase || !parsed?.salt) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }
}
