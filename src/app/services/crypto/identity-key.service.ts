import { Injectable } from '@angular/core';
import { firstValueFrom, take } from 'rxjs';
import { UserWebService } from '../user-web-service/user-web.service';
import { AuthService } from '../auth-service/auth.service';
import { DeviceKeyService, DEVENC1_PREFIX } from './device-key.service';

/** C4: v2 storage uses device-key-encrypted blobs (DEVENC1: prefix). */
const STORAGE_PREFIX_V2 = 'nimbus-identity-v2-';
/** Legacy keys — read for migration, replaced with v2. */
const STORAGE_PREFIX = 'nimbus-identity-v1-';
const LEGACY_STORAGE_PREFIX = 'angcord-identity-v1-';

/**
 * Per-user ECDH P-256 identity keys.
 * Public key is published to the server; private key never leaves the device.
 */
@Injectable({
  providedIn: 'root'
})
export class IdentityKeyService {
  private privateKey: CryptoKey | null = null;
  private publicKeySpkiB64: string | null = null;
  private readyUserId: number | null = null;

  constructor(
    private userWebService: UserWebService,
    private authService: AuthService,
    private deviceKey: DeviceKeyService
  ) {}

  async ensureIdentity(): Promise<string | null> {
    const user = this.authService.currentUser();
    if (!user?.id) {
      return null;
    }
    if (this.readyUserId === user.id && this.privateKey && this.publicKeySpkiB64) {
      return this.publicKeySpkiB64;
    }

    const stored = await this.loadLocal(user.id);
    if (stored) {
      this.privateKey = await crypto.subtle.importKey(
        'pkcs8',
        this.base64ToBytes(stored.privateKeyPkcs8),
        { name: 'ECDH', namedCurve: 'P-256' },
        true,
        ['deriveBits']
      );
      this.publicKeySpkiB64 = stored.publicKeySpki;
      this.readyUserId = user.id;
    } else {
      const pair = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
      const pkcs8 = new Uint8Array(await crypto.subtle.exportKey('pkcs8', pair.privateKey));
      const spki = new Uint8Array(await crypto.subtle.exportKey('spki', pair.publicKey));
      this.privateKey = pair.privateKey;
      this.publicKeySpkiB64 = this.bytesToBase64(spki);
      this.readyUserId = user.id;
      await this.saveLocal(user.id, {
        privateKeyPkcs8: this.bytesToBase64(pkcs8),
        publicKeySpki: this.publicKeySpkiB64
      });
    }

    if (!user.publicKey || user.publicKey !== this.publicKeySpkiB64) {
      try {
        await firstValueFrom(
          this.userWebService.publishPublicKey(this.publicKeySpkiB64!).pipe(take(1))
        );
        this.authService.setUser({ ...user, publicKey: this.publicKeySpkiB64! });
      } catch {
        // Local key still usable for decrypting existing shares
      }
    }

    return this.publicKeySpkiB64;
  }

  async getPrivateKey(): Promise<CryptoKey | null> {
    await this.ensureIdentity();
    return this.privateKey;
  }

  getPublicKeySpki(): string | null {
    return this.publicKeySpkiB64;
  }

  /** C4: async because loadLocal now decrypts with the device key. */
  async exportMaterial(): Promise<{ privateKeyPkcs8: string; publicKeySpki: string } | null> {
    const user = this.authService.currentUser();
    if (!user?.id) return null;
    return this.loadLocal(user.id);
  }

  async importMaterial(material: { privateKeyPkcs8: string; publicKeySpki: string }): Promise<void> {
    const user = this.authService.currentUser();
    if (!user?.id || !material?.privateKeyPkcs8 || !material?.publicKeySpki) {
      throw new Error('Cannot import identity without a signed-in user');
    }
    this.privateKey = await crypto.subtle.importKey(
      'pkcs8',
      this.base64ToBytes(material.privateKeyPkcs8),
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      ['deriveBits']
    );
    this.publicKeySpkiB64 = material.publicKeySpki;
    this.readyUserId = user.id;
    await this.saveLocal(user.id, material);
  }

  /** M12: clear in-memory state AND remove key material from storage. */
  clearSession(): void {
    if (this.readyUserId != null) {
      // C4: remove encrypted v2 blob
      localStorage.removeItem(STORAGE_PREFIX_V2 + this.readyUserId);
      // Also clean up any legacy plaintext blobs that may still exist
      localStorage.removeItem(STORAGE_PREFIX + this.readyUserId);
      localStorage.removeItem(LEGACY_STORAGE_PREFIX + this.readyUserId);
    }
    this.privateKey = null;
    this.publicKeySpkiB64 = null;
    this.readyUserId = null;
  }

  /**
   * C4: Loads identity material.
   * 1. Try v2 key (DEVENC1-encrypted blob in localStorage).
   * 2. Fall back to v1 plaintext — if found, migrate to v2 and delete v1.
   */
  private async loadLocal(userId: number): Promise<{ privateKeyPkcs8: string; publicKeySpki: string } | null> {
    try {
      // --- v2: device-encrypted blob ---
      const v2Raw = localStorage.getItem(STORAGE_PREFIX_V2 + userId);
      if (v2Raw?.startsWith(DEVENC1_PREFIX)) {
        const plain = await this.deviceKey.decrypt(v2Raw);
        return JSON.parse(new TextDecoder().decode(plain));
      }

      // --- v1 / legacy: plaintext migration path ---
      const v1Raw =
        localStorage.getItem(STORAGE_PREFIX + userId) ||
        localStorage.getItem(LEGACY_STORAGE_PREFIX + userId);
      if (v1Raw) {
        const parsed = JSON.parse(v1Raw);
        if (parsed?.privateKeyPkcs8 && parsed?.publicKeySpki) {
          // Migrate: encrypt and save as v2, remove v1 blobs
          await this.saveLocal(userId, parsed);
          localStorage.removeItem(STORAGE_PREFIX + userId);
          localStorage.removeItem(LEGACY_STORAGE_PREFIX + userId);
          return parsed;
        }
      }
    } catch {
      // ignore parse/crypto errors
    }
    return null;
  }

  /** C4: Stores material as a device-key-encrypted blob (DEVENC1:). */
  private async saveLocal(userId: number, value: { privateKeyPkcs8: string; publicKeySpki: string }): Promise<void> {
    const encrypted = await this.deviceKey.encrypt(
      new TextEncoder().encode(JSON.stringify(value))
    );
    localStorage.setItem(STORAGE_PREFIX_V2 + userId, encrypted);
  }

  private bytesToBase64(bytes: Uint8Array): string {
    let binary = '';
    bytes.forEach((b) => {
      binary += String.fromCharCode(b);
    });
    return btoa(binary);
  }

  private base64ToBytes(b64: string): Uint8Array {
    const binary = atob(b64);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      out[i] = binary.charCodeAt(i);
    }
    return out;
  }
}
