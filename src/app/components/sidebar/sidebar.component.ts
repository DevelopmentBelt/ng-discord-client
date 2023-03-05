import { Component, OnInit } from '@angular/core';
import {SidebarServer} from "../../models/sidebar-server/sidebar-server";

@Component({
  selector: 'sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent implements OnInit {

  public sidebarServers: SidebarServer[] = [];

  constructor() {}

  ngOnInit(): void {}

}
