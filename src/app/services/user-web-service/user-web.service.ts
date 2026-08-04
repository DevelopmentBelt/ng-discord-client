import { Injectable } from '@angular/core';
import { AuthResponse, LoginRequest, RegisterRequest } from '../../models/user/auth';
import { ServerConnectivityService } from '../server-connectivity.service';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UserWebService {
  private readonly API_URL = 'users';

  constructor(private serverConnectivityService: ServerConnectivityService) {}

  public register(email: string, userName: string, password: string): Observable<AuthResponse> {
    const registerRequest: RegisterRequest = {
      email,
      password,
      username: userName
    };
    return this.serverConnectivityService.sendPostReq(`${this.API_URL}/register`, registerRequest, {});
  }

  public login(userName: string | null, email: string | null, password: string): Observable<AuthResponse> {
    const loginRequest: LoginRequest = {
      username: userName,
      email,
      password
    };
    return this.serverConnectivityService.sendPostReq(`${this.API_URL}/login`, loginRequest, {});
  }

  public logout(): Observable<AuthResponse> {
    return this.serverConnectivityService.sendPostReq(`${this.API_URL}/logout`, {}, {});
  }

  public me(): Observable<AuthResponse> {
    return this.serverConnectivityService.sendGetRequest(`${this.API_URL}/me`, {});
  }
}
