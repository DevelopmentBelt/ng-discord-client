/**
 * DmCryptoService — M1: Full E2EE for Direct Messages.
 *
 * Design mirrors PhantomKeyService + PhantomCryptoService:
 *   - Each conversation has one random 256-bit AES-GCM key.
 *   - The initiator generates the key, wraps it for both participants
 *     using ephemeral ECDH + HKDF-SHA256 (WRAP2: format), and uploads
 *     both wrapped shares via PUT /api/dms/{id}/e2ee-keys.
 *   - Each participant fetches their own wrapped share via
 *     GET /api/dms/{id}/e2ee-key and unwraps it with their private key.
 *   - Conversation keys are cached in memory and persisted in
 *     localStorage using the same device-encryption pattern as channel keys.
 *   - Ciphertext prefix: DM1: (distinguishable from PHANTOM1:)
 */

import { Injectable } from '@angular/core';
import { firstValueFrom, take } from 'rxjs';
import { PhantomCryptoService } from './phantom-crypto.service';
import { IdentityKeyService } from './identity-key.service';
import { DeviceKeyService, DEVENC1_PREFIX } from './device-key.service';
import { AuthService } from '../auth-service/auth.service';
import { DmWebService } from '../dm-web-service/dm-web.service';
import { DmConversation } from '../../models/dm/dm-conversation';
import { TofuService } from './tofu.service';

const DM_PREFIX = 'DM1:';
const LOCAL_DM_KEYS_V2 = 'nimbus-e2ee-dm-keys-v2';

@Injectable({
  providedIn: 'root'
})
export class DmCryptoService {
  /** In-memory cache: conversationId → CryptoKey */
  private readonly keyCache = new Map<string, CryptoKey>();
  /** In-memory cache: conversationId → raw Uint8Array (for re-wrapping when a new participant registers their key) */
  private readonly rawCache = new Map<string, Uint8Array>();
  /** H4: TOFU warnings — conversationId → warning message to display */
  readonly tofuWarnings = new Map<string, string>();

  constructor(
    private crypto: PhantomCryptoService,
    private identityKeys: IdentityKeyService,
    private deviceKey: DeviceKeyService,
    private authService: AuthService,
    private dmWebService: DmWebService,
    private tofu: TofuService
  ) {}

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /** Returns true if this message string is a DM E2EE ciphertext. */
  isCiphertext(value: string): boolean {
    return typeof value === 'string' && value.startsWith(DM_PREFIX);
  }

  /**
   * Ensure we hold the AES key for this conversation.
   * 1. Check in-memory cache.
   * 2. Check device-encrypted localStorage.
   * 3. Fetch wrapped share from the server and unwrap with our private key.
   * 4. If we are the owner and the other participant has a public key, generate
   *    and distribute a new key (first-open scenario).
   */
  async ensureKey(conversation: DmConversation): Promise<CryptoKey | null> {
    const convId = conversation.id;

    // 1. Memory cache
    const cached = this.keyCache.get(convId);
    if (cached) return cached;

    // 2. Persistent (device-encrypted) cache
    const local = await this.loadLocalAsync(convId);
    if (local) {
      return this.cacheRaw(convId, local);
    }

    // 3. Fetch wrapped share from server
    await this.identityKeys.ensureIdentity();

    // H4: TOFU check whenever we have the peer's public key
    if (conversation.participant?.publicKey) {
      const tofuResult = await this.tofu.checkKey(conversation.participant.id, conversation.participant.publicKey).catch(() => null);
      if (tofuResult?.status === 'changed') {
        const formatted = this.tofu.formatFingerprint(tofuResult.fingerprint);
        const prevFormatted = this.tofu.formatFingerprint(tofuResult.previous!);
        this.tofuWarnings.set(convId,
          `⚠️ ${conversation.participant.username}'s security key has changed!\n` +
          `Previous: ${prevFormatted}\nCurrent: ${formatted}\n` +
          `Verify with them in person before sharing sensitive information.`
        );
      }
    }

    try {
      const resp = await firstValueFrom(this.dmWebService.getE2eeKey(convId).pipe(take(1)));
      if (resp?.wrappedKey) {
        const privateKey = await this.identityKeys.getPrivateKey();
        if (!privateKey) return null;
        const raw = await this.crypto.unwrapKeyFromSender(resp.wrappedKey, privateKey);
        await this.saveLocal(convId, raw);
        return this.cacheRaw(convId, raw);
      }
    } catch { /* fall through to generation */ }

    // 4. No key yet — if we can reach the other participant, generate + distribute
    if (conversation.participant?.publicKey) {
      return this.generateAndDistribute(conversation);
    }

    return null;
  }

  async getKey(convId: string): Promise<CryptoKey | null> {
    return this.keyCache.get(convId) ?? null;
  }

  /** Encrypt a plaintext message for this conversation. */
  async encryptMessage(convId: string, plaintext: string): Promise<string> {
    const key = this.keyCache.get(convId);
    if (!key) throw new Error(`No E2EE key for conversation ${convId}`);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(plaintext);
    const cipherBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
    return `${DM_PREFIX}${this.crypto.bytesToBase64(iv)}:${this.crypto.bytesToBase64(new Uint8Array(cipherBuf))}`;
  }

  /** Decrypt a DM E2EE ciphertext. Returns plaintext, or the original string if not a ciphertext. */
  async decryptMessage(convId: string, payload: string): Promise<string> {
    if (!this.isCiphertext(payload)) return payload;
    const key = this.keyCache.get(convId);
    if (!key) return '[🔒 Encrypted — key unavailable]';
    try {
      const body = payload.slice(DM_PREFIX.length);
      const [ivB64, cipherB64] = body.split(':');
      if (!ivB64 || !cipherB64) throw new Error('Invalid DM ciphertext');
      const iv = this.crypto.base64ToBytes(ivB64);
      const cipher = this.crypto.base64ToBytes(cipherB64);
      const plainBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher);
      return new TextDecoder().decode(plainBuf);
    } catch {
      return '[🔒 Decryption failed]';
    }
  }

  /** Clear the in-memory key for a conversation (e.g. on close). */
  clear(convId: string): void {
    this.keyCache.delete(convId);
    this.rawCache.delete(convId);
  }

  /** M12: wipe all DM keys from localStorage on logout. */
  clearAllLocalKeys(userId: number): void {
    try {
      const all = this.readStore();
      if (all[String(userId)]) {
        delete all[String(userId)];
        if (Object.keys(all).length === 0) {
          localStorage.removeItem(LOCAL_DM_KEYS_V2);
        } else {
          localStorage.setItem(LOCAL_DM_KEYS_V2, JSON.stringify(all));
        }
      }
    } catch { /* ignore */ }
    this.keyCache.clear();
    this.rawCache.clear();
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async generateAndDistribute(conversation: DmConversation): Promise<CryptoKey | null> {
    await this.identityKeys.ensureIdentity();
    const myPublicKey = await this.identityKeys.getPublicKeySpki();
    const otherPublicKey = conversation.participant?.publicKey;
    if (!myPublicKey || !otherPublicKey) return null;

    const raw = await this.crypto.generateRawChannelKey();
    await this.saveLocal(conversation.id, raw);
    const key = await this.cacheRaw(conversation.id, raw);

    // Wrap for both participants
    try {
      const [myWrapped, otherWrapped] = await Promise.all([
        this.crypto.wrapKeyForRecipient(raw, myPublicKey),
        this.crypto.wrapKeyForRecipient(raw, otherPublicKey)
      ]);

      const myId = this.authService.currentUser()?.id;
      if (!myId) return key;

      const shares = [
        { userId: myId, wrappedKey: myWrapped },
        { userId: conversation.participant.id, wrappedKey: otherWrapped }
      ];

      await firstValueFrom(this.dmWebService.putE2eeKeys(conversation.id, shares).pipe(take(1)));
    } catch (e) {
      // Non-fatal: key is cached locally, distribution can be retried
      console.warn('[DmCryptoService] Failed to distribute E2EE key shares', e);
    }

    return key;
  }

  private async cacheRaw(convId: string, raw: Uint8Array): Promise<CryptoKey> {
    const key = await this.crypto.importRawKey(raw);
    this.keyCache.set(convId, key);
    this.rawCache.set(convId, raw);
    return key;
  }

  private async loadLocalAsync(convId: string): Promise<Uint8Array | null> {
    const userId = this.authService.currentUser()?.id;
    if (!userId) return null;
    try {
      const all = this.readStore();
      const blob = all?.[String(userId)]?.[convId];
      if (blob?.startsWith(DEVENC1_PREFIX)) {
        return await this.deviceKey.decrypt(blob);
      }
    } catch { /* ignore */ }
    return null;
  }

  private async saveLocal(convId: string, raw: Uint8Array): Promise<void> {
    const userId = this.authService.currentUser()?.id;
    if (!userId) return;
    try {
      const encrypted = await this.deviceKey.encrypt(raw);
      const all = this.readStore();
      if (!all[String(userId)]) all[String(userId)] = {};
      all[String(userId)][convId] = encrypted;
      localStorage.setItem(LOCAL_DM_KEYS_V2, JSON.stringify(all));
    } catch { /* ignore quota */ }
  }

  private readStore(): Record<string, Record<string, string>> {
    try {
      const raw = localStorage.getItem(LOCAL_DM_KEYS_V2);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }
}
