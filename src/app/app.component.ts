import {Component, OnInit, signal, WritableSignal} from '@angular/core';
import {UserWebService} from "./services/user-web-service/user-web.service";
import {LoginResponse, RegisterResponse} from "./models/user/auth";
import {DefaultViewComponent} from "./views/default-view/default-view.component";
import {CommonModule} from "@angular/common";
import {LoginComponent} from "./components/login/login.component";

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
  isLoggedIn: WritableSignal<boolean> = signal(true); // TODO Set to false

  constructor(private userWebService: UserWebService) {}
  public ngOnInit(): void {}

  handleLoggedIn() {
    this.isLoggedIn.set(true);
  }
}
