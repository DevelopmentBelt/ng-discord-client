import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import {WebService} from "./web-service/web.service";
import {AlertService} from "./alert-service/alert.service";



@NgModule({
  declarations: [],
  imports: [
    CommonModule
  ],
  exports: [],
  providers: [
    WebService,
    AlertService
  ]
})
export class ServicesModule {}
