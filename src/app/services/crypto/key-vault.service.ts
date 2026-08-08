import { Injectable, signal } from '@angular/core';
import { firstValueFrom, take } from 'rxjs';
import { AuthService } from '../auth-service/auth.service';
import { UserWebService } from '../user-web-service/user-web.service';
import { IdentityKeyService } from './identity-key.service';
import { PhantomKeyService } from './phantom-key.service';
import { KeyVaultCryptoService, VaultPayloadV1 } from './key-vault-crypto.service';
import { LocalMessageVaultService } from './local-message-vault.service';

@Injectable({
  providedIn: 'root'
})
export class KeyVaultService {
  readonly serverBackupAt = signal<string | null>(null);
  readonly busy = signal(false);

  constructor(
    private authService: AuthService,
    private userWebService: UserWebService,
    private identityKeys: IdentityKeyService,
    private phantomKeys: PhantomKeyService,
    private vaultCrypto: KeyVaultCryptoService,
    private localVault: LocalMessageVaultService
  ) {}

  async refreshServerStatus(): Promise<void> {
    try {
      const resp = await firstValueFrom(this.userWebService.getKeyVault().pipe(take(1)));
      this.serverBackupAt.set(resp?.updatedAt || null);
    } catch {
      this.serverBackupAt.set(null);
    }
  }

  async createEncryptedBackup(passphrase: string): Promise<string> {
    if (!passphrase || passphrase.length < 8) {
      throw new Error('Passphrase must be at least 8 characters');
    }
    const user = this.authService.currentUser();
    if (!user?.id) {
      throw new Error('Not signed in');
    }

    await this.identityKeys.ensureIdentity();
    const identity = this.identityKeys.exportMaterial();
    if (!identity) {
      throw new Error('No identity key on this device to back up');
    }

    const localVaultKey =
      (await this.localVault.getOrCreateLocalVaultKeyB64(user.id)) ||
      this.vaultCrypto.bytesToBase64(crypto.getRandomValues(new Uint8Array(32)));

    const payload: VaultPayloadV1 = {
      v: 1,
      exportedAt: new Date().toISOString(),
      identity,
      channelKeys: this.phantomKeys.exportAllRawKeys(),
      localVaultKey
    };

    return this.vaultCrypto.encryptPayload(payload, passphrase);
  }

  async uploadBackup(passphrase: string): Promise<void> {
    this.busy.set(true);
    try {
      const blob = await this.createEncryptedBackup(passphrase);
      const resp = await firstValueFrom(
        this.userWebService.putKeyVault(blob).pipe(take(1))
      );
      this.serverBackupAt.set(resp?.updatedAt || new Date().toISOString());
    } finally {
      this.busy.set(false);
    }
  }

  async downloadAndRestore(passphrase: string): Promise<void> {
    this.busy.set(true);
    try {
      let resp: { vaultBlob?: string | null; updatedAt?: string | null };
      try {
        resp = await firstValueFrom(this.userWebService.getKeyVault().pipe(take(1)));
      } catch (err: any) {
        throw new Error(err?.error?.message || 'Could not reach the vault backup API');
      }
      if (!resp?.vaultBlob) {
        throw new Error('No server vault backup found — upload one first');
      }
      await this.restoreFromBlob(resp.vaultBlob, passphrase);
      this.serverBackupAt.set(resp.updatedAt || null);
    } finally {
      this.busy.set(false);
    }
  }

  async restoreFromBlob(blob: string, passphrase: string): Promise<void> {
    if (!passphrase || passphrase.length < 8) {
      throw new Error('Passphrase must be at least 8 characters');
    }
    const user = this.authService.currentUser();
    if (!user?.id) {
      throw new Error('Not signed in');
    }

    const payload = await this.vaultCrypto.decryptPayload(blob, passphrase);
    await this.identityKeys.importMaterial(payload.identity);
    await this.phantomKeys.importRawKeys(payload.channelKeys || {});
    if (payload.localVaultKey) {
      this.localVault.setLocalVaultKeyB64(user.id, payload.localVaultKey);
    }
    // Re-publish public key so this device receives new channel shares under the restored identity
    await this.identityKeys.ensureIdentity();
  }

  async exportBackupFile(passphrase: string): Promise<void> {
    const blob = await this.createEncryptedBackup(passphrase);
    const user = this.authService.currentUser();
    const filename = `angcord-vault-${user?.username || 'backup'}-${Date.now()}.angvault`;
    const file = new Blob([blob], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    a.style.display = 'none';
    // Browsers often ignore click() unless the anchor is in the document.
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Delay revoke so the download can start.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async importBackupFile(file: File, passphrase: string): Promise<void> {
    this.busy.set(true);
    try {
      const text = (await file.text()).trim();
      await this.restoreFromBlob(text, passphrase);
    } finally {
      this.busy.set(false);
    }
  }

  async deleteServerBackup(): Promise<void> {
    this.busy.set(true);
    try {
      await firstValueFrom(this.userWebService.deleteKeyVault().pipe(take(1)));
      this.serverBackupAt.set(null);
    } finally {
      this.busy.set(false);
    }
  }
}
