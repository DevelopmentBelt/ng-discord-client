import { Component, OnInit, output, OutputEmitterRef, signal, WritableSignal } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { take } from 'rxjs';
import { AuthService } from '../../services/auth-service/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './login.component.html'
})
export class LoginComponent implements OnInit {
  userLoggedIn: OutputEmitterRef<void> = output();

  mode: WritableSignal<'login' | 'register'> = signal('login');
  form: FormGroup;
  isLoading: WritableSignal<boolean> = signal(false);
  errorMessage: WritableSignal<string> = signal('');

  constructor(
    private fb: FormBuilder,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.buildForm('login');
  }

  switchMode(mode: 'login' | 'register') {
    this.mode.set(mode);
    this.errorMessage.set('');
    this.buildForm(mode);
  }

  submit() {
    if (this.form.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    if (this.mode() === 'login') {
      this.login();
    } else {
      this.register();
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

  private buildForm(mode: 'login' | 'register') {
    if (mode === 'login') {
      this.form = this.fb.group({
        identifier: ['', [Validators.required]],
        password: ['', [Validators.required, Validators.minLength(6)]]
      });
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
}
