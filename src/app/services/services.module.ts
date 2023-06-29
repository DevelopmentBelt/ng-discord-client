import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import {MessageWebService} from "./message-web-service/message-web.service";
import {AlertService} from "./alert-service/alert.service";



@NgModule({
  declarations: [],
  imports: [
    CommonModule
  ],
  exports: [],
  providers: [
    MessageWebService,
    AlertService
  ]
})
export class ServicesModule {}
