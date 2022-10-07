import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from './sidebar/sidebar.component';
import { SidebarServerComponent } from './sidebar-server/sidebar-server.component';



@NgModule({
  declarations: [
    SidebarComponent,
    SidebarServerComponent
  ],
  imports: [
    CommonModule
  ]
})
export class ComponentsModule { }
