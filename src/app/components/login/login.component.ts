import {Component, OnInit, output, OutputEmitterRef} from '@angular/core';
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
  constructor(
    private fb: FormBuilder,
    private userService: UserWebService
  ) {}
  ngOnInit() {
    this.form = this.fb.group({
      email: ["" as string, [Validators.required, Validators.email]],
      password: ["" as string, [Validators.required, Validators.maxLength(8)]]
    });
  }

  login() {
    if (this.form.valid) {
      // It's valid, log them in...
      this.userService.login(null, this.form.get('email').value, this.form.get('password').value)
        .pipe(take(1)).subscribe((resp) => {
        // Handle the login response...
        this.userLoggedIn.emit();
      });
    }
  }
}
