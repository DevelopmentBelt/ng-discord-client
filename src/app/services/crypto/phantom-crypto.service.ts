import { Injectable } from '@angular/core';

const PREFIX = 'PHANTOM1:';
const WRAP_PREFIX = 'WRAP1:';

@Injectable({
  providedIn: 'root'
})
export class PhantomCryptoService {
  isCiphertext(value: string): boolean {
    return typeof value === 'string' && value.startsWith(PREFIX);
  }

  async generateRawChannelKey(): Promise<Uint8Array> {
    return crypto.getRandomValues(new Uint8Array(32));
  }

  async importRawKey(raw: Uint8Array | string): Promise<CryptoKey> {
    const bytes = typeof raw === 'string' ? this.base64ToBytes(raw) : raw;
    return crypto.subtle.importKey('raw', bytes, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
  }

  async exportRawKeyBase64(keyBytes: Uint8Array): Promise<string> {
    return this.bytesToBase64(keyBytes);
  }

  async encrypt(plaintext: string, key: CryptoKey): Promise<string> {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(plaintext);
    const cipherBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
    return `${PREFIX}${this.bytesToBase64(iv)}:${this.bytesToBase64(new Uint8Array(cipherBuf))}`;
  }

  async decrypt(payload: string, key: CryptoKey): Promise<string> {
    if (!this.isCiphertext(payload)) {
      return payload;
    }
    const body = payload.slice(PREFIX.length);
    const [ivB64, cipherB64] = body.split(':');
    if (!ivB64 || !cipherB64) {
      throw new Error('Invalid phantom ciphertext');
    }
    const iv = this.base64ToBytes(ivB64);
    const cipher = this.base64ToBytes(cipherB64);
    const plainBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher);
    return new TextDecoder().decode(plainBuf);
  }

  /**
   * Wrap a channel AES key for a recipient using ephemeral ECDH (true E2EE).
   * Server only ever stores the WRAP1 blob — never the raw channel key.
   */
  async wrapKeyForRecipient(rawChannelKey: Uint8Array, recipientPublicKeySpkiB64: string): Promise<string> {
    const recipientKey = await crypto.subtle.importKey(
      'spki',
      this.base64ToBytes(recipientPublicKeySpkiB64),
      { name: 'ECDH', namedCurve: 'P-256' },
      false,
      []
    );
    const ephemeral = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
    const sharedBits = await crypto.subtle.deriveBits(
      { name: 'ECDH', public: recipientKey },
      ephemeral.privateKey,
      256
    );
    const wrapKey = await crypto.subtle.importKey('raw', sharedBits, { name: 'AES-GCM' }, false, ['encrypt']);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const cipherBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, wrapKey, rawChannelKey);
    const ephSpki = new Uint8Array(await crypto.subtle.exportKey('spki', ephemeral.publicKey));
    return `${WRAP_PREFIX}${this.bytesToBase64(ephSpki)}:${this.bytesToBase64(iv)}:${this.bytesToBase64(new Uint8Array(cipherBuf))}`;
  }

  async unwrapKeyFromSender(wrapped: string, privateKey: CryptoKey): Promise<Uint8Array> {
    if (!wrapped.startsWith(WRAP_PREFIX)) {
      throw new Error('Invalid wrapped key');
    }
    const body = wrapped.slice(WRAP_PREFIX.length);
    const [ephB64, ivB64, cipherB64] = body.split(':');
    if (!ephB64 || !ivB64 || !cipherB64) {
      throw new Error('Invalid wrapped key payload');
    }
    const ephPub = await crypto.subtle.importKey(
      'spki',
      this.base64ToBytes(ephB64),
      { name: 'ECDH', namedCurve: 'P-256' },
      false,
      []
    );
    const sharedBits = await crypto.subtle.deriveBits({ name: 'ECDH', public: ephPub }, privateKey, 256);
    const wrapKey = await crypto.subtle.importKey('raw', sharedBits, { name: 'AES-GCM' }, false, ['decrypt']);
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: this.base64ToBytes(ivB64) },
      wrapKey,
      this.base64ToBytes(cipherB64)
    );
    return new Uint8Array(plain);
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
