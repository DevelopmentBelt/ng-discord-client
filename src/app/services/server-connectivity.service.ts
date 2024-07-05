import { Injectable } from '@angular/core';
import { HttpClient } from "@angular/common/http";
import {Observable} from "rxjs";

@Injectable({
  providedIn: 'root'
})
export class ServerConnectivityService {
  private BASE_URL: string = 'localhost:4200/';
  constructor(private httpClient: HttpClient) {}

  public sendPostReq(path: string, body: any, options: any): Observable<any> {
    return this.httpClient.post(this.BASE_URL + path, body, options);
  }
  public sendPutReq(path: string, body: any, options: any): Observable<any> {
    return this.httpClient.put(this.BASE_URL + path, body, options);
  }
  public sendPatchReq(path: string, body: any, options: any): Observable<any> {
    return this.httpClient.patch(this.BASE_URL + path, body, options);
  }
  public sendDeleteRequest(path: string, options: any): Observable<any> {
    return this.httpClient.delete(this.BASE_URL + path, options);
  }
  public sendGetRequest(path: string, options: any): Observable<any> {
    return this.httpClient.get(this.BASE_URL + path, options);
  }
}
