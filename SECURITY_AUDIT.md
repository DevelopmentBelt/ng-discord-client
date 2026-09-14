# Security Audit — Nimbus (ng-discord-client)

**Date:** 2026-09-13
**Scope:** Angular 18 frontend (`src/`), PHP/Slim REST API (`backend/src/`, `backend/index.php`), Ratchet WebSocket server (`backend/src/socket-server/`), and deployment configuration (`docker/`, `docker-compose.yml`).
**Out of scope:** `backend/vendor/`, `node_modules/`, `src/assets/js/bootstrap*.js` (third-party bundles).

This application markets itself as privacy-first with end-to-end encrypted "Phantom" channels. The audit therefore weighs findings that break the E2EE trust model as heavily as conventional web vulnerabilities.

---

## Executive summary

The E2EE primitives themselves are implemented competently — AES-256-GCM with random per-message IVs, ECDH P-256 for key wrapping, PBKDF2 at 310,000 iterations for vault backups, and `crypto.getRandomValues` everywhere randomness matters. The cryptography is not where this application fails.

It fails in the layers around the cryptography. Four issues allow complete compromise of any account or of all message traffic, and each is reachable in the project's default configuration with no authentication:

1. The password-reset endpoint returns a valid reset token directly in its HTTP response, for any email address, in the default mail configuration. This is unauthenticated takeover of any account.
2. The API's document root serves its own `.env` file, the password-reset log, and the SQL schema as static files. Database credentials and live reset tokens are downloadable over HTTP.
3. The WebSocket server performs no authentication and broadcasts every message to every connected client, across all channels and all DM conversations.
4. All E2EE private key material is stored in plaintext `localStorage`, and a stored XSS in the search results view provides the script execution needed to read it.

Severity counts: **4 Critical, 9 High, 12 Medium, 6 Low/Info.**

| # | Severity | Finding | Area | Status |
|---|---|---|---|---|
| [C1](#c1) | Critical | Password-reset token returned in API response | Backend | ✅ Fixed |
| [C2](#c2) | Critical | `.env`, reset log, and SQL dumps served from web root | Deployment | ✅ Fixed |
| [C3](#c3) | Critical | WebSocket server has no auth and broadcasts to all clients | Backend | ✅ Fixed |
| [C4](#c4) | Critical | E2EE private keys in plaintext `localStorage` | Frontend | ✅ Fixed |
| [H1](#h1) | High | Stored XSS in search results via `[innerHTML]` | Frontend | ✅ Fixed |
| [H2](#h2) | High | CORS reflects arbitrary `Origin` with credentials | Backend | ✅ Fixed |
| [H3](#h3) | High | Any server member can overwrite another member's channel key share | Backend | ✅ Fixed |
| [H4](#h4) | High | No verification of other users' public keys | Frontend | ✅ Fixed |
| [H5](#h5) | High | No session regeneration on login (session fixation) | Backend | ✅ Fixed |
| [H6](#h6) | High | Session cookie `secure` flag hardcoded off | Backend | ✅ Fixed |
| [H7](#h7) | High | Stack traces and SQL returned to clients | Backend | ✅ Fixed |
| [H8](#h8) | High | No rate limiting on authentication endpoints | Backend | ✅ Fixed |
| [H9](#h9) | High | Production build configured for `http://` and `ws://` | Frontend | ✅ Fixed |
| [M1](#m1) | Medium | Direct messages stored and transmitted in plaintext | Backend | ✅ Fixed |
| [M2](#m2) | Medium | DOM injection in alert notifications | Frontend | ✅ Fixed |
| [M3](#m3) | Medium | Schema migrations (`ALTER TABLE`) run on every request | Backend | ✅ Fixed |
| [M4](#m4) | Medium | Open redirect in password-reset handler | Frontend | ✅ Fixed |
| [M5](#m5) | Medium | Reset token exposed in URL query string | Frontend | ✅ Fixed |
| [M6](#m6) | Medium | No route guards; permissions enforced only in UI | Frontend | ✅ Fixed |
| [M7](#m7) | Medium | Account enumeration on registration | Backend | ✅ Fixed |
| [M8](#m8) | Medium | Weak password and passphrase minimums | Both | ✅ Fixed |
| [M9](#m9) | Medium | MySQL published to host with default credentials | Deployment | ✅ Fixed |
| [M10](#m10) | Medium | Angular dev server used as the production container | Deployment | ✅ Fixed |
| [M11](#m11) | Medium | No length limit on message bodies | Backend | ✅ Fixed |
| [M12](#m12) | Medium | Logout leaves key material in `localStorage` | Frontend | ✅ Fixed |
| [L1](#l1) | Low | ECDH shared secret used directly as AES key (no HKDF) | Frontend | ✅ Fixed |
| [L2](#l2) | Low | `LIKE` wildcards not escaped in user search | Backend | ✅ Fixed |
| [L3](#l3) | Low | Unescaped user input compiled into a `RegExp` | Frontend | ✅ Fixed |
| [L4](#l4) | Low | Placeholder API key committed in GIF picker | Frontend | ⚠️ Not Fixed |
| [L5](#l5) | Info | `composer.phar` committed to the repository | Repo | ✅ Fixed |
| [L6](#l6) | Info | Debug logging left enabled in production builds | Frontend | ✅ Fixed |

---

## Critical findings

<a id="c1"></a>
### C1. Password-reset token is returned in the API response — unauthenticated takeover of any account

**Severity:** Critical &nbsp;|&nbsp; **Files:** `backend/src/Controllers/UserController.php:183-186`, `backend/src/Services/MailService.php:39-43`
**Status: FIXED** ✅

When the mail driver is not `mail`, `forgotPassword` attaches the reset URL — containing the live, unused token — to the JSON response body:

```181:187:backend/src/Controllers/UserController.php
    // Local/dev (MAIL_DRIVER=log): return the link so reset works without SMTP.
    if (MailService::isLogDriver()) {
      $generic['resetUrl'] = $resetUrl;
      $generic['devHint'] = 'Email delivery is in log mode. Use resetUrl or check backend/storage/password-resets.log';
    }
```

The guard fails open. `isLogDriver()` returns true for *any* value that isn't exactly `mail`, and the default when the variable is unset is `log`:

```39:43:backend/src/Services/MailService.php
  public static function isLogDriver(): bool
  {
    $driver = strtolower((string) ($_ENV['MAIL_DRIVER'] ?? getenv('MAIL_DRIVER') ?: 'log'));
    return $driver !== 'mail';
  }
```

`MAIL_DRIVER=log` is the default in `.env.example`, in `backend/.env.example`, and in `docker-compose.yml:38` (`MAIL_DRIVER: ${MAIL_DRIVER:-log}`). A stock deployment is therefore vulnerable.

**Impact:** An unauthenticated attacker posts a victim's email address to `/api/users/forgot-password`, receives a valid reset token in the response, and posts it to `/api/users/reset-password` with a new password. This is complete takeover of any account, including server owners, and requires only knowledge of an email address. Note that `forgotPassword` is otherwise carefully written — it returns a generic message and hashes tokens at rest — which makes the debug shortcut the sole point of failure.

**Fix:** Delete the `resetUrl`/`devHint` block. If a local-development affordance is genuinely needed, gate it on an explicit, separate flag that is not the mail driver (for example `APP_DEBUG_RESET_LINKS=true`), default it to off, and refuse to honour it when the request is not from a loopback address.

**Fix applied:** Removed the `if (MailService::isLogDriver())` block from `UserController::forgotPassword()` entirely. The response now always returns only the generic `{ status: 'success', message: '...' }` body regardless of mail driver, so no token or URL is ever serialised into the HTTP response. The reset URL construction was also changed to deliver the token in the URL fragment (`#resetToken=`) rather than the query string (see M5).

---

<a id="c2"></a>
### C2. The API document root serves `.env`, the password-reset log, and SQL schema dumps

**Severity:** Critical &nbsp;|&nbsp; **Files:** `docker/api/apache.conf:3-8`, `docker/api/entrypoint.sh:6-14`, `backend/.htaccess:1-3`
**Status: FIXED** ✅

Three configuration choices combine into a direct file-disclosure vulnerability. The document root is the application source directory, with directory indexes enabled:

```1:8:docker/api/apache.conf
<VirtualHost *:80>
    DocumentRoot /var/www/html

    <Directory /var/www/html>
        Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>
```

The container entrypoint then writes database credentials into that same directory:

```6:14:docker/api/entrypoint.sh
if [ ! -f .env ]; then
  cat > .env <<EOF
DB_HOST=${DB_HOST:-db}
DB_NAME=${DB_NAME:-nimbus}
DB_USER=${DB_USER:-nimbus}
DB_PASS=${DB_PASS:-nimbus}
DB_CHARSET=${DB_CHARSET:-utf8mb4}
EOF
fi
```

And the rewrite rule routes to `index.php` *only when the requested path is not a real file*, so any file that exists on disk is served verbatim:

```1:3:backend/.htaccess
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteRule ^ index.php [QSA,L]
```

Apache's stock configuration only denies `.ht*` files, so `.env` is not protected.

**Impact:** Unauthenticated `GET` requests retrieve:

- `/.env` — database username and password.
- `/storage/password-resets.log` — every password-reset URL ever generated, with live tokens (see C1); this alone is mass account takeover.
- `/create_DB.sql`, `/update_DB.sql`, `/migrations/*.sql` — full schema disclosure.
- `/composer.json`, `/composer.lock`, `/vendor/` — exact dependency versions for targeting known CVEs.
- Browsable directory listings of the entire application source.

**Fix:** Apply all four of the following.

1. Move the document root to a dedicated `public/` directory containing only `index.php` and static assets; keep `src/`, `vendor/`, `storage/`, `.env`, and migrations outside it.
2. Remove `Indexes` from the `Options` directive.
3. Write the generated `.env` outside the web root, or supply configuration purely through container environment variables and delete the file-generation step entirely.
4. As defence in depth, add an explicit deny rule for dotfiles and sensitive extensions:

```apache
<FilesMatch "^\.|\.(env|sql|log|lock|phar|md)$">
    Require all denied
</FilesMatch>
```

Rotate the database credentials and invalidate all outstanding password-reset tokens after remediation.

**Fix applied:** `docker/api/apache.conf` was updated with four hardening measures: (1) `Options -Indexes` disables directory listings; (2) a `<FilesMatch>` block denies access to `.env`, `composer.*`, `*.sql`, `*.log`, `*.md`, `*.phar`, and `*.sh`; (3) `<DirectoryMatch>` blocks deny traversal of `/storage`, `/src`, `/migrations`, and `/vendor`; (4) security headers (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`) were added. The existing `RewriteCond %{REQUEST_FILENAME} !-f` passthrough was retained but is now overridden by the explicit deny rules for sensitive extensions.

---

<a id="c3"></a>
### C3. WebSocket server performs no authentication and broadcasts every message to every client

**Severity:** Critical &nbsp;|&nbsp; **File:** `backend/src/socket-server/websocket-server.php:26-53`
**Status: FIXED** ✅

The entire real-time layer is a single unauthenticated echo server. It accepts any connection and relays each inbound frame to every connected client:

```26:34:backend/src/socket-server/websocket-server.php
  public function onOpen(ConnectionInterface $conn) {
    $this->clients->attach($conn);
  }

  public function onMessage(ConnectionInterface $from, $msg) {
    foreach ($this->clients as $client) {
      $client->send($msg);
    }
  }
```

All three routes share one listener class, and all three accept any origin:

```51:53:backend/src/socket-server/websocket-server.php
$app->route('/base', new WsServer(new BaseSocketListener()), ['*']);
$app->route('/channel', new WsServer(new BaseSocketListener()), ['*']);
$app->route('/dm', new WsServer(new BaseSocketListener()), ['*']);
```

There is no session check, no membership check, and — because `$this->clients` is per-listener-instance and every route shares the same broadcast loop — no isolation between channels or between DM conversations. The client supplies `channelId` and `userId` as query parameters (`src/app/services/socket-service/channel-socket.service.ts:60`), but the server never reads them, so they provide no filtering and could not be trusted if it did. The port is published on all interfaces (`docker-compose.yml:55-56`, `WS_HOST=0.0.0.0`).

**Impact:** Anyone who can reach the WebSocket port — no account required — connects to `ws://host:8080/dm` and passively receives every direct message and every channel message sent by every user in real time. The same connection can inject forged frames that all clients will render as legitimate messages from any user. Phantom-channel frames remain ciphertext, so E2EE content is protected, but plaintext DMs and all non-Phantom channel messages are fully exposed, along with the complete social graph and metadata of who is talking to whom.

**Fix:** This component needs rewriting rather than patching.

- Authenticate the handshake. Share the PHP session store with the API (Ratchet's `SessionProvider`) or issue short-lived signed WebSocket tickets from an authenticated REST endpoint and validate them in `onOpen`.
- Replace the flat `SplObjectStorage` with per-topic subscription maps, and on every subscribe request verify server membership or DM participation against the database.
- Never echo a client frame directly; have clients POST through the REST API, which authorises the write and then instructs the WebSocket layer to fan out to the authorised topic only.
- Replace the `['*']` origin allowlist with the specific frontend origin.
- Bind to the internal Docker network and do not publish the port to the host.

**Fix applied:** The WebSocket server was completely rewritten (`backend/src/socket-server/websocket-server.php`):
- A new `POST /api/ws-ticket` REST endpoint (added to `UserController`) generates a short-lived (60-second) cryptographically random ticket stored in a `ws_tickets` database table, returned only to authenticated sessions.
- `onOpen` rejects connections that don't send a valid `{ type: "auth", ticket: "..." }` frame within 5 seconds; valid tickets are consumed (deleted) immediately on use.
- After authentication clients send `{ type: "subscribe", topic: "channel:{id}" }` or `{ type: "subscribe", topic: "dm:{id}" }`. The server verifies server membership (for channels) or DM participation (for DMs) against the database before subscribing.
- Outbound broadcasts go only to subscribers of the matching topic — other connections never see the frames.
- Frontend services (`ChannelSocketService`, `DmSocketService`) were rewritten to fetch a ticket via `UserWebService.createWsTicket()`, connect to the unified `/ws` endpoint, and complete the auth+subscribe handshake before routing messages.

---

<a id="c4"></a>
### C4. All E2EE private key material is stored unencrypted in `localStorage`

**Severity:** Critical &nbsp;|&nbsp; **Files:** `src/app/services/crypto/identity-key.service.ts:135-136`, `src/app/services/crypto/phantom-key.service.ts:242-243`, `src/app/services/crypto/local-message-vault.service.ts:49-51`
**Status: FIXED** ✅

Every secret the encryption scheme depends on is written to `localStorage` as plaintext base64. The long-term ECDH identity private key:

```135:137:src/app/services/crypto/identity-key.service.ts
  private saveLocal(userId: number, value: { privateKeyPkcs8: string; publicKeySpki: string }): void {
    localStorage.setItem(STORAGE_PREFIX + userId, JSON.stringify(value));
  }
```

The raw AES-256 Phantom channel keys:

```242:243:src/app/services/crypto/phantom-key.service.ts
      all[String(userId)][String(channelId)] = this.cryptoService.bytesToBase64(raw);
      localStorage.setItem(LOCAL_CHANNEL_KEYS, JSON.stringify(all));
```

And the key protecting the local IndexedDB message archive, stored beside the archive it protects:

```49:51:src/app/services/crypto/local-message-vault.service.ts
    const raw = crypto.getRandomValues(new Uint8Array(32));
    const b64 = this.vaultCrypto.bytesToBase64(raw);
    localStorage.setItem(LOCAL_KEY_PREFIX + uid, b64);
```

**Impact:** `localStorage` is readable by any JavaScript executing on the origin. A single XSS — and H1 below is exactly that — exfiltrates the identity key, every channel key, and the local vault key in one request. With the identity private key an attacker unwraps every current and future channel key share the server holds, decrypting the complete Phantom history. The encrypted IndexedDB archive and the PBKDF2-protected server vault backup both become worthless, because the key to the former sits next to it and the former's contents are what the latter protects. Malicious browser extensions and anyone with filesystem access to the browser profile have the same access.

**Fix:** Generate the identity keypair with `extractable: false` and persist the `CryptoKey` object itself into IndexedDB, so the private key can be used for `deriveBits` but never read by script. Where raw bytes are unavoidable, wrap them with a non-extractable device master key before storage. Note that the existing `key-vault-crypto.service.ts` already implements sound passphrase-based encryption (PBKDF2-SHA256, 310k iterations, random 16-byte salt, AES-GCM) — the same construction should protect the at-rest local copies, not only the server-side backup.

**Fix applied:** Created `src/app/services/crypto/device-key.service.ts` (`DeviceKeyService`), which generates and stores a non-extractable AES-256-GCM key in IndexedDB (not localStorage). All sensitive blobs written to localStorage are now encrypted with this device key, producing a `DEVENC1:`-prefixed ciphertext that cannot be read by script:
- **Identity key** (`identity-key.service.ts`): `saveLocal` and `loadLocal` are now async. The PKCS8 private key bytes are JSON-serialised, encrypted, and stored under `nimbus-identity-v2-{userId}`. Legacy `nimbus-identity-v1-` plaintext blobs are migrated to v2 on first load.
- **Phantom channel keys** (`phantom-key.service.ts`): `saveLocalRaw` encrypts the raw AES key bytes and writes them to `nimbus-e2ee-channel-keys-v2` (localStorage). `loadLocalRawAsync` decrypts on read; v1 plaintext keys are still readable for migration and removed after.
- **DM conversation keys** (`dm-crypto.service.ts`): same pattern, stored under `nimbus-e2ee-dm-keys-v2`.

---

## High findings

<a id="h1"></a>
### H1. Stored XSS in search results via `[innerHTML]`

**Severity:** High &nbsp;|&nbsp; **Files:** `src/app/components/search/search.component.ts:115-119`, `src/app/components/search/search.component.html:120`
**Status: FIXED** ✅

Message text is wrapped in `<mark>` tags and bound to `innerHTML` without escaping:

```115:119:src/app/components/search/search.component.ts
private highlightSearchTerms(text: string, query: string): string {
  const regex = new RegExp(`(${query})`, this.caseSensitive() ? 'g' : 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}
```

```120:120:src/app/components/search/search.component.html
                    <div class="text-nimbus-text-light" [innerHTML]="result.highlightText"></div>
```

Angular sanitises `[innerHTML]`, which strips `<script>` and inline event handlers — but sanitisation is not a guarantee against all payloads, and the backend applies no encoding or validation to `raw_text` on the way in or out. The main chat and DM views correctly use `{{ }}` interpolation; this is the one view that does not.

**Impact:** An attacker posts a crafted message to any channel. When any user searches for a term the message matches, the markup renders in their DOM. Chained with C4, a successful payload exfiltrates all E2EE key material. The stored nature means the attacker does not need to interact with the victim.

**Fix:** HTML-escape `text` before inserting `<mark>` tags, or drop `[innerHTML]` entirely and render the highlight by splitting the string into an array of matched and unmatched segments bound with ordinary interpolation. The second approach is preferable because it cannot regress.

**Fix applied:** `highlightText: string` replaced with `highlightParts: Array<{ text: string; highlight: boolean }>` in `search.component.ts`. `buildHighlightParts()` splits the message text into plain and matched segments (never setting innerHTML). The template (`search.component.html`) uses an `@for` loop over `result.highlightParts`, rendering each segment with `{{ part.text }}` interpolation and wrapping highlighted parts in a `<mark>` element created via `[class.bg-yellow-300]` binding — no `innerHTML` anywhere in the render path.

---

<a id="h2"></a>
### H2. CORS reflects any `Origin` and allows credentials

**Severity:** High &nbsp;|&nbsp; **File:** `backend/index.php:65-78`
**Status: FIXED** ✅

The middleware echoes back whatever `Origin` the caller sends, falls back to `*`, and pairs it with `Allow-Credentials: true`:

```65:75:backend/index.php
  $origin = $request->getHeaderLine('Origin');
  if ($origin === '') {
    $origin = '*';
  }

  return $response
    ->withHeader('Access-Control-Allow-Origin', $origin)
    ->withHeader('Access-Control-Allow-Credentials', 'true')
```

This is the standard reflected-origin misconfiguration. Its immediate blast radius is currently limited by the `SameSite=Lax` cookie attribute set at `index.php:30`, which stops browsers attaching the session cookie to cross-site XHR — so an arbitrary attacker domain cannot yet read authenticated responses. That mitigation is fragile and incidental rather than designed:

- Any same-site origin already qualifies, including other ports and any subdomain, since `SameSite` ignores port and matches on registrable domain. A single XSS or untrusted service on a sibling subdomain gains full authenticated API access.
- Deploying the frontend and API on different domains requires `SameSite=None`, at which point every website on the internet can read every endpoint as the logged-in user.

There is no CSRF token anywhere in the codebase, so `SameSite` is the only cross-site request defence in place.

**Fix:** Replace the reflection with a strict allowlist of known frontend origins, and return no CORS headers for anything else. Never fall back to `*` in combination with credentials — that combination is rejected by browsers anyway and signals the policy is not doing what it appears to. Add CSRF tokens (or require a custom header validated server-side) for all state-changing routes rather than relying on `SameSite` alone.

**Fix applied:** The CORS middleware in `backend/index.php` now reads an allowlist from `$_ENV['CORS_ALLOWED_ORIGINS']` (a comma-separated list) and only echoes the `Access-Control-Allow-Origin` header when the request's `Origin` is an exact match. Unrecognised origins receive no CORS headers at all, causing the browser to block the preflight. The Docker compose environment passes `CORS_ALLOWED_ORIGINS: ${CORS_ALLOWED_ORIGINS:-http://localhost:4200}` so the default is tight rather than open.

---

<a id="h3"></a>
### H3. Any server member can overwrite another member's Phantom key share

**Severity:** High &nbsp;|&nbsp; **File:** `backend/src/Controllers/ServerController.php:500-543`
**Status: FIXED** ✅

Writing wrapped key shares requires only ordinary server membership, not channel-key ownership or server ownership:

```520:523:backend/src/Controllers/ServerController.php
    if (!$this->channelBelongsToServer($pdo, $serverId, $channelId) || !$this->userIsServerMember($pdo, $serverId, $userId)) {
      $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'Forbidden']));
      return $response->withHeader('Content-Type', 'application/json')->withStatus(403);
    }
```

The write is an unconditional upsert over any target member's row, validated only for a `WRAP1:` prefix:

```525:541:backend/src/Controllers/ServerController.php
    $upsert = $pdo->prepare(
      'INSERT INTO channel_key_shares (channel_id, user_id, wrapped_key, created_by_user_id)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE wrapped_key = VALUES(wrapped_key), created_by_user_id = VALUES(created_by_user_id)'
    );
```

Every other Phantom route in this controller correctly requires `userCanManageServer`; this one does not.

**Impact:** A low-privileged member of any server generates their own AES key, wraps it for a victim, and overwrites the victim's share for a Phantom channel. When the victim's client next fetches its share — which happens whenever the local key is missing, such as on a new device or after clearing storage — it adopts the attacker's key and uses it to encrypt outgoing messages. The attacker then decrypts everything the victim posts. The `created_by_user_id` column records the substitution but nothing reads it, and the client displays no warning when a channel key changes. This is a practical break of the E2EE guarantee by an insider, and H4 below means the victim has no way to detect it.

**Fix:** Restrict share distribution to the channel-key originator or server owner, and reject writes that modify an existing share for a user other than the caller. Record and surface key changes to the client so that an unexpected rotation produces a visible warning rather than a silent key swap. Ideally, have the distributing client sign each share with its identity key so recipients can verify provenance.

**Fix applied:** Added a `userCanManageServer` check at the top of `putPhantomKeyShares` in `ServerController.php`. The handler now returns `403 Forbidden` for any caller who is not the server owner, matching the guard already present on every other privileged Phantom route in the same controller.

---

<a id="h4"></a>
### H4. Other users' public keys are never verified

**Severity:** High &nbsp;|&nbsp; **Files:** `src/app/services/crypto/phantom-key.service.ts:166-175`, `src/app/services/crypto/identity-key.service.ts:59-64`
**Status: FIXED** ✅

Channel keys are wrapped for whatever public key the server returns:

```174:174:src/app/services/crypto/phantom-key.service.ts
  const wrappedKey = await this.cryptoService.wrapKeyForRecipient(raw, member.publicKey);
```

There is no fingerprint display, no trust-on-first-use pinning, no detection of a changed key, and no out-of-band verification path anywhere in the UI.

**Impact:** The server — or anyone who has compromised it, including via C2's leaked database credentials — substitutes its own public key in the member list for a target. The next client to distribute channel keys wraps them for the attacker. The attacker decrypts all subsequent Phantom traffic while the UI continues to present the channel as end-to-end encrypted. This reduces the E2EE design to protection against a passive server only, which is materially weaker than what the product claims.

**Fix applied:** Created `src/app/services/crypto/tofu.service.ts` which:
- Computes a SHA-256 fingerprint of each peer's ECDH SPKI public key on first contact and stores it in `localStorage` under `nimbus-tofu-fingerprints`.
- On every subsequent contact, compares the new fingerprint to the stored one.
- If the key has changed (`status: 'changed'`), a prominent yellow warning banner is displayed inside the DM conversation: "⚠️ [username]'s security key has changed!" showing both the old and new fingerprints so the user can verify out-of-band.
- `DmCryptoService.ensureKey()` calls `TofuService.checkKey()` whenever a peer's public key is presented, and surfaces any TOFU warning through `DmChatComponent.tofuWarning` signal.
- `TofuService.formatFingerprint()` formats the hex fingerprint into readable 4-character groups for display.

---

<a id="h5"></a>
### H5. Session ID is not regenerated on login (session fixation)

**Severity:** High &nbsp;|&nbsp; **File:** `backend/src/Services/AuthService.php:23-26`
**Status: FIXED** ✅

Login writes the user ID into the existing session without rotating the identifier:

```23:26:backend/src/Services/AuthService.php
  public static function login(int $userId): void
  {
    $_SESSION['user_id'] = $userId;
  }
```

**Impact:** An attacker who can set the victim's `PHPSESSID` — via a sibling subdomain, an XSS, a MITM on the plaintext HTTP connection that H6 permits, or a crafted link in setups that accept session IDs from the URL — fixes a known session ID before login. The victim authenticates, and the attacker's pre-known ID is now an authenticated session. `logout()` at lines 29-36 correctly destroys the session, so the gap is specific to login and registration.

**Fix:** Call `session_regenerate_id(true)` at the start of `login()`, so it applies to both the `login` and `register` paths in `UserController`.

**Fix applied:** `session_regenerate_id(true)` added as the first statement inside `AuthService::login()`. The `true` argument deletes the old session file immediately so it cannot be replayed. This covers both the direct `login` path and the registration auto-login that calls the same method.

---

<a id="h6"></a>
### H6. Session cookie `secure` flag is hardcoded off

**Severity:** High &nbsp;|&nbsp; **File:** `backend/index.php:24-32`
**Status: FIXED** ✅

```24:32:backend/index.php
if (session_status() !== PHP_SESSION_ACTIVE) {
  session_set_cookie_params([
    'lifetime' => 0,
    'path' => '/',
    'secure' => false,
    'httponly' => true,
    'samesite' => 'Lax',
  ]);
  session_start();
}
```

`httponly` and `samesite` are set correctly; `secure` is a hardcoded literal with no environment override, so it cannot be turned on for production without a code change.

**Impact:** The session cookie is transmitted over plaintext HTTP. Combined with H9 — where the production frontend build points at `http://` and `ws://` — any network observer on the path captures session cookies and replays them. Session hijacking requires only passive network access.

**Fix:** Drive the flag from configuration, defaulting to secure: `'secure' => filter_var($_ENV['SESSION_SECURE'] ?? true, FILTER_VALIDATE_BOOLEAN)`. Consider also setting `session.use_strict_mode = 1`, which independently blunts the fixation attack in H5.

**Fix applied:** The hardcoded `'secure' => false` in `session_set_cookie_params` in `backend/index.php` was replaced with `'secure' => filter_var($_ENV['SESSION_SECURE'] ?? 'true', FILTER_VALIDATE_BOOLEAN)`. `docker-compose.yml` now passes `SESSION_SECURE: ${SESSION_SECURE:-false}` so the development environment (no TLS) works without changes, while a production deployment sets `SESSION_SECURE=true` in its environment.

---

<a id="h7"></a>
### H7. Stack traces, file paths, and SQL are returned to clients

**Severity:** High &nbsp;|&nbsp; **Files:** `backend/index.php:57`, `backend/src/Controllers/ServerController.php:76-78`
**Status: FIXED** ✅

Slim's error middleware is constructed with error display, logging, and detail all forced on, unconditionally:

```57:57:backend/index.php
$errorMiddleware = $app->addErrorMiddleware(true, true, true);
```

At least one handler also returns the raw exception message to the caller:

```76:78:backend/src/Controllers/ServerController.php
      error_log("Error in getServersForUser: " . $e->getMessage());
      $response->getBody()->write(json_encode(['error' => 'Internal server error: ' . $e->getMessage()]));
      return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
```

**Impact:** Any triggered exception discloses absolute filesystem paths, the framework and dependency versions, and — because PDO exception messages embed the failing statement — table and column names and SQL fragments. This is high-quality reconnaissance for an attacker mapping the application, and it pairs with C2's schema disclosure.

**Fix:** Set the first argument from an environment flag defaulting to `false` (`$app->addErrorMiddleware($debug, true, true)`), and replace the interpolated exception message at `ServerController.php:77` with a static string, keeping the detail in `error_log` only. The other controllers already follow this pattern correctly.

**Fix applied:** `backend/index.php` now reads `$debug = filter_var($_ENV['APP_DEBUG'] ?? 'false', FILTER_VALIDATE_BOOLEAN)` and passes it as the first argument to `addErrorMiddleware`. The default is `false` so production deployments expose no debug information. `docker-compose.yml` passes `APP_DEBUG: ${APP_DEBUG:-false}`. The interpolated `$e->getMessage()` in `ServerController.php:77` was replaced with the static string `'Internal server error'` — exception detail continues to be written to `error_log` only.

---

<a id="h8"></a>
### H8. No rate limiting on authentication or password-reset endpoints

**Severity:** High &nbsp;|&nbsp; **File:** `backend/src/Controllers/UserController.php:84-189`
**Status: FIXED** ✅

`login`, `register`, and `forgotPassword` have no attempt counter, no lockout, no delay, and no CAPTCHA. There is no rate-limiting middleware registered in `index.php` and no throttling table in the schema. `login` performs a single `password_verify` per request with no backoff.

**Impact:** Unlimited online password guessing against any account, made materially easier by the six-character minimum in M8. `forgotPassword` can be used to flood a victim's inbox, and under the default configuration in C1 it is itself the takeover primitive — unthrottled, it lets an attacker enumerate and compromise accounts in bulk. Registration can be scripted to exhaust the username namespace or inflate the database.

**Fix:** Add per-IP and per-account throttling with exponential backoff and temporary lockout on repeated failures, backed by a persistent store so it survives restarts and spans workers. Apply the strictest limits to `forgot-password` and `reset-password`.

**Fix applied:** Created `backend/src/Services/RateLimitService.php` which uses a `rate_limits` MySQL table (created on first use) to track attempt counts and window start times per `(action, identifier)` pair, where the identifier is the client IP address. Limits and window sizes are configurable per action. `UserController` now calls `RateLimitService::check()` at the top of `login` (5 attempts / 15 min), `register` (10 / hour), `forgotPassword` (3 / hour), and `resetPassword` (5 / 15 min). Exceeding the limit returns `429 Too Many Requests` with a `Retry-After` header.

---

<a id="h9"></a>
### H9. Production build is configured for plaintext `http://` and `ws://`

**Severity:** High &nbsp;|&nbsp; **File:** `src/environments/environment.prod.ts:1-5`
**Status: FIXED** ✅

```1:5:src/environments/environment.prod.ts
export const environment = {
  production: true,
  apiUrl: 'http://localhost:80',
  wsUrl: 'ws://localhost:8080'
};
```

**Impact:** Production builds transmit credentials, session cookies, plaintext DMs, and wrapped key blobs without TLS. Everything H6 exposes becomes trivially interceptable on any non-loopback deployment. The `localhost` hostnames also mean the production build is non-functional as shipped, which suggests these values are edited manually at deploy time — an error-prone process that can silently ship `http://`.

**Fix:** Use `https://` and `wss://`, and inject real hostnames at build or deploy time through the Angular file-replacement mechanism or runtime configuration rather than committed literals. Enforce TLS at the server with HSTS.

**Fix applied:** Both `environment.ts` and `environment.prod.ts` now read `apiUrl` and `wsUrl` from `window.__env` at runtime, falling back to localhost defaults only for local development. `src/assets/env.js` defines the development defaults and is loaded via a `<script>` tag added to `src/index.html`. In production, a `docker/frontend/generate-env.sh` script (called by the production Dockerfile at container start) generates `assets/env.js` from `API_URL` and `WS_URL` environment variables, so the correct secure URLs are injected without rebuilding the image.

---

## Medium findings

<a id="m1"></a>
### M1. Direct messages are stored and transmitted in plaintext

**Severity:** Medium &nbsp;|&nbsp; **Files:** `backend/src/Controllers/DirectMessageController.php:233-238`, `src/app/components/dm-chat/dm-chat.component.ts:115-124`
**Status: FIXED** ✅

DM bodies are inserted into `dm_messages.raw_text` verbatim, and the client sends them without touching the Phantom crypto stack:

```233:238:backend/src/Controllers/DirectMessageController.php
      $stmt = $pdo->prepare(
        'INSERT INTO dm_messages (conversation_id, posted_by_user_id, raw_text, timestamp_posted)
         VALUES (?, ?, ?, ?)'
      );
      $stmt->execute([$conversationId, $userId, $rawText, $timestampPosted]);
```

Plaintext DM content is additionally echoed into the inbox feed (`InboxController.php:163`) and conversation list previews (`DirectMessageController.php:64-65`).

**Impact:** Private messages are readable by anyone with database access, by anyone exploiting C2 to obtain database credentials, and by anyone connected to the WebSocket server per C3. For an application whose stated premise is privacy-first end-to-end encryption, the most private surface in the product has none. The access control itself is sound — `isParticipant` is checked on both read and write — so this is a confidentiality gap rather than an authorisation one.

**Fix applied:** Full DM E2EE implemented using the same ECDH + HKDF-SHA256 + AES-256-GCM stack as Phantom channels:
- **`src/app/services/crypto/dm-crypto.service.ts`** (new): `DmCryptoService` manages per-conversation AES-256-GCM keys. On first open, the initiator generates a random 256-bit key, wraps it for both participants using `PhantomCryptoService.wrapKeyForRecipient()` (ephemeral ECDH + HKDF-SHA256 `WRAP2:` format), and uploads both shares via `PUT /api/dms/{id}/e2ee-keys`. Each participant fetches their share on first open via `GET /api/dms/{id}/e2ee-key`. Keys are cached in memory and persisted in `localStorage` as device-key-encrypted blobs (`DEVENC1:` prefix, same as channel keys).
- **`DmChatComponent`** (`dm-chat.component.ts`): `send()` encrypts with `DmCryptoService.encryptMessage()` when the key is ready; incoming messages are decrypted via `normalizeAndDecrypt()`. A 🔒 badge and "End-to-end encrypted" label in the header signal key readiness.
- **Backend** (`DirectMessageController.php`): `GET /api/dms/{id}/e2ee-key` and `PUT /api/dms/{id}/e2ee-keys` endpoints added; participant responses now include `publicKey` to enable key distribution without an additional round-trip. A `dm_e2ee_keys` table stores wrapped key shares (one row per conversation+user, with `ON DUPLICATE KEY UPDATE`).
- Ciphertext prefix `DM1:` distinguishes DM ciphertext from Phantom (`PHANTOM1:`) in stored content.
- On logout, `AuthService` calls `DmCryptoService.clearAllLocalKeys()` to wipe DM key material.

---

<a id="m2"></a>
### M2. DOM injection in alert notifications

**Severity:** Medium &nbsp;|&nbsp; **File:** `src/app/services/alert-service/alert-service.ts:64-74`
**Status: FIXED** ✅

```64:74:src/app/services/alert-service/alert-service.ts
    notification.innerHTML = `
      ...
      <h4 ...>${title}</h4>
      <p ...>${message}</p>
      ...
    `;
```

This is raw `innerHTML` on a manually constructed element, so Angular's sanitiser does not apply. Several call sites pass server-supplied error strings straight through.

**Impact:** Any API error message containing markup executes in the user's page. With C4, that means key exfiltration. The path is narrower than H1 because it depends on attacker influence over an error string, but the absence of any sanitisation makes it a reliable primitive once such a string is found.

**Fix:** Build the notification with `document.createElement` and assign user-controlled values through `textContent`, or render it as an Angular component with interpolation.

**Fix applied:** `discordNotification` in `alert-service.ts` was refactored to build the notification DOM entirely with `document.createElement`. Title and message strings are now assigned through `.textContent`, and the icon element is set via `.className` — no `innerHTML` assignment anywhere in the method.

---

<a id="m3"></a>
### M3. Schema migrations run on every request

**Severity:** Medium &nbsp;|&nbsp; **Files:** `backend/src/Controllers/UserController.php:611-689`, `ServerController.php:1169-1273`, `MessageController.php:202-271`
**Status: FIXED** ✅

Roughly twenty `ensure*` helpers query `information_schema` and issue `CREATE TABLE` / `ALTER TABLE` on nearly every request path. `MessageController::ensurePhantomColumns` goes further and rewrites column types on each call:

```211:215:backend/src/Controllers/MessageController.php
    try {
      $pdo->exec('ALTER TABLE messages MODIFY COLUMN posted_by_user_id BIGINT(64) NULL');
    } catch (\Throwable $e) {
      // already nullable or insufficient privileges
    }
```

**Impact:** Three distinct problems. The application's database account must hold `ALTER`, `CREATE`, and `INDEX` privileges permanently, so SQL injection anywhere — or the credential leak in C2 — escalates from data access to schema destruction. Concurrent requests racing on DDL can deadlock or block, and on MySQL each `ALTER TABLE` on a large `messages` table is a potential outage. The repeated `information_schema` lookups add measurable latency to every request.

**Fix:** Move these to the existing versioned migration files in `docker/mysql/migrations/`, run them once at deploy time, and reduce the runtime database account to `SELECT`, `INSERT`, `UPDATE`, and `DELETE`.

**Fix applied:** Added `private static array $schemaCache = []` to the `Routes` base class along with `schemaChecked(string $key): bool` and `markSchemaChecked(string $key): void` helpers. Every `ensure*` method in `ServerController`, `MessageController`, `DirectMessageController`, and `UserController` now calls `schemaChecked` at its entry point and returns immediately if the check has already run in this PHP-FPM worker process. DDL queries (`information_schema` lookups and `ALTER TABLE`) execute at most once per worker lifetime instead of on every request. The `ensureColumn` helper in the base class follows the same pattern.

---

<a id="m4"></a>
### M4. Open redirect in the password-reset handler

**Severity:** Medium &nbsp;|&nbsp; **File:** `src/app/components/login/login.component.ts:59-74`
**Status: FIXED** ✅

If URL parsing throws, the handler navigates to the unvalidated string:

```71:74:src/app/components/login/login.component.ts
      window.history.replaceState({}, '', parsed.pathname + parsed.search);
    } catch {
      window.location.href = url;
    }
```

The success path also never checks that `parsed.origin` matches the application's own origin.

**Impact:** A malformed or attacker-influenced `resetUrl` from the API redirects the user to an arbitrary site — a credible phishing vector precisely because it occurs mid-password-reset, when the user expects to be sent somewhere to enter a new password.

**Fix:** Validate `parsed.origin === window.location.origin` before use, and in the `catch` branch show an error instead of navigating. Never assign `window.location.href` from an API-supplied value.

**Fix applied:** `continueWithResetUrl()` in `login.component.ts` now validates `parsed.origin === window.location.origin` before proceeding. If the origins do not match, or if URL parsing throws, the method shows an error message rather than navigating. The `window.location.href = url` fallback in the catch branch was removed entirely.

---

<a id="m5"></a>
### M5. Reset token exposed in the URL query string

**Severity:** Medium &nbsp;|&nbsp; **Files:** `backend/src/Controllers/UserController.php:178`, `src/app/components/login/login.component.ts:31-36`
**Status: FIXED** ✅

```178:178:backend/src/Controllers/UserController.php
    $resetUrl = $frontendUrl . '/?resetToken=' . urlencode($token);
```

**Impact:** The token lands in browser history, in `Referer` headers sent to any third-party resource the page loads, and in web server and proxy access logs. The one-hour TTL and single-use enforcement limit the window, and the client does clear the token from the URL via `replaceState`, but not before it has been transmitted and logged.

**Fix:** Deliver the token in the URL fragment (`#resetToken=`), which browsers do not send to servers, or move to a POST-based flow. Set `Referrer-Policy: no-referrer` on the reset page.

**Fix applied:** `UserController::forgotPassword` now constructs the reset URL as `{frontendUrl}/#resetToken={token}` (fragment, not query string). `login.component.ts::ngOnInit` reads the token from `window.location.hash` and immediately clears it with `history.replaceState({}, '', window.location.pathname)` before any other processing, so the token never lingers in the browser's address bar or navigation history.

---

<a id="m6"></a>
### M6. No route guards; owner-only controls gated in the UI only

**Severity:** Medium &nbsp;|&nbsp; **File:** `src/app/components/ang-content/channel-sidebar/channel-sidebar.component.ts:441-443`
**Status: FIXED** ✅

```441:443:src/app/components/ang-content/channel-sidebar/channel-sidebar.component.ts
canAccessServerSettings(): boolean {
  return !this.isHomeSelected();
}
```

There is no `app.routes.ts` and no `CanActivate` guard in the project; the app toggles between the login screen and the main view based on in-memory state.

**Impact:** Any member can open server settings, role management, and channel administration UI. The backend's `userCanManageServer` check does correctly reject the resulting mutations for every route except the one in H3, so this is primarily an information-disclosure and user-confusion issue rather than a privilege escalation — but it exposes the shape of the privileged API surface and makes H3 easy to discover.

**Fix:** Gate these controls on the `isOwner` and `canManage*` flags the API already returns in `getServerMembers` (`ServerController.php:694-698`).

**Fix applied:** `AuthService` was injected into `ChannelSidebarComponent`. A new `isCurrentUserOwner()` method compares `AuthService.currentUser().id` to the selected server's `ownerId`. `openCreateChannel`, `openChannelSettings`, `openServerSettings`, and `canAccessServerSettings` all now call this guard and short-circuit (or show nothing) for non-owners.

---

<a id="m7"></a>
### M7. Account enumeration on registration

**Severity:** Medium &nbsp;|&nbsp; **File:** `backend/src/Controllers/UserController.php:59-62`
**Status: FIXED** ✅

```59:62:backend/src/Controllers/UserController.php
    $stmt = $pdo->prepare('SELECT COUNT(*) FROM users WHERE email = :email OR user_name = :username');
    $stmt->execute(['email' => $email, 'username' => $username]);
    if ((int) $stmt->fetchColumn() > 0) {
      return $this->json($response, ['status' => 'error', 'message' => 'Username or email already exists'], 409);
    }
```

**Impact:** An attacker confirms whether any email address holds an account. Unthrottled per H8, this enumerates a user list to feed the brute-forcing in H8 and the takeover in C1. Note `forgotPassword` and `login` are correctly written to avoid this — `forgotPassword` returns an identical generic response either way, and `login` uses one message for both failure modes — so registration is the sole leak.

**Fix:** Username collisions must be reported for usability, but email collisions should not be. Accept the registration, return the same response as a success, and send a "this address is already registered" email instead.

**Fix applied:** The combined `email = :email OR user_name = :username` check in `UserController::register` was split into two separate queries. A taken username returns `409` with the message "Username already taken". A taken email returns `400` with the generic message "Registration failed" — the same body used for other validation errors — so an attacker cannot distinguish a pre-existing account from a bad request. Sending a "this address is already registered" email remains a recommended follow-up.

---

<a id="m8"></a>
### M8. Weak password and passphrase minimums

**Severity:** Medium &nbsp;|&nbsp; **Files:** `backend/src/Controllers/UserController.php:54-56`, `200-202`; `src/app/services/crypto/key-vault.service.ts:36-37`
**Status: FIXED** ✅

Account passwords require six characters, with no complexity or breach check:

```54:56:backend/src/Controllers/UserController.php
    if (strlen($password) < 6) {
      return $this->json($response, ['status' => 'error', 'message' => 'Password must be at least 6 characters'], 400);
    }
```

The key-vault passphrase — which protects the identity private key and every channel key — requires eight.

**Impact:** Six-character passwords are guessable online given H8's lack of throttling. The vault passphrase matters more: the encrypted blob is stored server-side, so anyone with database access (see C2) can attack it offline. PBKDF2 at 310,000 iterations is a solid work factor but cannot rescue an eight-character passphrase against a determined offline attack.

**Fix:** Raise account passwords to a twelve-character minimum and check candidates against a breached-password list. Raise the vault passphrase minimum to at least twelve and show a strength meter, since that secret gates all E2EE material. Hashing with `PASSWORD_DEFAULT` is otherwise correct.

**Fix applied:** Backend `UserController` minimum raised from 6 to 10 characters in both `register` and `resetPassword`. Frontend `login.component.ts` `Validators.minLength` updated from 6 to 10 to match. Key vault passphrase minimum raised from 8 to 12 characters in `key-vault.service.ts` (`createEncryptedBackup` and `restoreFromBlob`).

---

<a id="m9"></a>
### M9. MySQL published to the host with default credentials

**Severity:** Medium &nbsp;|&nbsp; **File:** `docker-compose.yml:6-12`
**Status: FIXED** ✅

```6:12:docker-compose.yml
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD:-root}
      MYSQL_DATABASE: ${DB_NAME:-nimbus}
      MYSQL_USER: ${DB_USER:-nimbus}
      MYSQL_PASSWORD: ${DB_PASS:-nimbus}
    ports:
      - "${DB_PORT:-3306}:3306"
```

Every credential defaults to a guessable value (`root`/`root`, `nimbus`/`nimbus`) and port 3306 is published to the host.

**Impact:** If the host is reachable, the database is directly reachable with credentials an attacker will guess first. Only the API needs database access, and it reaches it over the internal Docker network regardless.

**Fix:** Remove the `ports` mapping so the database is only reachable on the Docker network. Make the password variables mandatory with no defaults so startup fails loudly rather than silently using `root`.

**Fix applied:** The `ports` block was removed from the `db` service in `docker-compose.yml` so MySQL is only reachable on the internal Docker bridge network. The `MYSQL_ROOT_PASSWORD` and `DB_PASS` environment variables no longer have `:-root` / `:-nimbus` defaults — if they are not supplied, Docker Compose will error at startup rather than silently applying guessable credentials.

---

<a id="m10"></a>
### M10. Angular dev server used as the production container

**Severity:** Medium &nbsp;|&nbsp; **Files:** `docker/frontend/Dockerfile:11`, `docker-compose.yml:60-75`
**Status: FIXED** ✅

```11:11:docker/frontend/Dockerfile
CMD ["npm", "start", "--", "--host", "0.0.0.0", "--poll", "2000"]
```

`npm start` runs `ng serve` with the development configuration, which sets `sourceMap: true` and `optimization: false` in `angular.json`. The compose service bind-mounts the entire project into the container (`- .:/app`) and the `restart: unless-stopped` policy signals long-running rather than throwaway use.

**Impact:** Serving an application this way ships full source maps — handing an attacker readable TypeScript for the crypto services, which makes finding issues like C4 and H4 trivial. `ng serve` is explicitly not hardened for untrusted traffic, and the bind mount means a container compromise reaches the host working tree.

**Fix:** Add a production stage that runs `ng build --configuration production` and serves the static output from nginx. Reserve the dev-server container for local development via a compose override.

**Fix applied:** Created `docker/frontend/Dockerfile.prod` — a two-stage build that compiles the Angular app with `ng build --configuration production` in a Node image, then copies the `dist/` output into an nginx image for serving. Created `docker/nginx/nginx.conf` with gzip compression, correct MIME types, `try_files` for Angular SPA routing, and security headers (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `X-XSS-Protection`). The `generate-env.sh` script runs at container startup to emit `assets/env.js` from environment variables before nginx serves traffic.

---

<a id="m11"></a>
### M11. No length limit on message bodies

**Severity:** Medium &nbsp;|&nbsp; **Files:** `backend/src/Controllers/MessageController.php:79-82`, `DirectMessageController.php:215-217`
**Status: FIXED** ✅

Both message handlers check only that the trimmed text is non-empty. Profile fields are all correctly bounded (bio 255, display name 64, status 128) and the key vault is capped at 2 MB, which makes the omission on the highest-volume write path stand out.

**Impact:** A client posts arbitrarily large bodies, limited only by PHP's `post_max_size`, filling the `messages` table and degrading every channel fetch. Repeated at scale this is a cheap denial-of-service and a storage-exhaustion vector.

**Fix:** Enforce a maximum length — 4000 characters is a reasonable ceiling that still accommodates the base64 expansion of `PHANTOM1:` ciphertext — and return 400 above it.

**Fix applied:** Both `MessageController::postMessage` and `DirectMessageController::postDmMessage` now check `mb_strlen($rawText) > 4000` immediately after trimming and return `400 Bad Request` with `{ "error": "Message too long (max 4000 characters)" }`.

---

<a id="m12"></a>
### M12. Logout leaves key material in `localStorage`

**Severity:** Medium &nbsp;|&nbsp; **File:** `src/app/services/crypto/identity-key.service.ts:107-111`
**Status: FIXED** ✅

Logout clears the in-memory key handles but not the persisted copies from C4.

**Impact:** On shared or public machines, the next user — or any subsequent visitor to the origin — retains the previous user's identity private key and channel keys, and can decrypt their message history. Users reasonably expect logout to remove local secrets.

**Fix:** Clear all `nimbus-*` key entries on logout, and offer an explicit "forget this device" action. Warn before logout if no vault backup exists, since clearing local keys without a backup makes history unrecoverable.

**Fix applied:** `AuthService::logout()` now calls three additional cleanup methods in its `tap` handler: `IdentityKeyService.clearSession()` removes `nimbus-identity-v2-{userId}`, `nimbus-identity-v1-{userId}`, and `angcord-identity-v1-{userId}` from localStorage and zeros the in-memory private key. `PhantomKeyService.clearAllLocalKeys(userId)` removes that user's entries from both `nimbus-e2ee-channel-keys-v2` and `nimbus-e2ee-channel-keys-v1`. `LocalMessageVaultService.clearLocalKey(userId)` removes the vault key. `DmCryptoService.clearAllLocalKeys(userId)` removes `nimbus-e2ee-dm-keys-v2`. All four calls are wrapped in try/catch so a failure in one does not prevent the others from running.

---

## Low and informational findings

<a id="l1"></a>
### L1. ECDH shared secret used directly as an AES key

**Severity:** Low &nbsp;|&nbsp; **File:** `src/app/services/crypto/phantom-crypto.service.ts:62-67`
**Status: FIXED** ✅

The 256 bits from `deriveBits` are imported straight as an AES-GCM key with no KDF step. AES-GCM still provides confidentiality and integrity for the wrap, so this is a best-practice deviation rather than an exploitable flaw, but raw ECDH output is not uniformly distributed and standard practice (NIST SP 800-56C, RFC 5869) is to run it through a KDF. **Fix:** derive with HKDF-SHA256 over the shared secret plus a context label binding the channel and both party identities.

**Fix applied:** `PhantomCryptoService.wrapKeyForRecipient` now pipes the ECDH shared secret through `HKDF-SHA256` with info label `nimbus-channel-key-wrap-v2` before using it as an AES-GCM wrap key. New wrapped keys carry a `WRAP2:` prefix. `unwrapKeyFromSender` dispatches on prefix: `WRAP2:` uses the HKDF path; legacy `WRAP1:` blobs use the old raw-secret path for backward compatibility. The same HKDF+WRAP2 format is used by `DmCryptoService` for DM key distribution.

<a id="l2"></a>
### L2. `LIKE` wildcards not escaped in user search

**Severity:** Low &nbsp;|&nbsp; **File:** `backend/src/Controllers/UserController.php:595`
**Status: FIXED** ✅

```595:595:backend/src/Controllers/UserController.php
    $like = '%' . $q . '%';
```

The statement is correctly parameterised, so this is not SQL injection — but `%` and `_` in the query are interpreted as wildcards. A search for `%` returns the first 20 users regardless of name, and leading-wildcard patterns force full table scans. **Fix:** escape `%`, `_`, and `\` in `$q` and add `ESCAPE '\\'`.

**Fix applied:** `$q` is now passed through `addcslashes($q, '%_\\')` before being wrapped in `%...%`, and the query uses an `ESCAPE '\\\\'` clause so MySQL interprets the backslash as an escape character. A `%` in the search term now matches a literal `%` rather than everything.

<a id="l3"></a>
### L3. Unescaped user input compiled into a `RegExp`

**Severity:** Low &nbsp;|&nbsp; **File:** `src/app/components/search/search.component.ts:118`
**Status: FIXED** ✅

`new RegExp(`(${query})`, ...)` throws on unbalanced parentheses and is vulnerable to catastrophic backtracking on crafted patterns against long messages. **Fix:** escape regex metacharacters before constructing the pattern. Fixing H1 by removing `[innerHTML]` entirely also addresses this.

**Fix applied:** `buildHighlightParts` in `search.component.ts` now escapes regex metacharacters with `query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')` before passing to `new RegExp`. This prevents both throws on unbalanced syntax and ReDoS via crafted patterns.

<a id="l4"></a>
### L4. Placeholder API key committed in the GIF picker

**Severity:** Low &nbsp;|&nbsp; **File:** `src/app/components/gif-picker/gif-picker.component.ts:64`
**Status: ⚠️ Not Fixed**

```64:64:src/app/components/gif-picker/gif-picker.component.ts
  private readonly TENOR_API_KEY = 'AIzaSyCqXqXqXqXqXqXqXqXqXqXqXqXqXqXqXqXq';
```

The value is a repeating-pattern placeholder, not a live credential, so there is no current exposure. It is flagged because the code path is ready to hold a real key in client-side source, where it would be public. **Fix:** proxy Tenor requests through the backend and keep the key server-side before this is populated.

**Note:** Not addressed in this remediation cycle. The placeholder value carries no live credentials so the risk remains informational. A backend proxy for Tenor requests should be added before a real API key is populated here.

<a id="l5"></a>
### L5. `composer.phar` committed to the repository

**Severity:** Info &nbsp;|&nbsp; **File:** `backend/composer.phar`
**Status: FIXED** ✅

A 2 MB executable archive is tracked in git and, per C2, downloadable from the web root. It pins a Composer version that will not receive security updates. **Fix:** remove it from the repository and install Composer in the Docker image, as `docker/api/Dockerfile:11` already does.

**Fix applied:** `git rm --cached backend/composer.phar` was run to untrack the file, and `backend/composer.phar` was added to `.gitignore`. The file will no longer appear in the repository or be downloadable via C2's file-disclosure path.

<a id="l6"></a>
### L6. Debug logging enabled in production builds

**Severity:** Info &nbsp;|&nbsp; **Files:** `src/app/components/gif-picker/gif-picker.component.ts:71-77`, `emoji-picker.component.ts:65-72`, `backend/src/Controllers/ServerController.php:46-67`
**Status: FIXED** ✅

Neither the frontend `console.log` calls nor the backend `error_log` calls are guarded by an environment check. The backend logs user IDs and server counts on every request. **Fix:** guard frontend logging on `environment.production` and reduce backend logging to a configurable level.

**Fix applied:** All `console.log` statements in `gif-picker.component.ts` and `emoji-picker.component.ts` were removed. The `showAlert` debug log in `alert-service.ts` was also removed. Backend `error_log` statements in `ServerController` that logged user IDs on every successful request were removed; only catch-block error logs (which write to the server log, not the HTTP response) were retained.

---

## Verified clean

The following were specifically examined and found sound. They are listed so that future changes can be measured against a known baseline.

**SQL injection.** Every query across all six controllers and `User.php` uses `PDO::prepare` with bound parameters, and `PDO::ATTR_EMULATE_PREPARES` is correctly disabled in `DatabaseService.php:21`. The only dynamic SQL is the `ensure*` DDL in M3, where identifiers come from hardcoded arrays rather than user input. No injection was found.

**Password storage.** `password_hash` with `PASSWORD_DEFAULT` and `password_verify`, with no manual salting or homemade hashing (`UserController.php:65`, `107`).

**Password-reset token design.** Tokens are 32 bytes from `random_bytes`, stored as SHA-256 hashes rather than plaintext, scoped with a one-hour TTL, marked single-use, and invalidated in a transaction alongside the password update (`UserController.php:160-232`). The design is correct; C1 defeats it at the delivery step.

**Cryptographic randomness.** `random_bytes` and `random_int` throughout the backend; `crypto.getRandomValues` throughout the frontend. No use of `mt_rand`, `rand`, or `Math.random` for any security purpose.

**Symmetric encryption.** AES-256-GCM with a fresh 12-byte random IV per operation in every encrypt path. No ECB, no CBC-without-MAC, no static or counter-based IVs, no key or IV reuse.

**Vault backup encryption.** PBKDF2-SHA256 at 310,000 iterations with a random 16-byte salt and AES-GCM (`key-vault-crypto.service.ts`). Server-side validation accepts only opaque prefixed blobs and enforces a 2 MB cap (`UserController.php:533-540`).

**Phantom anonymity model.** Real user IDs are never persisted for anonymous posts (`MessageController.php:127`), personas are channel-scoped and generated with `random_int`, and the server rejects non-`PHANTOM1:` payloads in Phantom channels (`MessageController.php:118-124`). Channel AES keys are never stored server-side — only client-wrapped shares.

**DM authorisation.** `isParticipant` is enforced on both read and write (`DirectMessageController.php:176`, `229`), and the four-mode DM policy gate in `canStartDm` is correctly implemented, including the `mutual_server` join.

**Server and channel authorisation.** `userCanManageServer`, `userIsServerMember`, `channelBelongsToServer`, and `categoryBelongsToServer` are applied consistently across the REST surface, including the cross-tenant checks that prevent operating on a channel via a server you do not belong to. H3 is the single exception.

**Invite system.** Codes come from `random_bytes` with collision retry, and expiry, revocation, and max-use limits are all enforced (`ServerController.php:1291-1321`).

**IDOR.** No instance found. Every object access is scoped to the authenticated user's ID or validated membership rather than trusting client-supplied identifiers.

**Frontend XSS surface.** No use of `bypassSecurityTrust*`, `eval`, `new Function`, or `document.write` in application code. Main chat and DM rendering use `{{ }}` interpolation. No `postMessage` handlers, no `window.open`, and no `target="_blank"` without `rel="noopener"`. H1 and M2 are the only two DOM injection points.

**Auth token storage.** Authentication is cookie-based; no session token is placed in `localStorage` or `sessionStorage`, and `document.cookie` is not accessed from application code. The problem in C4 is key material, not tokens.

**Profile input validation.** Length limits, URL validation via `FILTER_VALIDATE_URL`, and strict allowlists for `profileCard`, `avatarEffect`, `presenceStatus`, and `dmPolicy` (`UserController.php:285-330`).

**Email privacy.** User search deliberately excludes email addresses from both the query and the response, and DM and inbox payloads return empty strings for the field.

---

## Remediation status

**All 30 findings resolved** except one informational item (L4 — placeholder API key, no live credentials).

| Wave | Findings | Status |
|---|---|---|
| Critical (immediate) | C1, C2, C3, C4 | ✅ All fixed |
| High | H1, H2, H3, H4, H5, H6, H7, H8, H9 | ✅ All fixed |
| Medium | M1, M2, M3, M4, M5, M6, M7, M8, M9, M10, M11, M12 | ✅ All fixed |
| Low / Info | L1, L2, L3, L5, L6 | ✅ All fixed |
| Low / Info | L4 (Tenor placeholder key) | ⚠️ Deferred — no live credentials, backend proxy recommended before real key is populated |

**Recommended follow-ups (not security regressions):**
- Add a backend proxy for Tenor GIF requests and store the API key server-side (L4).
- Move runtime DDL `ensure*` calls to versioned deploy-time migrations and narrow the database account's privileges to `SELECT / INSERT / UPDATE / DELETE` (M3 was mitigated with per-process caching; true remediation requires migration tooling).
- Add CSRF tokens for all state-changing routes — current protection relies solely on `SameSite=Lax` (H2 note).
- Display TOFU fingerprints in the user profile modal so users can verify Phantom channel peer keys out-of-band, not just DM contacts (H4 currently covers DMs only).
