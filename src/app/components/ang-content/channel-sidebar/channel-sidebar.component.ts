import {ChangeDetectionStrategy, Component, EventEmitter, OnInit, Output} from '@angular/core';
import {SidebarServer} from "../../../models/sidebar-server/sidebar-server";

@Component({
  selector: 'channel-sidebar',
  templateUrl: './channel-sidebar.component.html',
  styleUrls: ['./channel-sidebar.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChannelSidebarComponent implements OnInit {
  @Output() public selectedServerChange: EventEmitter<SidebarServer> = new EventEmitter<SidebarServer>();

  constructor() { }

  ngOnInit(): void {
  }

}
