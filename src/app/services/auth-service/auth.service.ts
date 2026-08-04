import { Injectable, computed, signal } from '@angular/core';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { User } from '../../models/user/user';
import { UserWebService } from '../user-web-service/user-web.service';
import { AuthResponse } from '../../models/user/auth';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly currentUserSignal = signal<User | null>(null);
  private readonly authCheckedSignal = signal(false);

  readonly currentUser = this.currentUserSignal.asReadonly();
  readonly isLoggedIn = computed(() => !!this.currentUserSignal());
  readonly authChecked = this.authCheckedSignal.asReadonly();

  constructor(private userWebService: UserWebService) {}

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
      map((resp) => resp?.status === 'success' && !!resp.user),
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
      })
    );
  }

  register(email: string, username: string, password: string): Observable<AuthResponse> {
    return this.userWebService.register(email, username, password).pipe(
      tap((resp) => {
        if (resp?.status === 'success' && resp.user) {
          this.currentUserSignal.set(resp.user);
        }
      })
    );
  }

  logout(): Observable<AuthResponse> {
    return this.userWebService.logout().pipe(
      tap(() => this.currentUserSignal.set(null)),
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
}
