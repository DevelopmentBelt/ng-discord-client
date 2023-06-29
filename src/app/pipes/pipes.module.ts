import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import {DatetimeFormatterPipe} from "./datetimeFormatter/datetime-formatter.pipe";



@NgModule({
  declarations: [
    DatetimeFormatterPipe
  ],
  imports: [
    CommonModule
  ],
  exports: [
    DatetimeFormatterPipe
  ]
})
export class PipesModule {}
