import { Injectable } from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {LoginResponse, RegisterResponse} from "../../models/user/auth";

@Injectable({
  providedIn: 'root'
})
export class UserWebService {
  constructor(private httpClient: HttpClient) {}

  public register(email: string, user_name: string, password: string): Promise<RegisterResponse> {}
  public login(user_name: string, password: string): Promise<LoginResponse> {}
}
