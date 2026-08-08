import { Injectable, signal } from '@angular/core';
import { firstValueFrom, take } from 'rxjs';
import { PhantomCryptoService } from './phantom-crypto.service';
import { ServerWebService } from '../server-web-service/server-web.service';

@Injectable({
  providedIn: 'root'
})
export class PhantomKeyService {
  private readonly keyCache = new Map<number, CryptoKey>();
  private readonly readyIds = signal<Set<number>>(new Set());

  readonly readyChannelIds = this.readyIds.asReadonly();

  constructor(
    private cryptoService: PhantomCryptoService,
    private serverWebService: ServerWebService
  ) {}

  isReady(channelId: number): boolean {
    return this.keyCache.has(channelId) || this.readyIds().has(channelId);
  }

  async ensureKey(serverId: string | number, channelId: number): Promise<CryptoKey | null> {
    const cached = this.keyCache.get(channelId);
    if (cached) {
      return cached;
    }

    try {
      const resp = await firstValueFrom(
        this.serverWebService.getPhantomChannelKey(String(serverId), channelId).pipe(take(1))
      );
      if (!resp?.phantomKey) {
        return null;
      }
      const key = await this.cryptoService.importRawKey(resp.phantomKey);
      this.keyCache.set(channelId, key);
      this.readyIds.update((set) => {
        const next = new Set(set);
        next.add(channelId);
        return next;
      });
      return key;
    } catch {
      return null;
    }
  }

  async getKey(channelId: number): Promise<CryptoKey | null> {
    return this.keyCache.get(channelId) || null;
  }

  clear(channelId: number): void {
    this.keyCache.delete(channelId);
    this.readyIds.update((set) => {
      const next = new Set(set);
      next.delete(channelId);
      return next;
    });
  }
}
