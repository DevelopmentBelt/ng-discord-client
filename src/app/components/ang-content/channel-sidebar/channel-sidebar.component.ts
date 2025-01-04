import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  input,
  InputSignal,
  OnInit, output,
  Output, OutputEmitterRef, signal,
  WritableSignal
} from '@angular/core';
import {SidebarComponent} from "../../sidebar/sidebar.component";
import {SidebarServerComponent} from "../../sidebar-server/sidebar-server.component";
import {Category} from "../../../models/channel/category";
import {Channel} from "../../../models/channel/channel";
import {NgClass} from "@angular/common";
import {Server} from "../../../models/server/server";

@Component({
  selector: 'channel-sidebar',
  templateUrl: './channel-sidebar.component.html',
  styleUrls: ['./channel-sidebar.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    SidebarComponent,
    SidebarServerComponent,
    NgClass
  ],
  standalone: true
})
export class ChannelSidebarComponent implements OnInit {
  selectedServerChange: OutputEmitterRef<Server> = output();
  selectedChannelChange: OutputEmitterRef<Channel> = output();

  selectedChannel: WritableSignal<Channel> = signal(null);

  servers: InputSignal<Server[]> = input([]);
  categories: InputSignal<Category[]> = input([
    {
      categoryName: "Information",
      categoryId: 1,
      channels: [
        {
          channelId: 1,
          channelName: 'General'
        } as Channel,
        {
          channelId: 2,
          channelName: 'My Computer Specs'
        } as Channel,
        {
          channelId: 3,
          channelName: 'School shit'
        } as Channel,
        {
          channelId: 4,
          channelName: 'Car parts'
        } as Channel
      ]
    } as Category,
  ]);

  constructor() {}

  ngOnInit(): void {
    this.handleChannelSelect(this.categories()[0].channels[0]); // Choose first channel
  }

  handleChannelSelect(chan: Channel) {
    this.selectedChannel.set(chan);
    this.selectedChannelChange.emit(chan);
  }

}
