import { Injectable } from '@angular/core';
import {LoginRequest, LoginResponse, RegisterRequest, RegisterResponse} from "../../models/user/auth";
import {ServerConnectivityService} from "../server-connectivity.service";
import {Observable} from "rxjs";

@Injectable({
  providedIn: 'root'
})
export class UserWebService {
  private readonly API_URL = 'users';
  constructor(private serverConnectivityService: ServerConnectivityService) {}

  public register(email: string, userName: string, password: string): Observable<RegisterResponse> {
    const registerRequest: RegisterRequest = {
      email: email,
      password: password,
      username: userName
    };
    return this.serverConnectivityService.sendPostReq(`${this.API_URL}/register`, registerRequest, {});
  }
  public login(userName: string, email: string, password: string): Observable<LoginResponse> {
    const loginRequest: LoginRequest = {
      username: userName,
      email: email,
      password: password
    };
    return this.serverConnectivityService.sendPostReq(`${this.API_URL}/login`, loginRequest, {});
  }
}
