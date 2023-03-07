import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DefaultViewComponent } from './default-view/default-view.component';
import {ComponentsModule} from "../components/components.module";



@NgModule({
  declarations: [
    DefaultViewComponent
  ],
    imports: [
        CommonModule,
        ComponentsModule
    ],
  exports: [
    DefaultViewComponent
  ]
})
export class ViewsModule {}
