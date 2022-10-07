import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DefaultViewComponent } from './default-view/default-view.component';



@NgModule({
  declarations: [
    DefaultViewComponent
  ],
  imports: [
    CommonModule
  ],
  exports: [
    DefaultViewComponent
  ]
})
export class ViewsModule {}
