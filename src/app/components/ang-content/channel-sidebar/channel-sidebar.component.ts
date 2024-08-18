import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  input,
  InputSignal,
  OnInit,
  Output, signal,
  WritableSignal
} from '@angular/core';
import {SidebarServer} from "../../../models/sidebar-server/sidebar-server";
import {SidebarComponent} from "../../sidebar/sidebar.component";
import {SidebarServerComponent} from "../../sidebar-server/sidebar-server.component";
import {Category} from "../../../models/channel/category";
import {Channel} from "../../../models/channel/channel";

@Component({
  selector: 'channel-sidebar',
  templateUrl: './channel-sidebar.component.html',
  styleUrls: ['./channel-sidebar.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    SidebarComponent,
    SidebarServerComponent
  ],
  standalone: true
})
export class ChannelSidebarComponent implements OnInit {
  @Output() public selectedServerChange: EventEmitter<SidebarServer> = new EventEmitter<SidebarServer>();
  selectedChannel: WritableSignal<number> = signal(null);

  categories: InputSignal<Category[]> = input([
    {
      categoryName: "Information",
      categoryId: 1,
      channels: [
        {
          channelId: 1,
          channelName: 'General'
        } as Channel
      ]
    } as Category,
  ]);

  constructor() { }

  ngOnInit(): void {
  }

}
