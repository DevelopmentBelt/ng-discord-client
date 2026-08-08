import { Component, OnInit, output, OutputEmitterRef, signal, WritableSignal } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { take } from 'rxjs';
import { AuthService } from '../../services/auth-service/auth.service';

type AuthMode = 'login' | 'register' | 'forgot' | 'reset';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './login.component.html'
})
export class LoginComponent implements OnInit {
  userLoggedIn: OutputEmitterRef<void> = output();

  mode: WritableSignal<AuthMode> = signal('login');
  form: FormGroup;
  isLoading: WritableSignal<boolean> = signal(false);
  errorMessage: WritableSignal<string> = signal('');
  successMessage: WritableSignal<string> = signal('');
  resetUrl: WritableSignal<string> = signal('');
  private resetToken = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService
  ) {}

  ngOnInit() {
    const params = new URLSearchParams(window.location.search);
    const token = (params.get('resetToken') || '').trim();
    if (token) {
      this.resetToken = token;
      this.mode.set('reset');
      this.buildForm('reset');
      return;
    }
    this.buildForm('login');
  }

  switchMode(mode: AuthMode) {
    this.mode.set(mode);
    this.errorMessage.set('');
    this.successMessage.set('');
    this.resetUrl.set('');
    if (mode !== 'reset') {
      this.resetToken = '';
      this.clearResetTokenFromUrl();
    }
    this.buildForm(mode);
  }

  continueWithResetUrl() {
    const url = this.resetUrl();
    if (!url) {
      return;
    }
    try {
      const parsed = new URL(url, window.location.origin);
      const token = (parsed.searchParams.get('resetToken') || '').trim();
      if (!token) {
        return;
      }
      this.resetToken = token;
      this.resetUrl.set('');
      this.successMessage.set('');
      this.errorMessage.set('');
      this.mode.set('reset');
      this.buildForm('reset');
      window.history.replaceState({}, '', parsed.pathname + parsed.search);
    } catch {
      window.location.href = url;
    }
  }

  submit() {
    if (this.form.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    switch (this.mode()) {
      case 'login':
        this.login();
        break;
      case 'register':
        this.register();
        break;
      case 'forgot':
        this.forgotPassword();
        break;
      case 'reset':
        this.resetPassword();
        break;
    }
  }

  private login() {
    const identifier = (this.form.get('identifier')?.value || '').trim();
    const password = this.form.get('password')?.value;
    const isEmail = identifier.includes('@');

    this.authService.login(isEmail ? null : identifier, isEmail ? identifier : null, password)
      .pipe(take(1))
      .subscribe({
        next: (resp) => {
          this.isLoading.set(false);
          if (resp?.status === 'success' && resp.user) {
            this.userLoggedIn.emit();
          } else {
            this.errorMessage.set(resp?.message || 'Login failed. Please try again.');
          }
        },
        error: (error) => {
          this.isLoading.set(false);
          this.errorMessage.set(error?.error?.message || 'Login failed. Please check your credentials.');
        }
      });
  }

  private register() {
    const email = (this.form.get('email')?.value || '').trim();
    const username = (this.form.get('username')?.value || '').trim();
    const password = this.form.get('password')?.value;

    this.authService.register(email, username, password)
      .pipe(take(1))
      .subscribe({
        next: (resp) => {
          this.isLoading.set(false);
          if (resp?.status === 'success' && resp.user) {
            this.userLoggedIn.emit();
          } else {
            this.errorMessage.set(resp?.message || 'Registration failed. Please try again.');
          }
        },
        error: (error) => {
          this.isLoading.set(false);
          this.errorMessage.set(error?.error?.message || 'Registration failed. Please try again.');
        }
      });
  }

  private forgotPassword() {
    const email = (this.form.get('email')?.value || '').trim();

    this.authService.forgotPassword(email)
      .pipe(take(1))
      .subscribe({
        next: (resp) => {
          this.isLoading.set(false);
          if (resp?.status === 'success') {
            this.successMessage.set(resp.message || 'If an account exists for that email, password reset instructions have been sent.');
            this.resetUrl.set(resp.resetUrl || '');
          } else {
            this.errorMessage.set(resp?.message || 'Could not send reset instructions. Please try again.');
          }
        },
        error: (error) => {
          this.isLoading.set(false);
          this.errorMessage.set(error?.error?.message || 'Could not send reset instructions. Please try again.');
        }
      });
  }

  private resetPassword() {
    const password = this.form.get('password')?.value;
    if (!this.resetToken) {
      this.isLoading.set(false);
      this.errorMessage.set('Invalid or expired reset link. Request a new one.');
      return;
    }

    this.authService.resetPassword(this.resetToken, password)
      .pipe(take(1))
      .subscribe({
        next: (resp) => {
          this.isLoading.set(false);
          if (resp?.status === 'success') {
            this.clearResetTokenFromUrl();
            this.resetToken = '';
            this.successMessage.set(resp.message || 'Password updated. You can log in with your new password.');
            this.mode.set('login');
            this.buildForm('login');
          } else {
            this.errorMessage.set(resp?.message || 'Could not reset password. Please try again.');
          }
        },
        error: (error) => {
          this.isLoading.set(false);
          this.errorMessage.set(error?.error?.message || 'Invalid or expired reset link. Request a new one.');
        }
      });
  }

  private buildForm(mode: AuthMode) {
    if (mode === 'login') {
      this.form = this.fb.group({
        identifier: ['', [Validators.required]],
        password: ['', [Validators.required, Validators.minLength(6)]]
      });
      return;
    }

    if (mode === 'forgot') {
      this.form = this.fb.group({
        email: ['', [Validators.required, Validators.email]]
      });
      return;
    }

    if (mode === 'reset') {
      this.form = this.fb.group({
        password: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', [Validators.required]]
      }, { validators: this.passwordsMatch });
      return;
    }

    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      username: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(32), Validators.pattern(/^[a-zA-Z0-9._-]+$/)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordsMatch });
  }

  private passwordsMatch(group: AbstractControl): ValidationErrors | null {
    const password = group.get('password')?.value;
    const confirm = group.get('confirmPassword')?.value;
    return password && confirm && password !== confirm ? { passwordsMismatch: true } : null;
  }

  private markFormGroupTouched() {
    Object.keys(this.form.controls).forEach((key) => {
      this.form.get(key)?.markAsTouched();
    });
  }

  private clearResetTokenFromUrl() {
    const url = new URL(window.location.href);
    if (!url.searchParams.has('resetToken')) {
      return;
    }
    url.searchParams.delete('resetToken');
    const next = url.pathname + (url.searchParams.toString() ? `?${url.searchParams.toString()}` : '') + url.hash;
    window.history.replaceState({}, '', next);
  }

  fieldError(controlName: string): string {
    const control = this.form.get(controlName);
    if (!control?.touched) {
      return '';
    }
    if (control.hasError('required')) {
      return 'Required';
    }
    if (control.hasError('email')) {
      return 'Enter a valid email';
    }
    if (control.hasError('minlength')) {
      const min = control.getError('minlength')?.requiredLength;
      return `Must be at least ${min} characters`;
    }
    if (control.hasError('maxlength')) {
      return 'Too long';
    }
    if (control.hasError('pattern')) {
      return 'Letters, numbers, . _ - only';
    }
    return '';
  }

  get confirmPasswordError(): string {
    if (this.form.hasError('passwordsMismatch') && this.form.get('confirmPassword')?.touched) {
      return 'Passwords do not match';
    }
    return this.fieldError('confirmPassword');
  }

  get heading(): string {
    switch (this.mode()) {
      case 'register':
        return 'Create an account';
      case 'forgot':
        return 'Forgot your password?';
      case 'reset':
        return 'Choose a new password';
      default:
        return 'Welcome back!';
    }
  }

  get subheading(): string {
    switch (this.mode()) {
      case 'register':
        return 'Join Angcord and start chatting.';
      case 'forgot':
        return "Enter your account email and we'll send reset instructions.";
      case 'reset':
        return 'Enter a new password for your account.';
      default:
        return "We're so excited to see you again!";
    }
  }

  get submitLabel(): string {
    switch (this.mode()) {
      case 'register':
        return 'Register';
      case 'forgot':
        return 'Send reset link';
      case 'reset':
        return 'Update password';
      default:
        return 'Login';
    }
  }

  get loadingLabel(): string {
    switch (this.mode()) {
      case 'register':
        return 'Creating account...';
      case 'forgot':
        return 'Sending...';
      case 'reset':
        return 'Updating...';
      default:
        return 'Logging in...';
    }
  }
}
