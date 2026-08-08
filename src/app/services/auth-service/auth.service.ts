import { Injectable, Injector, computed, signal } from '@angular/core';
import { Observable, catchError, from, map, of, switchMap, tap } from 'rxjs';
import { User } from '../../models/user/user';
import { UserWebService } from '../user-web-service/user-web.service';
import { AuthResponse } from '../../models/user/auth';
import { IdentityKeyService } from '../crypto/identity-key.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly currentUserSignal = signal<User | null>(null);
  private readonly authCheckedSignal = signal(false);

  readonly currentUser = this.currentUserSignal.asReadonly();
  readonly isLoggedIn = computed(() => !!this.currentUserSignal());
  readonly authChecked = this.authCheckedSignal.asReadonly();

  constructor(
    private userWebService: UserWebService,
    private injector: Injector
  ) {}

  checkSession(): Observable<boolean> {
    return this.userWebService.me().pipe(
      tap((resp) => {
        if (resp?.status === 'success' && resp.user) {
          this.currentUserSignal.set(resp.user);
        } else {
          this.currentUserSignal.set(null);
        }
        this.authCheckedSignal.set(true);
      }),
      switchMap((resp) => {
        const ok = resp?.status === 'success' && !!resp.user;
        if (!ok) {
          return of(false);
        }
        return from(this.bootstrapIdentity()).pipe(map(() => true));
      }),
      catchError(() => {
        this.currentUserSignal.set(null);
        this.authCheckedSignal.set(true);
        return of(false);
      })
    );
  }

  login(username: string | null, email: string | null, password: string): Observable<AuthResponse> {
    return this.userWebService.login(username, email, password).pipe(
      tap((resp) => {
        if (resp?.status === 'success' && resp.user) {
          this.currentUserSignal.set(resp.user);
        }
      }),
      switchMap((resp) =>
        resp?.status === 'success' && resp.user
          ? from(this.bootstrapIdentity()).pipe(map(() => resp))
          : of(resp)
      )
    );
  }

  register(email: string, username: string, password: string): Observable<AuthResponse> {
    return this.userWebService.register(email, username, password).pipe(
      tap((resp) => {
        if (resp?.status === 'success' && resp.user) {
          this.currentUserSignal.set(resp.user);
        }
      }),
      switchMap((resp) =>
        resp?.status === 'success' && resp.user
          ? from(this.bootstrapIdentity()).pipe(map(() => resp))
          : of(resp)
      )
    );
  }

  forgotPassword(email: string): Observable<AuthResponse> {
    return this.userWebService.forgotPassword(email);
  }

  resetPassword(token: string, password: string): Observable<AuthResponse> {
    return this.userWebService.resetPassword(token, password);
  }

  logout(): Observable<AuthResponse> {
    return this.userWebService.logout().pipe(
      tap(() => {
        try {
          this.injector.get(IdentityKeyService).clearSession();
        } catch {
          // ignore
        }
        this.currentUserSignal.set(null);
      }),
      catchError(() => {
        this.currentUserSignal.set(null);
        const fallback: AuthResponse = { status: 'success', message: 'Logged out' };
        return of(fallback);
      })
    );
  }

  setUser(user: User | null): void {
    this.currentUserSignal.set(user);
  }

  private async bootstrapIdentity(): Promise<void> {
    try {
      await this.injector.get(IdentityKeyService).ensureIdentity();
    } catch {
      // E2EE identity is best-effort at login
    }
  }
}
