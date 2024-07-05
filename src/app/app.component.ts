import {Component, OnInit} from '@angular/core';
import {UserWebService} from "./services/user-web-service/user-web.service";
import {LoginResponse, RegisterResponse} from "./models/user/auth";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  public isLoggedIn: boolean = true;

  constructor(private userWebService: UserWebService) {}
  public ngOnInit(): void {}
  public async login(user_name: string, password: string, email?: string): Promise<LoginResponse> {
    return await this.userWebService.login(user_name, email, password);
  }
  public async register(email: string, user_name: string, password: string): Promise<RegisterResponse> {
    return await this.userWebService.register(email, user_name, password);
  }
}
