/**
 * TofuService — H4: Trust-on-first-use (TOFU) public-key fingerprinting.
 *
 * On first contact with a user, store a SHA-256 fingerprint of their ECDH
 * public key. On subsequent contacts, compare and surface a warning if it
 * differs. Fingerprints are stored in localStorage (cleartext is fine —
 * they are hashes of public material, not secrets).
 *
 * API:
 *   await tofuService.checkKey(userId, spkiB64)
 *     → { status: 'first-seen' | 'ok' | 'changed', fingerprint: string, previous?: string }
 *
 *   tofuService.clearUser(userId) — call on logout for privacy
 */

import { Injectable } from '@angular/core';

export type TofuStatus = 'first-seen' | 'ok' | 'changed';

export interface TofuResult {
  status: TofuStatus;
  fingerprint: string;
  previous?: string;
}

const TOFU_STORE_KEY = 'nimbus-tofu-fingerprints';

@Injectable({
  providedIn: 'root'
})
export class TofuService {

  /**
   * Check (and record) the SPKI fingerprint for userId.
   * Call this before using a peer's public key for encryption.
   */
  async checkKey(userId: number, spkiB64: string): Promise<TofuResult> {
    const fingerprint = await this.fingerprintSpki(spkiB64);
    const store = this.readStore();
    const previous = store[String(userId)];

    if (!previous) {
      store[String(userId)] = fingerprint;
      this.writeStore(store);
      return { status: 'first-seen', fingerprint };
    }

    if (previous === fingerprint) {
      return { status: 'ok', fingerprint };
    }

    // Key changed — record new fingerprint but surface the change
    store[String(userId)] = fingerprint;
    this.writeStore(store);
    return { status: 'changed', fingerprint, previous };
  }

  /**
   * Return the stored fingerprint for userId, or null if not seen before.
   */
  getStored(userId: number): string | null {
    return this.readStore()[String(userId)] ?? null;
  }

  /** Remove a user's TOFU record (e.g. they explicitly re-verified). */
  clearUser(userId: number): void {
    const store = this.readStore();
    delete store[String(userId)];
    this.writeStore(store);
  }

  /** Format a fingerprint for display (groups of 4 hex chars separated by spaces). */
  formatFingerprint(fp: string): string {
    return fp.match(/.{1,4}/g)?.join(' ') ?? fp;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /** Compute SHA-256 of the raw SPKI bytes, return lowercase hex string. */
  private async fingerprintSpki(spkiB64: string): Promise<string> {
    const bytes = this.base64ToBytes(spkiB64);
    const hashBuf = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(hashBuf))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private readStore(): Record<string, string> {
    try {
      const raw = localStorage.getItem(TOFU_STORE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  private writeStore(store: Record<string, string>): void {
    try {
      localStorage.setItem(TOFU_STORE_KEY, JSON.stringify(store));
    } catch { /* ignore quota */ }
  }

  private base64ToBytes(b64: string): Uint8Array {
    const binary = atob(b64);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
    return out;
  }
}
