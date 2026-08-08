import { Injectable } from '@angular/core';

const PREFIX = 'NIMBUSVAULT1:';
/** Legacy Angcord backups still decrypt */
const LEGACY_PREFIXES = ['NIMBUSVAULT1:', 'ANGVAULT1:'];
const PBKDF2_ITERATIONS = 310_000;

export interface VaultPayloadV1 {
  v: 1;
  exportedAt: string;
  identity: {
    privateKeyPkcs8: string;
    publicKeySpki: string;
  };
  channelKeys: Record<string, string>;
  /** AES key for encrypting the local message vault at rest */
  localVaultKey: string;
}

@Injectable({
  providedIn: 'root'
})
export class KeyVaultCryptoService {
  readonly prefix = PREFIX;

  isVaultBlob(value: string): boolean {
    return typeof value === 'string' && LEGACY_PREFIXES.some((p) => value.startsWith(p));
  }

  private vaultBody(blob: string): string {
    for (const prefix of LEGACY_PREFIXES) {
      if (blob.startsWith(prefix)) {
        return blob.slice(prefix.length);
      }
    }
    return blob;
  }

  async encryptPayload(payload: VaultPayloadV1, passphrase: string): Promise<string> {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await this.deriveKey(passphrase, salt);
    const encoded = new TextEncoder().encode(JSON.stringify(payload));
    const cipherBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
    const body = [
      this.bytesToBase64(salt),
      String(PBKDF2_ITERATIONS),
      this.bytesToBase64(iv),
      this.bytesToBase64(new Uint8Array(cipherBuf))
    ].join(':');
    return `${PREFIX}${body}`;
  }

  async decryptPayload(blob: string, passphrase: string): Promise<VaultPayloadV1> {
    if (!this.isVaultBlob(blob)) {
      throw new Error('Invalid vault backup format');
    }
    const parts = this.vaultBody(blob).split(':');
    if (parts.length !== 4) {
      throw new Error('Corrupt vault backup');
    }
    const [saltB64, iterStr, ivB64, cipherB64] = parts;
    const iterations = Number(iterStr) || PBKDF2_ITERATIONS;
    const key = await this.deriveKey(passphrase, this.base64ToBytes(saltB64), iterations);
    try {
      const plainBuf = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: this.base64ToBytes(ivB64) },
        key,
        this.base64ToBytes(cipherB64)
      );
      const parsed = JSON.parse(new TextDecoder().decode(plainBuf)) as VaultPayloadV1;
      if (parsed?.v !== 1 || !parsed.identity?.privateKeyPkcs8 || !parsed.identity?.publicKeySpki) {
        throw new Error('Unsupported vault contents');
      }
      return parsed;
    } catch (err) {
      if (err instanceof Error && err.message === 'Unsupported vault contents') {
        throw err;
      }
      throw new Error('Wrong passphrase or corrupt vault backup');
    }
  }

  private async deriveKey(
    passphrase: string,
    salt: Uint8Array,
    iterations = PBKDF2_ITERATIONS
  ): Promise<CryptoKey> {
    const baseKey = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(passphrase),
      'PBKDF2',
      false,
      ['deriveKey']
    );
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  bytesToBase64(bytes: Uint8Array): string {
    let binary = '';
    bytes.forEach((b) => {
      binary += String.fromCharCode(b);
    });
    return btoa(binary);
  }

  base64ToBytes(b64: string): Uint8Array {
    const binary = atob(b64);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      out[i] = binary.charCodeAt(i);
    }
    return out;
  }
}
