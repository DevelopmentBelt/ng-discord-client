import { Injectable } from '@angular/core';
import {LoginResponse, RegisterResponse} from "../../models/user/auth";
import {ServerConnectivityService} from "../server-connectivity.service";

@Injectable({
  providedIn: 'root'
})
export class UserWebService {
  constructor(serverConnectivityService: ServerConnectivityService) {}

  public register(email: string, user_name: string, password: string): Promise<RegisterResponse> {
    return new Promise<RegisterResponse>(() => {});
  }
  public login(user_name: string, password: string): Promise<LoginResponse> {
    return new Promise<LoginResponse>(() => {});
  }
}
