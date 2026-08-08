import { Injectable } from '@angular/core';

const PREFIX = 'PHANTOM1:';

@Injectable({
  providedIn: 'root'
})
export class PhantomCryptoService {
  isCiphertext(value: string): boolean {
    return typeof value === 'string' && value.startsWith(PREFIX);
  }

  async importRawKey(base64Key: string): Promise<CryptoKey> {
    const raw = this.base64ToBytes(base64Key);
    return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
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
