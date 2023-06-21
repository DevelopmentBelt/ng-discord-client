import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from './sidebar/sidebar.component';
import { SidebarServerComponent } from './sidebar-server/sidebar-server.component';
import { AngContentComponent } from './ang-content/ang-content.component';
import { ChannelSidebarComponent } from './ang-content/channel-sidebar/channel-sidebar.component';
import { AngcordContentComponent } from './ang-content/angcord-content/angcord-content.component';
import { MemberSidebarComponent } from './ang-content/member-sidebar/member-sidebar.component';
import {AppModule} from "../app.module";
import {PipesModule} from "../pipes/pipes.module";



@NgModule({
  declarations: [
    SidebarComponent,
    SidebarServerComponent,
    AngContentComponent,
    ChannelSidebarComponent,
    AngcordContentComponent,
    MemberSidebarComponent
  ],
  imports: [
    CommonModule,
    PipesModule
  ],
  exports: [
    SidebarComponent,
    SidebarServerComponent,
    AngcordContentComponent,
    AngContentComponent
  ]
})
export class ComponentsModule { }
