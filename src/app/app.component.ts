import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DefaultViewComponent } from './views/default-view/default-view.component';
import { LoginComponent } from './components/login/login.component';
import { AuthService } from './services/auth-service/auth.service';
import { take } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  imports: [
    DefaultViewComponent,
    CommonModule,
    LoginComponent
  ],
  providers: [],
  standalone: true
})
export class AppComponent implements OnInit {
  readonly checkingSession = signal(true);
  readonly isLoggedIn = computed(() => this.authService.isLoggedIn());
  readonly showApp = computed(() => !this.checkingSession() && this.isLoggedIn());
  readonly showLogin = computed(() => !this.checkingSession() && !this.isLoggedIn());

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.authService.checkSession().pipe(take(1)).subscribe({
      next: () => this.checkingSession.set(false),
      error: () => this.checkingSession.set(false)
    });
  }

  handleLoggedIn() {
    this.checkingSession.set(false);
  }
}
