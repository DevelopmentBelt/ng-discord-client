import { Injectable } from '@angular/core';
import { firstValueFrom, take } from 'rxjs';
import { UserWebService } from '../user-web-service/user-web.service';
import { AuthService } from '../auth-service/auth.service';

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
    private authService: AuthService
  ) {}

  async ensureIdentity(): Promise<string | null> {
    const user = this.authService.currentUser();
    if (!user?.id) {
      return null;
    }
    if (this.readyUserId === user.id && this.privateKey && this.publicKeySpkiB64) {
      return this.publicKeySpkiB64;
    }

    const stored = this.loadLocal(user.id);
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
      this.saveLocal(user.id, {
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

  exportMaterial(): { privateKeyPkcs8: string; publicKeySpki: string } | null {
    const user = this.authService.currentUser();
    if (!user?.id) {
      return null;
    }
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
    this.saveLocal(user.id, material);
  }

  clearSession(): void {
    this.privateKey = null;
    this.publicKeySpkiB64 = null;
    this.readyUserId = null;
  }

  private loadLocal(userId: number): { privateKeyPkcs8: string; publicKeySpki: string } | null {
    try {
      const raw =
        localStorage.getItem(STORAGE_PREFIX + userId) ||
        localStorage.getItem(LEGACY_STORAGE_PREFIX + userId);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw);
      if (parsed?.privateKeyPkcs8 && parsed?.publicKeySpki) {
        // Migrate legacy Angcord key storage
        if (!localStorage.getItem(STORAGE_PREFIX + userId)) {
          this.saveLocal(userId, parsed);
        }
        return parsed;
      }
    } catch {
      // ignore
    }
    return null;
  }

  private saveLocal(userId: number, value: { privateKeyPkcs8: string; publicKeySpki: string }): void {
    localStorage.setItem(STORAGE_PREFIX + userId, JSON.stringify(value));
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
