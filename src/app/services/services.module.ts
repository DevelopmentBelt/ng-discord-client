import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import {MessageWebService} from "./message-web-service/message-web.service";
import {AlertService} from "./alert-service/alert.service";
import {ServerConnectivityService} from "./server-connectivity.service";



@NgModule({
  declarations: [],
  imports: [
    CommonModule
  ],
  exports: [],
  providers: [
    ServerConnectivityService,
    MessageWebService,
    AlertService
  ]
})
export class ServicesModule {}
