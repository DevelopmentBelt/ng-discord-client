import {ChangeDetectionStrategy, Component, Input, OnInit} from '@angular/core';
import {Server} from "../../models/server/server";

@Component({
  selector: 'sidebar-server',
  templateUrl: './sidebar-server.component.html',

  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true
})
export class SidebarServerComponent implements OnInit {

  @Input() server: Server = {} as Server;

  public serverIconURL: string = "";
  public serverDesc: string = "";

  constructor() {}

  ngOnInit(): void {
    this.serverIconURL = this.server.iconURL;
    this.serverDesc = this.server.serverDescription;
  }

}
