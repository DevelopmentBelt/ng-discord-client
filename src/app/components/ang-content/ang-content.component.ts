import {ChangeDetectionStrategy, Component, OnInit, signal, WritableSignal} from '@angular/core';
import {SidebarServer} from "../../models/sidebar-server/sidebar-server";
import {AngcordContentComponent} from "./angcord-content/angcord-content.component";
import {MemberSidebarComponent} from "./member-sidebar/member-sidebar.component";
import {ChannelSidebarComponent} from "./channel-sidebar/channel-sidebar.component";

@Component({
  selector: 'ang-content',
  templateUrl: './ang-content.component.html',
  styleUrls: ['./ang-content.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AngcordContentComponent,
    MemberSidebarComponent,
    ChannelSidebarComponent
  ],
  standalone: true
})
export class AngContentComponent implements OnInit {
  selectedServer: WritableSignal<SidebarServer> = signal(null);

  constructor() {}

  ngOnInit(): void {}

  handleServerChange(server: SidebarServer) {
    this.selectedServer.set(server);
  }

}
