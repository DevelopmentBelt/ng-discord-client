import {Component, Input, OnInit} from '@angular/core';
import {SidebarServer} from "../../models/sidebar-server/sidebar-server";

@Component({
  selector: 'sidebar-server',
  templateUrl: './sidebar-server.component.html',
  styleUrls: ['./sidebar-server.component.scss']
})
export class SidebarServerComponent implements OnInit {

  @Input() private server: SidebarServer = {} as SidebarServer;

  public serverIconURL: string = "";

  constructor() {}

  ngOnInit(): void {
    this.serverIconURL = this.server.iconURL;
  }

}
