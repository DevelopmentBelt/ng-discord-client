import { Injectable, signal } from '@angular/core';
import { firstValueFrom, take } from 'rxjs';
import { PhantomCryptoService } from './phantom-crypto.service';
import { IdentityKeyService } from './identity-key.service';
import { ServerWebService } from '../server-web-service/server-web.service';
import { AuthService } from '../auth-service/auth.service';

const LOCAL_CHANNEL_KEYS = 'nimbus-e2ee-channel-keys-v1';
const LEGACY_CHANNEL_KEYS = 'angcord-e2ee-channel-keys-v1';

/**
 * True E2EE channel keys: AES keys never leave the client in plaintext.
 * Server only stores ECDH-wrapped shares per member.
 */
@Injectable({
  providedIn: 'root'
})
export class PhantomKeyService {
  private readonly keyCache = new Map<number, CryptoKey>();
  private readonly rawCache = new Map<number, Uint8Array>();
  private readonly readyIds = signal<Set<number>>(new Set());

  readonly readyChannelIds = this.readyIds.asReadonly();

  constructor(
    private cryptoService: PhantomCryptoService,
    private identityKeys: IdentityKeyService,
    private serverWebService: ServerWebService,
    private authService: AuthService
  ) {}

  isReady(channelId: number): boolean {
    return this.keyCache.has(channelId) || this.readyIds().has(channelId);
  }

  async ensureKey(serverId: string | number, channelId: number): Promise<CryptoKey | null> {
    const cached = this.keyCache.get(channelId);
    if (cached) {
      return cached;
    }

    await this.identityKeys.ensureIdentity();

    const localRaw = this.loadLocalRaw(channelId);
    if (localRaw) {
      return this.cacheRaw(channelId, localRaw);
    }

    try {
      const resp = await firstValueFrom(
        this.serverWebService.getPhantomKeyShare(String(serverId), channelId).pipe(take(1))
      );
      if (!resp?.wrappedKey) {
        return null;
      }
      const privateKey = await this.identityKeys.getPrivateKey();
      if (!privateKey) {
        return null;
      }
      const raw = await this.cryptoService.unwrapKeyFromSender(resp.wrappedKey, privateKey);
      this.saveLocalRaw(channelId, raw);
      return this.cacheRaw(channelId, raw);
    } catch {
      return null;
    }
  }

  async getKey(channelId: number): Promise<CryptoKey | null> {
    return this.keyCache.get(channelId) || null;
  }

  /**
   * Enable Phantom with a fresh channel key and distribute wrapped shares to members.
   */
  async enableAndDistribute(serverId: string | number, channelId: number): Promise<boolean> {
    await this.identityKeys.ensureIdentity();
    await firstValueFrom(
      this.serverWebService.enablePhantomChannel(String(serverId), channelId).pipe(take(1))
    );

    const raw = await this.cryptoService.generateRawChannelKey();
    this.saveLocalRaw(channelId, raw);
    await this.cacheRaw(channelId, raw);
    await this.distributeToMembers(serverId, channelId, raw);
    return true;
  }

  /**
   * Wrap the channel key for any members who have a public key but no share yet.
   */
  async syncShares(serverId: string | number, channelId: number): Promise<void> {
    const raw = this.rawCache.get(channelId) || this.loadLocalRaw(channelId);
    if (!raw) {
      return;
    }
    await this.distributeToMembers(serverId, channelId, raw);
  }

  clear(channelId: number): void {
    this.keyCache.delete(channelId);
    this.rawCache.delete(channelId);
    this.removeLocalRaw(channelId);
    this.readyIds.update((set) => {
      const next = new Set(set);
      next.delete(channelId);
      return next;
    });
  }

  /** Export all locally held channel AES keys for the current user (base64 raw). */
  exportAllRawKeys(): Record<string, string> {
    const userId = this.authService.currentUser()?.id;
    if (!userId) {
      return {};
    }
    try {
      const all = this.readChannelKeyStore();
      return { ...(all?.[String(userId)] || {}) };
    } catch {
      return {};
    }
  }

  async importRawKeys(channelKeys: Record<string, string>): Promise<void> {
    const userId = this.authService.currentUser()?.id;
    if (!userId || !channelKeys) {
      return;
    }
    try {
      const all = this.readChannelKeyStore();
      all[String(userId)] = {
        ...(all[String(userId)] || {}),
        ...channelKeys
      };
      localStorage.setItem(LOCAL_CHANNEL_KEYS, JSON.stringify(all));
    } catch {
      // ignore quota
    }

    for (const [channelIdStr, b64] of Object.entries(channelKeys)) {
      const channelId = Number(channelIdStr);
      if (!channelId || !b64) {
        continue;
      }
      try {
        const raw = this.cryptoService.base64ToBytes(b64);
        await this.cacheRaw(channelId, raw);
      } catch {
        // skip bad entries
      }
    }
  }

  private async distributeToMembers(
    serverId: string | number,
    channelId: number,
    raw: Uint8Array
  ): Promise<void> {
    const status = await firstValueFrom(
      this.serverWebService.getPhantomShareStatus(String(serverId), channelId).pipe(take(1))
    );
    const holders = new Set((status?.holders || []).map((id) => Number(id)));
    const me = this.authService.currentUser()?.id;
    const shares: Array<{ userId: number; wrappedKey: string }> = [];

    for (const member of status?.members || []) {
      if (!member?.publicKey || !member?.userId) {
        continue;
      }
      if (holders.has(Number(member.userId)) && Number(member.userId) !== me) {
        continue;
      }
      try {
        const wrappedKey = await this.cryptoService.wrapKeyForRecipient(raw, member.publicKey);
        shares.push({ userId: Number(member.userId), wrappedKey });
      } catch {
        // skip members with bad keys
      }
    }

    if (shares.length) {
      await firstValueFrom(
        this.serverWebService.putPhantomKeyShares(String(serverId), channelId, shares).pipe(take(1))
      );
    }
  }

  private async cacheRaw(channelId: number, raw: Uint8Array): Promise<CryptoKey> {
    const key = await this.cryptoService.importRawKey(raw);
    this.keyCache.set(channelId, key);
    this.rawCache.set(channelId, raw);
    this.readyIds.update((set) => {
      const next = new Set(set);
      next.add(channelId);
      return next;
    });
    return key;
  }

  private readChannelKeyStore(): Record<string, any> {
    try {
      const current = localStorage.getItem(LOCAL_CHANNEL_KEYS);
      if (current) {
        return JSON.parse(current || '{}');
      }
      const legacy = localStorage.getItem(LEGACY_CHANNEL_KEYS);
      if (legacy) {
        const parsed = JSON.parse(legacy || '{}');
        localStorage.setItem(LOCAL_CHANNEL_KEYS, JSON.stringify(parsed));
        return parsed;
      }
    } catch {
      // ignore
    }
    return {};
  }

  private loadLocalRaw(channelId: number): Uint8Array | null {
    const userId = this.authService.currentUser()?.id;
    if (!userId) {
      return null;
    }
    try {
      const all = this.readChannelKeyStore();
      const b64 = all?.[String(userId)]?.[String(channelId)];
      return b64 ? this.cryptoService.base64ToBytes(b64) : null;
    } catch {
      return null;
    }
  }

  private saveLocalRaw(channelId: number, raw: Uint8Array): void {
    const userId = this.authService.currentUser()?.id;
    if (!userId) {
      return;
    }
    try {
      const all = this.readChannelKeyStore();
      if (!all[String(userId)]) {
        all[String(userId)] = {};
      }
      all[String(userId)][String(channelId)] = this.cryptoService.bytesToBase64(raw);
      localStorage.setItem(LOCAL_CHANNEL_KEYS, JSON.stringify(all));
    } catch {
      // ignore quota errors
    }
  }

  private removeLocalRaw(channelId: number): void {
    const userId = this.authService.currentUser()?.id;
    if (!userId) {
      return;
    }
    try {
      const all = this.readChannelKeyStore();
      if (all?.[String(userId)]) {
        delete all[String(userId)][String(channelId)];
        localStorage.setItem(LOCAL_CHANNEL_KEYS, JSON.stringify(all));
      }
    } catch {
      // ignore
    }
  }
}
