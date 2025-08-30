import {Component, OnInit, output, OutputEmitterRef, signal, WritableSignal} from '@angular/core';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from "@angular/forms";
import {UserWebService} from "../../services/user-web-service/user-web.service";
import {take} from "rxjs";

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent implements OnInit {
  userLoggedIn: OutputEmitterRef<void> = output();

  form: FormGroup;
  isLoading: WritableSignal<boolean> = signal(false);
  errorMessage: WritableSignal<string> = signal('');

  constructor(
    private fb: FormBuilder,
    private userService: UserWebService
  ) {}

  ngOnInit() {
    this.form = this.fb.group({
      identifier: ["" as string, [Validators.required]],
      password: ["" as string, [Validators.required, Validators.maxLength(8)]]
    });
  }

  login() {
    if (this.form.valid) {
      this.isLoading.set(true);
      this.errorMessage.set('');

      // It's valid, log them in...
      const identifier = this.form.get('identifier')?.value;
      const password = this.form.get('password')?.value;

      // Determine if identifier is email or username
      const isEmail = identifier.includes('@');
      const email = isEmail ? identifier : null;
      const username = isEmail ? null : identifier;

      this.userService.login(username, email, password)
        .pipe(take(1)).subscribe({
          next: (resp: any) => {
            this.isLoading.set(false);
            if (resp && resp.status === 'success') {
              this.userLoggedIn.emit();
            } else {
              this.errorMessage.set(resp?.message || 'Login failed. Please try again.');
            }
          },
          error: (error) => {
            this.isLoading.set(false);
            console.error('Login error:', error);
            this.errorMessage.set('Network error. Please check your connection and try again.');
          }
        });
    } else {
      this.markFormGroupTouched();
    }
  }

  private markFormGroupTouched() {
    Object.keys(this.form.controls).forEach(key => {
      const control = this.form.get(key);
      control?.markAsTouched();
    });
  }

  get identifierError(): string {
    const control = this.form.get('identifier');
    if (control?.hasError('required') && control?.touched) {
      return 'Email or username is required';
    }
    return '';
  }

  get passwordError(): string {
    const control = this.form.get('password');
    if (control?.hasError('required') && control?.touched) {
      return 'Password is required';
    }
    if (control?.hasError('maxlength') && control?.touched) {
      return 'Password cannot exceed 8 characters';
    }
    return '';
  }
}
